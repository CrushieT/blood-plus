package com.hospital.blood_plus.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.blood_plus.dto.response.BloodRequestOcrFieldsDTO;
import com.hospital.blood_plus.dto.response.BloodRequestOcrResponseDTO;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class BloodRequestOcrService {
    private static final long MAX_FILE_BYTES = 5L * 1024 * 1024;
    private static final long OCR_SPACE_SOFT_LIMIT_BYTES = 1024L * 1024L;
    private static final int OCR_MAX_IMAGE_WIDTH = 1800;
    private static final int PRIMARY_OCR_ENGINE = 2;
    private static final List<Integer> FALLBACK_OCR_ENGINES = List.of(1);
    private static final int MIN_CONFIDENCE_BEFORE_FALLBACK = 60;
    private static final Set<String> ACCEPTED_FILE_TYPES = new LinkedHashSet<>(Arrays.asList(
            "application/pdf",
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/bmp",
            "image/tiff",
            "image/jfif"
    ));

    private static final Pattern DATE_NUMERIC_PATTERN = Pattern.compile("\\b([0-3OI]?[0-9])[\\-/]([01OI]?[0-9])[\\-/]([12][0-9]{3}|[0-9]{2})\\b");
    private static final Pattern MOBILE_PATTERN = Pattern.compile("(?:\\+?63|0)?9\\d{9}");
    private static final Pattern ABO_PATTERN = Pattern.compile("\\b(AB|A|B|O|0)\\b");
    private static final Pattern RH_PATTERN = Pattern.compile("\\bRH\\s*[:\\-]?\\s*(POSITIVE|NEGATIVE|POS|NEG|\\+|-)\\b");
    private static final Pattern CHECKED_CODE_PATTERN = Pattern.compile("\\b(PW-\\d|PR-\\d|PP-\\d|PF-\\d|PC-\\d|PWR|R-\\d|W-\\d|P-\\d|F-\\d|C-\\d)\\b");
    private static final Pattern CHECKED_CODE_MERGED_PATTERN = Pattern.compile("(?:\\(|\\[)?[XxYyVvGg/]\\s*(PW-\\d|PR-\\d|PP-\\d|PF-\\d|PC-\\d|PWR|R-\\d|W-\\d|P-\\d|F-\\d|C-\\d)");

    private static final List<String> REQUEST_FIELD_KEYS = Arrays.asList(
            "patientName", "patientMiddle", "patientLast", "birthdate", "sex",
            "barangay", "municipality", "province", "physician", "room",
            "diagnosis", "contact", "bloodType", "hemoglobin", "hematocrit",
            "requestType", "units", "componentType"
    );

    private static final Map<String, String> COMPONENT_MAP = buildComponentMap();

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ocr.space.api.key:}")
    private String ocrApiKey;

    @Value("${ocr.space.api.url:https://api.ocr.space/parse/image}")
    private String ocrApiUrl;

    public BloodRequestOcrResponseDTO scanRequestForm(MultipartFile file) {
        validateFile(file);
        if (ocrApiKey == null || ocrApiKey.isBlank()) {
            throw new IllegalStateException("OCR service is not configured. Missing OCR_SPACE_API_KEY.");
        }

        OcrAttempt best = null;
        List<String> engineErrors = new ArrayList<>();
        boolean runFallback = false;

        try {
            OcrAttempt primaryAttempt = runOcrAttempt(file, PRIMARY_OCR_ENGINE);
            best = primaryAttempt;
            runFallback = shouldTryFallback(primaryAttempt);
        } catch (IllegalArgumentException ex) {
            engineErrors.add("Engine " + PRIMARY_OCR_ENGINE + ": " + ex.getMessage());
            runFallback = true;
        } catch (RuntimeException ex) {
            engineErrors.add("Engine " + PRIMARY_OCR_ENGINE + ": OCR request failed.");
            runFallback = true;
        }

        if (runFallback) {
            for (Integer engine : FALLBACK_OCR_ENGINES) {
                try {
                    OcrAttempt attempt = runOcrAttempt(file, engine);
                    if (best == null || attempt.score > best.score) {
                        best = attempt;
                    }
                } catch (IllegalArgumentException ex) {
                    engineErrors.add("Engine " + engine + ": " + ex.getMessage());
                } catch (RuntimeException ex) {
                    engineErrors.add("Engine " + engine + ": OCR request failed.");
                }
            }
        }

        if (best == null) {
            String bestError = engineErrors.stream()
                    .map(String::trim)
                    .map(msg -> msg.replaceFirst("^Engine\\s+\\d+\\s*:\\s*", ""))
                    .filter(msg -> !msg.isBlank())
                    .filter(msg -> !"OCR request failed.".equalsIgnoreCase(msg))
                    .findFirst()
                    .orElse("Unable to scan the form. Please try a clearer image or fill the form manually.");
            throw new IllegalArgumentException(bestError);
        }

        if (countRecognizedFields(best.fields) < 2) {
            throw new IllegalArgumentException("No recognizable blood request fields detected. Please try a clearer image.");
        }

        List<String> warnings = new ArrayList<>(best.warnings);
        if (best.confidence < 60) {
            warnings.add("OCR confidence is low. Please verify all extracted values before submitting.");
        }
        if (hasMissingCriticalFields(best.fields)) {
            warnings.add("Some fields could not be detected. Please review before submitting.");
        }

        BloodRequestOcrResponseDTO response = new BloodRequestOcrResponseDTO();
        response.setSuccess(true);
        response.setConfidence(best.confidence);
        response.setRawText(best.rawText);
        response.setFields(best.fields);
        response.setWarnings(uniqueList(warnings));
        return response;
    }

    private OcrAttempt runOcrAttempt(MultipartFile file, int engine) {
        JsonNode root = requestOcrSpace(file, engine);

        boolean errored = root.path("IsErroredOnProcessing").asBoolean(false);
        if (errored) {
            String err = readOcrError(root);
            throw new IllegalArgumentException(err.isBlank() ? "OCR.space processing error." : err);
        }

        JsonNode parsedResults = root.path("ParsedResults");
        if (!parsedResults.isArray() || parsedResults.isEmpty()) {
            throw new IllegalArgumentException("OCR returned no parsed text.");
        }

        StringBuilder textBuilder = new StringBuilder();
        for (JsonNode node : parsedResults) {
            String text = node.path("ParsedText").asText("");
            if (text != null && !text.isBlank()) {
                if (!textBuilder.isEmpty()) textBuilder.append('\n');
                textBuilder.append(text);
            }
        }

        String rawText = textBuilder.toString().trim();
        if (rawText.isBlank()) {
            throw new IllegalArgumentException("OCR returned no readable text.");
        }

        List<String> warnings = new ArrayList<>();
        BloodRequestOcrFieldsDTO fields = parseFields(rawText, warnings);
        int confidence = estimateConfidence(fields);
        int score = buildAttemptScore(fields, confidence);

        return new OcrAttempt(rawText, fields, confidence, warnings, score);
    }

    private boolean shouldTryFallback(OcrAttempt attempt) {
        if (attempt == null) return true;
        if (countRecognizedFields(attempt.fields) < 2) return true;
        return attempt.confidence < MIN_CONFIDENCE_BEFORE_FALLBACK;
    }

    private JsonNode requestOcrSpace(MultipartFile file, int engine) {
        try {
            PreparedUpload upload = prepareUpload(file);
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("apikey", ocrApiKey);
            body.add("language", "eng");
            body.add("isTable", "true");
            body.add("scale", "true");
            body.add("detectOrientation", "true");
            body.add("OCREngine", String.valueOf(engine));
            body.add("file", asResource(upload));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(ocrApiUrl, entity, String.class);
            String payload = response.getBody();
            if (payload == null || payload.isBlank()) {
                throw new IllegalArgumentException("OCR service returned an empty response.");
            }
            return objectMapper.readTree(payload);
        } catch (RestClientException ex) {
            throw new IllegalArgumentException("OCR service request failed.");
        } catch (IOException ex) {
            throw new IllegalArgumentException("Failed to process OCR response.");
        }
    }

    private ByteArrayResource asResource(PreparedUpload upload) {
        String filename = sanitizeFileName(upload.filename);
        byte[] bytes = upload.bytes;
        return new ByteArrayResource(bytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
    }

    private PreparedUpload prepareUpload(MultipartFile file) throws IOException {
        byte[] originalBytes = file.getBytes();
        String resolvedType = resolveContentType(file);
        String filename = sanitizeFileName(file.getOriginalFilename());

        if (resolvedType.startsWith("image/") && originalBytes.length > OCR_SPACE_SOFT_LIMIT_BYTES) {
            byte[] optimized = optimizeImageBytes(originalBytes);
            if (optimized != null && optimized.length > 0) {
                return new PreparedUpload(forceJpgExtension(filename), optimized);
            }
        }
        return new PreparedUpload(filename, originalBytes);
    }

    private byte[] optimizeImageBytes(byte[] originalBytes) {
        try {
            BufferedImage src = ImageIO.read(new ByteArrayInputStream(originalBytes));
            if (src == null) return originalBytes;

            BufferedImage working = toRgb(src);
            if (working.getWidth() > OCR_MAX_IMAGE_WIDTH) {
                working = resizeByWidth(working, OCR_MAX_IMAGE_WIDTH);
            }

            byte[] best = encodeJpeg(working, 0.85f);
            if (best.length <= OCR_SPACE_SOFT_LIMIT_BYTES) {
                return best;
            }

            float[] qualities = new float[] {0.78f, 0.72f, 0.66f, 0.58f, 0.50f, 0.42f};
            for (float quality : qualities) {
                byte[] candidate = encodeJpeg(working, quality);
                if (candidate.length < best.length) {
                    best = candidate;
                }
                if (candidate.length <= OCR_SPACE_SOFT_LIMIT_BYTES) {
                    return candidate;
                }
                int nextWidth = Math.max(1000, (int) Math.round(working.getWidth() * 0.88));
                if (nextWidth < working.getWidth()) {
                    working = resizeByWidth(working, nextWidth);
                }
            }

            return best;
        } catch (Exception ex) {
            return originalBytes;
        }
    }

    private BufferedImage toRgb(BufferedImage src) {
        if (src.getType() == BufferedImage.TYPE_INT_RGB) {
            return src;
        }
        BufferedImage rgb = new BufferedImage(src.getWidth(), src.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D g = rgb.createGraphics();
        g.drawImage(src, 0, 0, null);
        g.dispose();
        return rgb;
    }

    private BufferedImage resizeByWidth(BufferedImage src, int targetWidth) {
        if (src.getWidth() <= targetWidth) return src;
        int targetHeight = Math.max(1, (int) Math.round((double) src.getHeight() * targetWidth / src.getWidth()));
        BufferedImage resized = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = resized.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.drawImage(src, 0, 0, targetWidth, targetHeight, null);
        g.dispose();
        return resized;
    }

    private byte[] encodeJpeg(BufferedImage image, float quality) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        if (param.canWriteCompressed()) {
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(Math.max(0.1f, Math.min(1.0f, quality)));
        }
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
        return baos.toByteArray();
    }

    private BloodRequestOcrFieldsDTO parseFields(String rawText, List<String> warnings) {
        BloodRequestOcrFieldsDTO fields = new BloodRequestOcrFieldsDTO();
        List<String> lines = normalizedLines(rawText);
        String flat = normalizeFlat(rawText);
        String headerRaw = extractHeaderRaw(rawText);
        List<String> headerLines = normalizedLines(headerRaw);
        String headerFlat = normalizeFlat(headerRaw);

        parsePatientNames(fields, headerFlat, headerLines);
        parseBirthdate(fields, headerFlat, headerLines);
        parseSex(fields, headerFlat, headerLines);
        parseAddress(fields, headerFlat, headerLines);
        parseRoomWard(fields, headerFlat, headerLines);
        parseDiagnosis(fields, headerFlat, headerLines);
        parsePhysician(fields, headerFlat, headerLines);
        parseContact(fields, headerFlat, headerLines, warnings);
        parseBloodType(fields, headerFlat, warnings);
        parseHemoglobin(fields, headerFlat);
        parseHematocrit(fields, headerFlat);
        parseRequestType(fields, headerFlat, warnings);
        parsePreviousTransfusion(fields, headerFlat);
        parsePreviousReaction(fields, headerFlat);
        parseUnits(fields, headerFlat, flat);
        parseIndicationsAndComponent(fields, lines, flat, warnings);

        return fields;
    }

    private void parsePatientNames(BloodRequestOcrFieldsDTO fields, String flat, List<String> lines) {
        String last = captureLabelValue(flat,
                "SURNAME",
                Arrays.asList("GIVEN NAME", "MIDDLE NAME", "AGE", "SEX", "PATIENT", "DATE", "ADDRESS"));
        String first = captureLabelValue(flat,
                "GIVEN NAME",
                Arrays.asList("MIDDLE NAME", "AGE", "SEX", "PATIENT", "DATE", "ADDRESS"));
        String middle = captureLabelValue(flat,
                "MIDDLE NAME",
                Arrays.asList("AGE", "SEX", "PATIENT", "DATE", "ADDRESS", "WARD", "ROOM"));

        if (isBlank(last) || isBlank(first) || isBlank(middle)) {
            int headerIdx = indexOfLine(lines, line -> line.contains("PATIENT") || line.contains("SURNAME"));
            if (headerIdx >= 0 && headerIdx + 1 < lines.size()) {
                String candidate = lines.get(headerIdx + 1).replaceAll("[^A-Z'\\- ]", " ").replaceAll("\\s+", " ").trim();
                List<String> tokens = new ArrayList<>(Arrays.asList(candidate.split("\\s+")));
                tokens.removeIf(token -> token.length() < 2 || isPatientHeaderWord(token));
                if (tokens.size() >= 3) {
                    if (isBlank(last)) last = tokens.get(0);
                    if (isBlank(first)) first = tokens.get(1);
                    if (isBlank(middle)) middle = tokens.get(2);
                }
            }
        }

        fields.setPatientLast(toHumanCase(last));
        fields.setPatientName(toHumanCase(first));
        fields.setPatientMiddle(toHumanCase(middle));
    }

    private void parseBirthdate(BloodRequestOcrFieldsDTO fields, String flat, List<String> lines) {
        String raw = captureRegexGroup(flat, "(?:DATE OF BIRTH|DOB)\\s*[:\\-]?\\s*([0-3OI]?[0-9][\\-/][01OI]?[0-9][\\-/][12][0-9]{3}|[0-3OI]?[0-9][\\-/][01OI]?[0-9][\\-/][0-9]{2})", 1);
        if (isBlank(raw)) {
            raw = firstDateInText(flat);
        }
        if (isBlank(raw)) {
            for (String line : lines) {
                raw = firstDateInText(line);
                if (!isBlank(raw)) break;
            }
        }
        fields.setBirthdate(normalizeDateToIso(raw));
    }

    private void parseSex(BloodRequestOcrFieldsDTO fields, String flat, List<String> lines) {
        String sex = captureRegexGroup(flat, "\\bSEX\\s*[:\\-]?\\s*(MALE|FEMALE|M|F)\\b", 1);
        if (isBlank(sex)) {
            String patientRow = findLine(lines, line -> line.contains("MALE") || line.contains("FEMALE"));
            sex = captureRegexGroup(patientRow, "\\b(MALE|FEMALE|M|F)\\b", 1);
        }
        if (isBlank(sex)) {
            String patientValueRow = findLikelyPatientValueLine(lines);
            if (patientValueRow.contains("MAL")) {
                sex = "MALE";
            } else if (patientValueRow.contains("FEM")) {
                sex = "FEMALE";
            }
        }
        if (!isBlank(sex)) {
            String upper = sex.trim().toUpperCase(Locale.ROOT);
            fields.setSex(upper.startsWith("F") ? "FEMALE" : "MALE");
        }
    }

    private void parseAddress(BloodRequestOcrFieldsDTO fields, String flat, List<String> lines) {
        String municipality = captureLabelValue(flat, "MUNICIPALITY", Arrays.asList("PROVINCE", "DATE OF BIRTH", "WARD", "ROOM", "CLINICAL"));
        String province = captureLabelValue(flat, "PROVINCE", Arrays.asList("DATE OF BIRTH", "WARD", "ROOM", "CLINICAL", "ATTENDING"));
        String purokBarangay = captureRegexGroup(flat,
                "(?:NO\\s*/?\\s*STREET\\s*/?\\s*PUROK\\s*/?\\s*BARANGAY|ADDRESS)\\s*[:\\-]?\\s*([A-Z0-9#,'./\\- ]{2,80}?)(?=\\s+MUNICIPALITY|\\s+PROVINCE|\\s+DATE OF BIRTH|\\s+WARD|\\s+ROOM|\\s+CLINICAL|\\s+ATTENDING)",
                1);

        if (isBlank(purokBarangay)) {
            int addrIdx = indexOfLine(lines, line -> line.startsWith("ADDRESS") || line.contains("PUROK") || line.contains("BARANGAY"));
            if (addrIdx >= 0 && addrIdx + 1 < lines.size()) {
                purokBarangay = lines.get(addrIdx + 1);
            }
        }

        String roomFromAddressLine = null;
        String wardFromAddressLine = null;
        if (!isBlank(purokBarangay)) {
            String addressLine = cleanWords(purokBarangay);
            addressLine = stripDates(addressLine).trim();

            Matcher roomMatcher = Pattern.compile("([A-Z]{3,20})\\s*/\\s*([0-9A-Z\\-]{1,8})").matcher(addressLine);
            if (roomMatcher.find()) {
                wardFromAddressLine = roomMatcher.group(1);
                roomFromAddressLine = roomMatcher.group(2);
                addressLine = (addressLine.substring(0, roomMatcher.start()) + " " + addressLine.substring(roomMatcher.end()))
                        .replaceAll("\\s+", " ").trim();
            }

            List<String> tokens = new ArrayList<>(Arrays.asList(addressLine.split("\\s+")));
            tokens.removeIf(String::isBlank);
            if (isBlank(municipality) && tokens.size() >= 2) {
                municipality = tokens.get(tokens.size() - 2);
            }
            if (isBlank(province) && tokens.size() >= 3) {
                province = tokens.get(tokens.size() - 1);
            }
            if (tokens.size() >= 3) {
                tokens = tokens.subList(0, Math.max(1, tokens.size() - 2));
            }
            if (!tokens.isEmpty()) {
                purokBarangay = String.join(" ", tokens);
            }

            if (isBlank(fields.getWard()) && !isBlank(wardFromAddressLine)) {
                fields.setWard(toHumanCase(cleanWords(wardFromAddressLine)));
            }
            if (isBlank(fields.getRoom()) && !isBlank(roomFromAddressLine)) {
                fields.setRoom(toHumanCase(cleanWords(roomFromAddressLine)));
            }
        }

        String purok = "";
        String barangay = "";
        String location = stripDates(cleanWords(purokBarangay));
        if (!isBlank(location)) {
            if (location.contains("/")) {
                String[] parts = location.split("/", 2);
                purok = cleanWords(parts[0]);
                barangay = cleanWords(parts[1]);
            } else {
                barangay = location;
            }
        }

        if (isBlank(municipality)) {
            String muniFallback = captureRegexGroup(flat, "\\b([A-Z]{3,20})\\s*,\\s*CAMARINES\\s+NORTE\\b", 1);
            if (!isBlank(muniFallback)) {
                municipality = muniFallback;
            }
        }
        if (isBlank(province) && flat.contains("CAMARINES NORTE")) {
            province = "CAMARINES NORTE";
        }

        fields.setPurok(toHumanCase(purok));
        fields.setBarangay(toHumanCase(barangay));
        fields.setMunicipality(toHumanCase(municipality));
        fields.setProvince(toHumanCase(province));
    }

    private void parseRoomWard(BloodRequestOcrFieldsDTO fields, String flat, List<String> lines) {
        if (!isBlank(fields.getRoom())) {
            return;
        }
        String wardRoom = captureRegexGroup(flat,
                "WARD\\s*/?\\s*ROOM\\s*[:\\-]?\\s*([A-Z0-9/\\- ]{1,30}?)(?=\\s+CLINICAL|\\s+ATTENDING|\\s+CONTACT|\\s+BLOOD TYPE|\\s+HISTORY|$)",
                1);
        if (isBlank(wardRoom)) {
            String fallbackLine = findLine(lines, line -> line.matches(".*\\b[A-Z]{3,20}\\s*/\\s*[0-9A-Z\\-]{1,8}.*"));
            wardRoom = fallbackLine;
        }
        String ward = "";
        String room = "";
        if (!isBlank(wardRoom)) {
            String cleaned = cleanWords(wardRoom);
            if (cleaned.contains("/")) {
                String[] parts = cleaned.split("/", 2);
                ward = cleanWords(parts[0]);
                room = cleanWords(parts[1]);
            } else {
                room = cleaned;
            }
        }
        fields.setWard(toHumanCase(ward));
        fields.setRoom(toHumanCase(room));
    }

    private void parseDiagnosis(BloodRequestOcrFieldsDTO fields, String flat, List<String> lines) {
        String diagnosis = captureRegexGroup(flat,
                "CLINICAL\\s+IMPRESSION(?:\\s*/\\s*DIAGNOSIS)?\\s*[:\\-]?\\s*([A-Z0-9,.'()\\- /]{3,120}?)(?=\\s+ATTENDING\\s+PHYSICIAN|\\s+CONTACT\\s+NUM|\\s+BLOOD\\s+TYPE|$)",
                1);
        if (isBlank(diagnosis)) {
            int headerIdx = indexOfLine(lines, line -> line.contains("CLINICAL IMPRESSION") && line.contains("ATTENDING PHYSICIAN"));
            if (headerIdx >= 0 && headerIdx + 1 < lines.size()) {
                String valueLine = lines.get(headerIdx + 1);
                String withPhoneRemoved = valueLine.replaceAll("(?:\\+?63|0)?9\\d{9}", " ").replaceAll("\\s+", " ").trim();
                diagnosis = captureRegexGroup(withPhoneRemoved, "^(.*?)(?=\\bDR\\.?\\b|$)", 1);
            }
        }
        if (isBlank(diagnosis)) {
            diagnosis = captureLabelValue(flat, "DIAGNOSIS", Arrays.asList("ATTENDING PHYSICIAN", "CONTACT NUM", "BLOOD TYPE"));
        }
        diagnosis = normalizeWordNumberNoise(cleanWords(diagnosis));
        diagnosis = diagnosis == null ? null : diagnosis.replaceAll("(?i)\\bDR\\.?\\b.*$", "").trim();
        fields.setDiagnosis(toHumanCase(diagnosis));
    }

    private void parsePhysician(BloodRequestOcrFieldsDTO fields, String flat, List<String> lines) {
        String physician = captureRegexGroup(flat,
                "ATTENDING\\s+PHYSICIAN\\s*[:\\-]?\\s*([A-Z0-9,.'\\- ]{3,80}?)(?=\\s+CONTACT\\s+NUM|\\s+BLOOD TYPE|\\s+HEMOGLOBIN|$)",
                1);
        String valueLinePhysician = null;
        int headerIdx = indexOfLine(lines, line -> line.contains("CLINICAL IMPRESSION") && line.contains("ATTENDING PHYSICIAN"));
        if (headerIdx >= 0 && headerIdx + 1 < lines.size()) {
            String valueLine = lines.get(headerIdx + 1);
            String withPhoneRemoved = valueLine.replaceAll("(?:\\+?63|0)?9\\d{9}", " ").replaceAll("\\s+", " ").trim();
            valueLinePhysician = captureRegexGroup(withPhoneRemoved, "(\\bDR\\.?\\s*[A-Z][A-Z .,'\\-]{2,80})", 1);
        }
        if (!isBlank(valueLinePhysician)) {
            physician = valueLinePhysician;
        }
        if (isBlank(physician)) {
            physician = captureLabelValue(flat, "PHYSICIAN", Arrays.asList("CONTACT NUM", "BLOOD TYPE", "HEMOGLOBIN"));
        }
        physician = cleanWords(normalizeWordNumberNoise(physician));
        if (!isBlank(physician)) {
            physician = physician.replaceAll("(?:\\+?63|0)?9\\d{9}", " ").replaceAll("\\s+", " ").trim();
            int drIdx = physician.toUpperCase(Locale.ROOT).indexOf("DR");
            if (drIdx > 0) {
                physician = physician.substring(drIdx).trim();
            }
        }
        fields.setPhysician(toHumanCase(physician));
    }

    private void parseContact(BloodRequestOcrFieldsDTO fields, String flat, List<String> lines, List<String> warnings) {
        String contactRaw = captureRegexGroup(flat, "CONTACT\\s+NUM(?:BER)?\\s*[:\\-]?\\s*([+0-9\\- ]{7,20})", 1);
        if (isBlank(contactRaw)) {
            Matcher phoneMatcher = MOBILE_PATTERN.matcher(flat);
            if (phoneMatcher.find()) {
                contactRaw = phoneMatcher.group();
            }
        }
        if (isBlank(contactRaw)) {
            for (String line : lines) {
                Matcher phoneMatcher = MOBILE_PATTERN.matcher(line);
                if (phoneMatcher.find()) {
                    contactRaw = phoneMatcher.group();
                    break;
                }
            }
        }
        String normalized = normalizePhilippineContact(contactRaw);
        fields.setContact(normalized);
        if (!isBlank(contactRaw) && isBlank(normalized)) {
            warnings.add("Contact number needs review.");
        }
    }

    private void parseBloodType(BloodRequestOcrFieldsDTO fields, String flat, List<String> warnings) {
        String abo = captureRegexGroup(flat, "BLOOD\\s+TYPE\\s*[:\\-]?\\s*(AB|A|B|O|0)", 1);
        if (isBlank(abo)) {
            abo = captureRegexGroup(flat, "\\b(AB|A|B|O|0)\\b\\s+RH\\b", 1);
        }
        if (isBlank(abo)) {
            Matcher aboMatcher = ABO_PATTERN.matcher(flat);
            if (aboMatcher.find()) abo = aboMatcher.group(1);
        }

        String rh = captureRegexGroup(flat, "BLOOD\\s+TYPE\\s*[:\\-]?\\s*(?:AB|A|B|O|0)\\s+RH\\s*[:\\-]?\\s*(POSITIVE|NEGATIVE|POS|NEG|\\+|-)", 1);
        if (isBlank(rh)) {
            Matcher rhMatcher = RH_PATTERN.matcher(flat);
            if (rhMatcher.find()) rh = rhMatcher.group(1);
        }
        if (isBlank(rh)) {
            String rhWindow = captureRegexGroup(flat, "BLOOD\\s+TYPE\\s*[:\\-]?\\s*(?:AB|A|B|O|0)\\s+RH\\s*([A-Z0-9_+\\- ]{0,12})(?:\\s*_?HEMATOCRIT|_HEMATOCRIT)", 1);
            if (!isBlank(rhWindow)) {
                if (rhWindow.contains("+")) {
                    rh = "+";
                } else if (rhWindow.contains("-") || rhWindow.contains("_")) {
                    rh = "-";
                }
            }
        }
        if (isBlank(rh)) {
            String rhLocal = captureRegexGroup(flat, "BLOOD\\s+TYPE\\s*[:\\-]?\\s*(?:AB|A|B|O|0)\\s+RH\\s*([_\\-+])", 1);
            if (!isBlank(rhLocal)) {
                rh = rhLocal;
            }
        }

        if (!isBlank(abo) && !isBlank(rh)) {
            String aboNorm = "0".equals(abo) ? "O" : abo.toUpperCase(Locale.ROOT);
            String rhNorm = rh.toUpperCase(Locale.ROOT);
            String rhTag = (rhNorm.contains("NEG") || "-".equals(rhNorm)) ? "NEG" : "POS";
            fields.setBloodType(aboNorm + "_" + rhTag);
        } else if (!isBlank(abo)) {
            warnings.add("Blood type Rh factor not detected. Please verify blood type.");
        }
    }

    private void parseHemoglobin(BloodRequestOcrFieldsDTO fields, String flat) {
        String hb = captureRegexGroup(flat, "HEMOGLOBIN\\s*[:\\-]?\\s*([0-9OI]{1,3})(?=\\s+HEMATOCRIT|\\s+REQUEST|\\s+HISTORY|\\s+BLOOD\\s+TYPE|$)", 1);
        if (isBlank(hb)) {
            hb = captureRegexGroup(flat, "BLOOD\\s+TYPE\\s*[:\\-]?.{0,60}?HEMOGLOBIN\\s*[:\\-]?\\s*([0-9OI]{1,3})", 1);
        }
        if (!isBlank(hb)) {
            hb = hb.replace('O', '0').replace('I', '1').replaceAll("\\D", "");
            if (hb.length() > 3) hb = hb.substring(0, 3);
            fields.setHemoglobin(isBlank(hb) ? null : hb);
        }
    }

    private void parseHematocrit(BloodRequestOcrFieldsDTO fields, String flat) {
        String hct = captureRegexGroup(flat, "HEMATOCRIT\\s*[:\\-]?\\s*([0-9OI]{1,2}|0\\.[0-9]{1,4}|\\.[0-9]{1,4})", 1);
        if (isBlank(hct)) return;

        String value = hct.replace('O', '0').replace('I', '1').trim();
        if (value.startsWith("0.")) {
            value = "." + value.substring(2);
        } else if (!value.startsWith(".")) {
            value = value.replaceAll("\\D", "");
            if (!value.isBlank()) {
                if (value.length() == 1) value = "0" + value;
                value = "." + value;
            }
        }
        value = value.replaceAll("[^0-9.]", "");
        if (value.matches("^\\.\\d{1,4}$")) {
            fields.setHematocrit(value);
        }
    }

    private void parseRequestType(BloodRequestOcrFieldsDTO fields, String flat, List<String> warnings) {
        String line = captureRegexGroup(flat, "REQUEST\\s+TYPE\\s*[:\\-]?\\s*([^\\n]{1,120})", 1);
        String chunk = isBlank(line) ? flat : line;
        String requestType = null;
        int statScore = checkedTokenScore(chunk, "STAT");
        int routineScore = checkedTokenScore(chunk, "ROUTINE");
        if (routineScore > statScore) requestType = "ROUTINE";
        else if (statScore > routineScore) requestType = "STAT";
        if (requestType == null) {
            if (chunk.matches(".*\\b[A-Z]{0,2}ROUTINE\\b.*")) requestType = "ROUTINE";
            else if (chunk.matches(".*\\b[A-Z]{0,2}STAT\\b.*")) requestType = "STAT";
        }
        fields.setRequestType(requestType);
        if (requestType == null) {
            warnings.add("Request type was not clearly detected.");
        }
    }

    private void parsePreviousTransfusion(BloodRequestOcrFieldsDTO fields, String flat) {
        String segment = captureRegexGroup(flat,
                "HISTORY\\s+OF\\s+PREVIOUS\\s+TRANSFUSION\\s*([^\\n]{1,180})",
                1);
        String value = parseYesNoFromSegment(segment);
        fields.setPreviousTransfusion(value);

        String when = captureRegexGroup(flat,
                "HISTORY\\s+OF\\s+PREVIOUS\\s+TRANSFUSION[\\s\\S]{0,160}?WHEN\\s*[:\\-]?\\s*([0-3OI]?[0-9][\\-/][01OI]?[0-9][\\-/][12][0-9]{3}|[0-3OI]?[0-9][\\-/][01OI]?[0-9][\\-/][0-9]{2})",
                1);
        fields.setPreviousTransfusionDate(normalizeDateToIso(when));

        String units = captureRegexGroup(flat,
                "HISTORY\\s+OF\\s+PREVIOUS\\s+TRANSFUSION[\\s\\S]{0,200}?NO\\.\\s*OF\\s+UNITS\\s+TRANSFUSED\\s*[:\\-]?\\s*([0-9]{1,2})",
                1);
        if (!isBlank(units)) fields.setPreviousUnits(units);
    }

    private void parsePreviousReaction(BloodRequestOcrFieldsDTO fields, String flat) {
        String segment = captureRegexGroup(flat,
                "HISTORY\\s+OF\\s+PREVIOUS\\s+REACTION\\s*([^\\n]{1,180})",
                1);
        fields.setPreviousReaction(parseYesNoFromSegment(segment));

        String when = captureRegexGroup(flat,
                "HISTORY\\s+OF\\s+PREVIOUS\\s+REACTION[\\s\\S]{0,160}?WHEN\\s*[:\\-]?\\s*([0-3OI]?[0-9][\\-/][01OI]?[0-9][\\-/][12][0-9]{3}|[0-3OI]?[0-9][\\-/][01OI]?[0-9][\\-/][0-9]{2})",
                1);
        fields.setReactionDate(normalizeDateToIso(when));
    }

    private void parseUnits(BloodRequestOcrFieldsDTO fields, String headerFlat, String fullFlat) {
        String units = captureRegexGroup(headerFlat, "NO\\.\\s*OF\\s*UNIT/?S\\s*NEEDED\\s*[:\\-]?\\s*([0-9]{1,2})", 1);
        if (isBlank(units)) {
            units = captureRegexGroup(headerFlat, "NO\\.\\s*OF\\s+UNITS\\s+NEEDED\\s*[:\\-]?\\s*([0-9]{1,2})", 1);
        }
        if (isBlank(units)) {
            units = captureRegexGroup(fullFlat, "NO\\.\\s*OF\\s*UNIT/?S\\s*NEEDED\\s*[:\\-]?\\s*([0-9]{1,2})", 1);
        }
        if (isBlank(units)) {
            units = captureRegexGroup(fullFlat, "NO\\.\\s*OF\\s+UNITS\\s+NEEDED\\s*[:\\-]?\\s*([0-9]{1,2})", 1);
        }
        fields.setUnits(units);
    }

    private void parseIndicationsAndComponent(BloodRequestOcrFieldsDTO fields, List<String> lines, String flat, List<String> warnings) {
        List<String> selectedCodes = new ArrayList<>();
        Map<String, String> otherTextMap = new LinkedHashMap<>();

        for (String line : lines) {
            Matcher matcher = CHECKED_CODE_PATTERN.matcher(line);
            while (matcher.find()) {
                String code = matcher.group(1).toUpperCase(Locale.ROOT);
                int idx = matcher.start();
                if (looksChecked(line, idx, code.length())) {
                    if (!selectedCodes.contains(code)) selectedCodes.add(code);
                    String otherText = captureRegexGroup(line, code + ".*?SPECIFY\\s*[:\\-]?\\s*([A-Z0-9 ,.'()\\-]{2,60})", 1);
                    if (!isBlank(otherText)) {
                        otherTextMap.put(code, toHumanCase(cleanWords(otherText)));
                    }
                }
            }

            Matcher mergedMatcher = CHECKED_CODE_MERGED_PATTERN.matcher(line);
            while (mergedMatcher.find()) {
                String code = mergedMatcher.group(1).toUpperCase(Locale.ROOT);
                if (!selectedCodes.contains(code)) {
                    selectedCodes.add(code);
                }
            }

            if (line.matches(".*\\bLI\\s+PW-\\d\\b.*")) {
                String code = captureRegexGroup(line, "\\b(PW-\\d)\\b", 1);
                if (!isBlank(code) && !selectedCodes.contains(code.toUpperCase(Locale.ROOT))) {
                    selectedCodes.add(code.toUpperCase(Locale.ROOT));
                }
            }
        }

        fields.setIndicationCodes(selectedCodes);
        fields.setOtherIndicationText(otherTextMap);

        String component = inferComponentFromCodes(selectedCodes);
        if (isBlank(component)) {
            component = inferComponentFromText(flat);
        }
        fields.setComponentType(component);

        if (selectedCodes.isEmpty()) {
            warnings.add("No indication codes were confidently detected.");
        }
        if (isBlank(component)) {
            warnings.add("Component type was not clearly detected.");
        }
    }

    private String inferComponentFromCodes(List<String> codes) {
        if (codes == null || codes.isEmpty()) return null;
        Map<String, Integer> count = new LinkedHashMap<>();
        for (String code : codes) {
            String c = code.toUpperCase(Locale.ROOT);
            String component = null;
            if (c.startsWith("PR-") || c.startsWith("R-")) component = "PRBC";
            else if (c.startsWith("PW-")) component = "WHOLE_BLOOD";
            else if (c.startsWith("PWR") || c.startsWith("W-")) component = "WRBC";
            else if (c.startsWith("PP-") || c.startsWith("P-")) component = "PLATELET_CONCENTRATE";
            else if (c.startsWith("PF-") || c.startsWith("F-")) component = "FRESH_FROZEN_PLASMA";
            else if (c.startsWith("PC-") || c.startsWith("C-")) component = "CRYOPRECIPITATE";
            if (component != null) count.merge(component, 1, Integer::sum);
        }
        if (count.isEmpty()) return null;
        int max = count.values().stream().max(Integer::compareTo).orElse(0);
        List<String> top = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : count.entrySet()) {
            if (entry.getValue() == max) {
                top.add(entry.getKey());
            }
        }
        if (top.size() != 1) {
            return null;
        }
        return top.get(0);
    }

    private String inferComponentFromText(String flat) {
        for (Map.Entry<String, String> entry : COMPONENT_MAP.entrySet()) {
            if (flat.contains(entry.getKey())) return entry.getValue();
        }
        return null;
    }

    private boolean looksChecked(String line, int codeStart, int codeLength) {
        int from = Math.max(0, codeStart - 10);
        int to = Math.min(line.length(), codeStart + codeLength + 6);
        String around = line.substring(from, to);
        return around.contains("(/)")
                || around.contains("(X)")
                || around.contains("(x)")
                || around.contains("LI ")
                || around.matches(".*[/Xx]\\s*" + Pattern.quote(line.substring(codeStart, codeStart + codeLength)) + ".*");
    }
    private boolean containsCheckedToken(String line, String token) {
        if (isBlank(line)) return false;
        String upper = line.toUpperCase(Locale.ROOT);
        String target = token.toUpperCase(Locale.ROOT);
        return upper.matches(".*\\([Xx/✔✓]\\)\\s*" + target + ".*")
                || upper.matches(".*[Xx/✔✓]\\s*" + target + ".*")
                || upper.matches(".*" + target + "\\s*\\([Xx/✔✓]\\).*");
    }

    private int checkedTokenScore(String line, String token) {
        if (isBlank(line)) return 0;
        String upper = line.toUpperCase(Locale.ROOT);
        String target = token.toUpperCase(Locale.ROOT);
        if (upper.matches(".*\\([Xx/VvYyGg]\\)\\s*" + target + ".*")) return 3;
        if (upper.matches(".*[Xx/VvYyGg]\\s*" + target + ".*")) return 2;
        if (upper.matches(".*\\b[A-Z]{1,2}" + target + "\\b.*")) return 1;
        if (upper.matches(".*\\b" + target + "\\b.*")) return 1;
        return 0;
    }
    private String parseYesNoFromSegment(String segment) {
        if (isBlank(segment)) return null;
        String upper = segment.toUpperCase(Locale.ROOT);
        boolean noChecked = upper.matches(".*\\([Xx/✔✓]\\)\\s*NO.*") || upper.matches(".*NO\\s*\\([Xx/✔✓]\\).*");
        boolean yesChecked = upper.matches(".*\\([Xx/✔✓]\\)\\s*YES.*") || upper.matches(".*YES\\s*\\([Xx/✔✓]\\).*");
        if (noChecked && !yesChecked) return "NO";
        if (yesChecked && !noChecked) return "YES";
        if (upper.contains("NO") && !upper.contains("YES")) return "NO";
        if (upper.contains("YES") && !upper.contains("NO")) return "YES";
        return null;
    }

    private String extractHeaderRaw(String rawText) {
        if (isBlank(rawText)) return "";
        int end = indexOfIgnoreCase(rawText, "CHECK COMPONENTS NEEDED");
        if (end < 0) end = indexOfIgnoreCase(rawText, "CHECK COMPONENTS");
        if (end < 0) end = indexOfIgnoreCase(rawText, "WHOLE BLOOD -");
        if (end < 0) return rawText;
        return rawText.substring(0, end);
    }

    private int indexOfIgnoreCase(String source, String target) {
        if (source == null || target == null) return -1;
        return source.toLowerCase(Locale.ROOT).indexOf(target.toLowerCase(Locale.ROOT));
    }

    private String firstDateInText(String text) {
        if (isBlank(text)) return null;
        Matcher m = DATE_NUMERIC_PATTERN.matcher(text.toUpperCase(Locale.ROOT).replace('O', '0').replace('I', '1'));
        if (m.find()) return m.group();
        return null;
    }

    private String stripDates(String value) {
        if (value == null) return null;
        return value.replaceAll("([0-3OI]?[0-9][\\-/][01OI]?[0-9][\\-/][12][0-9]{3}|[0-3OI]?[0-9][\\-/][01OI]?[0-9][\\-/][0-9]{2})", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String findLikelyPatientValueLine(List<String> lines) {
        int patientHeaderIdx = indexOfLine(lines, line -> line.contains("PATIENT") && line.contains("GIVEN NAME"));
        if (patientHeaderIdx >= 0 && patientHeaderIdx + 1 < lines.size()) {
            return lines.get(patientHeaderIdx + 1);
        }
        return "";
    }

    private String normalizeWordNumberNoise(String value) {
        if (value == null) return null;
        String upper = value.toUpperCase(Locale.ROOT);
        upper = upper.replaceAll("(?<=[A-Z])0(?=[A-Z])", "O");
        upper = upper.replace("BLO0D", "BLOOD");
        return upper;
    }

    private int countRecognizedFields(BloodRequestOcrFieldsDTO fields) {
        int count = 0;
        if (!isBlank(fields.getPatientName())) count++;
        if (!isBlank(fields.getPatientLast())) count++;
        if (!isBlank(fields.getBirthdate())) count++;
        if (!isBlank(fields.getSex())) count++;
        if (!isBlank(fields.getDiagnosis())) count++;
        if (!isBlank(fields.getPhysician())) count++;
        if (!isBlank(fields.getContact())) count++;
        if (!isBlank(fields.getBloodType())) count++;
        if (!isBlank(fields.getHemoglobin())) count++;
        if (!isBlank(fields.getHematocrit())) count++;
        if (!isBlank(fields.getComponentType())) count++;
        if (!isBlank(fields.getUnits())) count++;
        if (fields.getIndicationCodes() != null && !fields.getIndicationCodes().isEmpty()) count++;
        return count;
    }

    private int estimateConfidence(BloodRequestOcrFieldsDTO fields) {
        int found = 0;
        for (String key : REQUEST_FIELD_KEYS) {
            if (!isBlank(fieldValue(fields, key))) found += 1;
        }
        if (fields.getIndicationCodes() != null && !fields.getIndicationCodes().isEmpty()) found += 1;
        int total = REQUEST_FIELD_KEYS.size() + 1;
        return Math.max(20, Math.min(99, (int) Math.round((found * 100.0) / total)));
    }

    private int buildAttemptScore(BloodRequestOcrFieldsDTO fields, int confidence) {
        int recognized = countRecognizedFields(fields);
        int indications = fields.getIndicationCodes() != null ? fields.getIndicationCodes().size() : 0;
        int score = (recognized * 10) + (Math.min(indications, 5) * 4) + (confidence / 4);
        score += isBlank(fields.getBloodType()) ? -24 : 24;
        score += isBlank(fields.getHemoglobin()) ? -20 : 20;
        score += isBlank(fields.getHematocrit()) ? -12 : 12;
        score += isBlank(fields.getPhysician()) ? -8 : 8;
        score += isBlank(fields.getDiagnosis()) ? -8 : 8;
        score += isBlank(fields.getContact()) ? -8 : 8;
        return score;
    }

    private boolean hasMissingCriticalFields(BloodRequestOcrFieldsDTO fields) {
        return isBlank(fields.getPatientName())
                || isBlank(fields.getPatientLast())
                || isBlank(fields.getBirthdate())
                || isBlank(fields.getBloodType())
                || isBlank(fields.getHemoglobin())
                || isBlank(fields.getHematocrit())
                || isBlank(fields.getComponentType())
                || isBlank(fields.getUnits());
    }

    private String fieldValue(BloodRequestOcrFieldsDTO fields, String key) {
        return switch (key) {
            case "patientName" -> fields.getPatientName();
            case "patientMiddle" -> fields.getPatientMiddle();
            case "patientLast" -> fields.getPatientLast();
            case "birthdate" -> fields.getBirthdate();
            case "sex" -> fields.getSex();
            case "barangay" -> fields.getBarangay();
            case "municipality" -> fields.getMunicipality();
            case "province" -> fields.getProvince();
            case "physician" -> fields.getPhysician();
            case "room" -> fields.getRoom();
            case "diagnosis" -> fields.getDiagnosis();
            case "contact" -> fields.getContact();
            case "bloodType" -> fields.getBloodType();
            case "hemoglobin" -> fields.getHemoglobin();
            case "hematocrit" -> fields.getHematocrit();
            case "requestType" -> fields.getRequestType();
            case "units" -> fields.getUnits();
            case "componentType" -> fields.getComponentType();
            default -> null;
        };
    }

    private String normalizePhilippineContact(String raw) {
        if (isBlank(raw)) return null;
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.startsWith("63")) {
            digits = digits.substring(2);
        } else if (digits.startsWith("09")) {
            digits = digits.substring(1);
        } else if (digits.startsWith("0")) {
            digits = digits.substring(1);
        }

        if (digits.startsWith("9")) {
            digits = digits.substring(0, Math.min(10, digits.length()));
        }
        if (!digits.matches("^9\\d{9}$")) {
            return null;
        }
        return "+63" + digits;
    }

    private String normalizeDateToIso(String raw) {
        if (isBlank(raw)) return null;
        Matcher matcher = DATE_NUMERIC_PATTERN.matcher(raw.toUpperCase(Locale.ROOT).replace('O', '0').replace('I', '1'));
        if (!matcher.find()) return null;

        try {
            int month = Integer.parseInt(matcher.group(1));
            int day = Integer.parseInt(matcher.group(2));
            int year = Integer.parseInt(matcher.group(3));
            if (year < 100) year += 2000;
            LocalDate date = LocalDate.of(year, month, day);
            return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private String captureLabelValue(String flat, String label, List<String> stops) {
        if (isBlank(flat)) return null;
        StringBuilder pattern = new StringBuilder("(?i)\\b")
                .append(Pattern.quote(label))
                .append("\\b\\s*[:\\-]?\\s*([A-Z0-9#,'./\\- ]{1,80}?)");
        if (stops != null && !stops.isEmpty()) {
            pattern.append("(?=");
            for (int i = 0; i < stops.size(); i++) {
                if (i > 0) pattern.append("|");
                pattern.append("\\s+").append(Pattern.quote(stops.get(i)));
            }
            pattern.append("|$)");
        } else {
            pattern.append("(?=$)");
        }
        String captured = captureRegexGroup(flat, pattern.toString(), 1);
        captured = cleanWords(captured);
        if (containsHeaderWords(captured)) return null;
        return captured;
    }

    private String captureRegexGroup(String text, String regex, int group) {
        if (isBlank(text) || isBlank(regex)) return null;
        Matcher matcher = Pattern.compile(regex, Pattern.CASE_INSENSITIVE).matcher(text);
        if (matcher.find()) {
            return matcher.group(group);
        }
        return null;
    }

    private String cleanWords(String value) {
        if (value == null) return null;
        return value
                .replaceAll("(?i)\\b(?:PATIENT|SURNAME|GIVEN|MIDDLE|NAME|AGE|SEX|DATE|ADDRESS|MUNICIPALITY|PROVINCE|WARD|ROOM|CLINICAL|IMPRESSION|DIAGNOSIS|ATTENDING|PHYSICIAN|CONTACT|NUM|BLOOD|TYPE|HEMOGLOBIN|HEMATOCRIT|REQUEST|HISTORY|PREVIOUS|TRANSFUSION|REACTION)\\b", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean containsHeaderWords(String value) {
        if (isBlank(value)) return false;
        String upper = value.toUpperCase(Locale.ROOT);
        return upper.contains("SURNAME")
                || upper.contains("GIVEN NAME")
                || upper.contains("MIDDLE NAME")
                || upper.contains("ADDRESS")
                || upper.contains("PATIENT")
                || upper.contains("HEMOGLOBIN")
                || upper.contains("HEMATOCRIT");
    }

    private boolean isPatientHeaderWord(String token) {
        return Arrays.asList(
                "PATIENT", "SURNAME", "GIVEN", "NAME", "MIDDLE", "AGE", "SEX", "DATE", "ADDRESS"
        ).contains(token);
    }

    private String toHumanCase(String value) {
        if (isBlank(value)) return null;
        String[] tokens = value.trim().replaceAll("\\s+", " ").split(" ");
        List<String> built = new ArrayList<>();
        for (String token : tokens) {
            if (token.isBlank()) continue;
            if (token.length() <= 3 && token.matches("^[A-Z]+$")) {
                built.add(token);
                continue;
            }
            if (token.contains("-")) {
                String[] dash = token.split("-");
                List<String> dashParts = new ArrayList<>();
                for (String d : dash) dashParts.add(capitalize(d));
                built.add(String.join("-", dashParts));
            } else {
                built.add(capitalize(token));
            }
        }
        return built.isEmpty() ? null : String.join(" ", built);
    }

    private String capitalize(String token) {
        if (isBlank(token)) return "";
        String lower = token.toLowerCase(Locale.ROOT);
        if (lower.length() == 1) return lower.toUpperCase(Locale.ROOT);
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }

    private List<String> normalizedLines(String rawText) {
        if (isBlank(rawText)) return Collections.emptyList();
        List<String> lines = new ArrayList<>();
        for (String line : rawText.split("\\r?\\n")) {
            String cleaned = normalizeLine(line);
            if (!cleaned.isBlank()) lines.add(cleaned);
        }
        return lines;
    }

    private String normalizeFlat(String rawText) {
        if (rawText == null) return "";
        return normalizeLine(rawText.replace('\n', ' ').replace('\r', ' '));
    }

    private String normalizeLine(String line) {
        if (line == null) return "";
        return line.toUpperCase(Locale.ROOT)
                .replace("â€”", " ")
                .replace("_", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private int indexOfLine(List<String> lines, java.util.function.Predicate<String> predicate) {
        for (int i = 0; i < lines.size(); i++) {
            if (predicate.test(lines.get(i))) return i;
        }
        return -1;
    }

    private String findLine(List<String> lines, java.util.function.Predicate<String> predicate) {
        int idx = indexOfLine(lines, predicate);
        return idx >= 0 ? lines.get(idx) : "";
    }

    private String readOcrError(JsonNode root) {
        JsonNode errorMessageNode = root.path("ErrorMessage");
        if (errorMessageNode.isArray() && !errorMessageNode.isEmpty()) {
            List<String> parts = new ArrayList<>();
            for (JsonNode n : errorMessageNode) {
                String msg = n.asText("");
                if (!msg.isBlank()) parts.add(msg);
            }
            return String.join("; ", parts);
        }
        return errorMessageNode.asText("");
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Please upload a form image or PDF to scan.");
        }
        String contentType = resolveContentType(file);
        if (contentType.isBlank() || !ACCEPTED_FILE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Unsupported file type. Please upload PDF, JPG, PNG, WEBP, BMP, or TIFF.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("File is too large. Maximum upload size is 5MB.");
        }
    }

    private String resolveContentType(MultipartFile file) {
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT).trim();
        if (!contentType.isBlank() && !"application/octet-stream".equals(contentType)) {
            return contentType;
        }
        String byName = guessContentTypeByFilename(file.getOriginalFilename());
        return byName == null ? contentType : byName;
    }

    private String guessContentTypeByFilename(String filename) {
        if (filename == null) return null;
        String lower = filename.trim().toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".jfif")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".bmp")) return "image/bmp";
        if (lower.endsWith(".tif") || lower.endsWith(".tiff")) return "image/tiff";
        if (lower.endsWith(".pdf")) return "application/pdf";
        return null;
    }

    private String forceJpgExtension(String filename) {
        if (isBlank(filename)) return "request-form-upload.jpg";
        int dot = filename.lastIndexOf('.');
        if (dot <= 0) return filename + ".jpg";
        return filename.substring(0, dot) + ".jpg";
    }

    private String sanitizeFileName(String original) {
        if (original == null || original.isBlank()) return "request-form-upload.jpg";
        return original.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    private static List<String> uniqueList(List<String> values) {
        if (values == null || values.isEmpty()) return new ArrayList<>();
        LinkedHashSet<String> set = new LinkedHashSet<>();
        for (String value : values) {
            if (value == null) continue;
            String trimmed = value.trim();
            if (!trimmed.isBlank()) set.add(trimmed);
        }
        return new ArrayList<>(set);
    }

    private static Map<String, String> buildComponentMap() {
        LinkedHashMap<String, String> map = new LinkedHashMap<>();
        map.put("PACKED RED BLOOD CELLS", "PRBC");
        map.put("PRBC", "PRBC");
        map.put("WHOLE BLOOD", "WHOLE_BLOOD");
        map.put("WB", "WHOLE_BLOOD");
        map.put("WHOLE RED BLOOD CELLS", "WRBC");
        map.put("WRBC", "WRBC");
        map.put("PLATELET CONCENTRATE", "PLATELET_CONCENTRATE");
        map.put("PC", "PLATELET_CONCENTRATE");
        map.put("FRESH FROZEN PLASMA", "FRESH_FROZEN_PLASMA");
        map.put("FFP", "FRESH_FROZEN_PLASMA");
        map.put("CRYOPRECIPITATE", "CRYOPRECIPITATE");
        map.put("CRYO", "CRYOPRECIPITATE");
        return map;
    }

    private static class OcrAttempt {
        private final String rawText;
        private final BloodRequestOcrFieldsDTO fields;
        private final int confidence;
        private final List<String> warnings;
        private final int score;

        private OcrAttempt(String rawText, BloodRequestOcrFieldsDTO fields, int confidence, List<String> warnings, int score) {
            this.rawText = rawText;
            this.fields = fields;
            this.confidence = confidence;
            this.warnings = warnings != null ? warnings : new ArrayList<>();
            this.score = score;
        }
    }

    private static class PreparedUpload {
        private final String filename;
        private final byte[] bytes;

        private PreparedUpload(String filename, byte[] bytes) {
            this.filename = filename;
            this.bytes = bytes;
        }
    }
}




