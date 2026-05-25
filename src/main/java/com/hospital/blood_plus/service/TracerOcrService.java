package com.hospital.blood_plus.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.blood_plus.dto.response.TracerOcrResponseDTO;
import com.hospital.blood_plus.dto.response.TracerOcrRowDTO;
import com.hospital.blood_plus.repository.BloodBagRepository;
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
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
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
import java.time.format.DateTimeParseException;
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
public class TracerOcrService {
    private static final int MAX_ROWS = 10;
    private static final long MAX_FILE_BYTES = 10L * 1024 * 1024;
    private static final long OCR_SPACE_SOFT_LIMIT_BYTES = 1400L * 1024L;
    private static final int OCR_MAX_IMAGE_WIDTH = 1800;

    private static final Pattern DATE_PATTERN = Pattern.compile(
            "\\b([0-3SO]?[0-9])\\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)\\s*([12][0-9]{3}|[0-9]{2})\\b");
    private static final Pattern BG_PATTERN = Pattern.compile(
            "\\b(AB|A|B|O|0)\\s*(POSITIVE|POS|\\+|NEGATIVE|NEG|-)\\b");
    private static final Pattern TRANSACTION_PATTERN = Pattern.compile(
            "(?:TRANSACTION\\s*(?:#|NO\\.?|NUMBER)?\\s*:?\\s*)(\\d{4,})",
            Pattern.CASE_INSENSITIVE);

    private static final Map<String, String> COMPONENT_MAP = buildComponentMap();
    private static final Set<String> ACCEPTED_FILE_TYPES = new LinkedHashSet<>(
            Arrays.asList("image/jpeg", "image/jpg", "image/png", "image/webp", "image/bmp", "image/tiff", "image/jfif"));

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final BloodBagRepository bloodBagRepository;

    @Value("${ocr.space.api.key:}")
    private String ocrApiKey;

    @Value("${ocr.space.api.url:https://api.ocr.space/parse/image}")
    private String ocrApiUrl;

    public TracerOcrService(BloodBagRepository bloodBagRepository) {
        this.bloodBagRepository = bloodBagRepository;
    }

    public TracerOcrResponseDTO scanTracerForm(MultipartFile file) {
        validateFile(file);
        if (ocrApiKey == null || ocrApiKey.isBlank()) {
            throw new IllegalStateException("OCR service is not configured. Missing OCR_SPACE_API_KEY.");
        }

        List<Integer> engines = Arrays.asList(2, 1, 3);
        OcrAttempt best = null;
        List<String> allWarnings = new ArrayList<>();

        for (Integer engine : engines) {
            try {
                OcrAttempt attempt = runOcrAttempt(file, engine);
                allWarnings.addAll(attempt.warnings);
                if (best == null || attempt.score > best.score) {
                    best = attempt;
                }
            } catch (IllegalArgumentException ex) {
                allWarnings.add("Engine " + engine + ": " + ex.getMessage());
            } catch (RuntimeException ex) {
                allWarnings.add("Engine " + engine + ": OCR request failed.");
            }
        }

        if (best == null) {
            String uploadFailure = allWarnings.stream()
                    .filter(message -> message != null && message.contains("OCR service request failed"))
                    .findFirst()
                    .orElse(null);
            if (uploadFailure != null) {
                String detail = uploadFailure.replaceFirst("^Engine\\s+\\d+:\\s*", "").trim();
                throw new IllegalStateException(detail);
            }
            throw new IllegalArgumentException("Unable to parse tracer form with OCR.");
        }

        TracerOcrResponseDTO response = new TracerOcrResponseDTO();
        response.setTransactionNumber(extractTransactionNumber(best.rawText));

        validateExistingSerials(best.rows);

        List<TracerOcrRowDTO> limited = best.rows.size() > MAX_ROWS
                ? best.rows.subList(0, MAX_ROWS)
                : best.rows;

        response.setRows(new ArrayList<>(limited));
        response.setRawText(best.rawText);
        response.setConfidence(best.confidence);

        List<String> warnings = new ArrayList<>();
        warnings.addAll(allWarnings);
        warnings.addAll(best.warnings);
        if (best.rows.size() > MAX_ROWS) {
            warnings.add("Only first 10 rows were returned due to batch limit.");
        }
        response.setWarnings(uniqueList(warnings));
        return response;
    }

    private OcrAttempt runOcrAttempt(MultipartFile file, int engine) {
        JsonNode root = requestOcrSpace(file, engine);
        List<String> warnings = new ArrayList<>();

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
                if (!textBuilder.isEmpty()) {
                    textBuilder.append('\n');
                }
                textBuilder.append(text);
            }
        }

        String rawText = textBuilder.toString().trim();
        if (rawText.isBlank()) {
            throw new IllegalArgumentException("OCR returned empty parsed text.");
        }

        List<TracerOcrRowDTO> rows = parseRows(rawText, warnings);
        int confidence = estimateConfidence(rows);
        if (confidence < 60) {
            warnings.add("OCR confidence is low. Please review detected rows before importing.");
        }
        if (rows.isEmpty()) {
            warnings.add("No valid blood bag rows were detected. Try a clearer photo or crop the table area.");
        }

        return new OcrAttempt(rawText, rows, confidence, warnings);
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
        } catch (HttpStatusCodeException ex) {
            String detail = buildOcrHttpFailureDetail(ex);
            throw new IllegalArgumentException("OCR service request failed: " + detail);
        } catch (ResourceAccessException ex) {
            throw new IllegalArgumentException("OCR service request failed: unable to reach OCR.space endpoint.");
        } catch (RestClientException ex) {
            String message = ex.getMessage() != null ? ex.getMessage() : "unexpected client error";
            throw new IllegalArgumentException("OCR service request failed: " + message);
        } catch (IOException ex) {
            throw new IllegalArgumentException("Failed to process OCR response.");
        }
    }

    private String buildOcrHttpFailureDetail(HttpStatusCodeException ex) {
        int status = ex.getStatusCode().value();
        String body = ex.getResponseBodyAsString();
        String compactBody = body == null ? "" : body.replaceAll("\\s+", " ").trim();
        if (compactBody.length() > 220) {
            compactBody = compactBody.substring(0, 220) + "...";
        }

        if (status == 401 || status == 403) {
            return "HTTP " + status + " (API key rejected or unauthorized).";
        }
        if (status == 429) {
            return "HTTP 429 (rate limit or plan quota exceeded).";
        }
        if (!compactBody.isBlank()) {
            return "HTTP " + status + " response: " + compactBody;
        }
        return "HTTP " + status + ".";
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

    private String resolveContentType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            return contentType.toLowerCase(Locale.ROOT);
        }
        String name = sanitizeFileName(file.getOriginalFilename()).toLowerCase(Locale.ROOT);
        if (name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".jfif")) return "image/jpeg";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".bmp")) return "image/bmp";
        if (name.endsWith(".tif") || name.endsWith(".tiff")) return "image/tiff";
        return "application/octet-stream";
    }

    private String forceJpgExtension(String filename) {
        String safe = sanitizeFileName(filename);
        int dot = safe.lastIndexOf('.');
        if (dot > 0) {
            safe = safe.substring(0, dot);
        }
        return safe + ".jpg";
    }

    private List<TracerOcrRowDTO> parseRows(String rawText, List<String> warnings) {
        List<TracerOcrRowDTO> rows = new ArrayList<>();
        String[] lines = rawText.split("\\r?\\n");
        int rowOrder = 0;

        for (String lineRaw : lines) {
            String line = normalizeLine(lineRaw);
            if (line.isBlank()) continue;

            String component = parseComponent(line);
            SerialParseResult serialResult = parseSerial(line);
            List<String> dates = parseDates(line);

            if (component == null || serialResult.serialNumber == null || dates.isEmpty()) {
                continue;
            }

            TracerOcrRowDTO row = new TracerOcrRowDTO();
            row.setSourceText(lineRaw != null ? lineRaw.trim() : "");
            row.setBloodGroup(parseBloodGroup(line));
            row.setComponentType(component);
            row.setSerialNumber(serialResult.serialNumber);
            row.setCollectedAt(dates.get(0));
            row.setExpiresAt(dates.size() > 1 ? dates.get(1) : "");

            List<String> issues = new ArrayList<>();
            if (serialResult.serialCorrected) {
                issues.add("Serial corrected from OCR noise");
            }
            if (row.getExpiresAt() == null || row.getExpiresAt().isBlank()) {
                issues.add("Missing expiry date");
            }

            normalizeDateOrder(row, issues);
            if (!isSixDigitSerial(row.getSerialNumber())) {
                issues.add("Serial format needs review");
            }

            row.setNeedsReview(!issues.isEmpty());
            row.setIssues(issues);
            rows.add(row);
            rowOrder += 1;
        }

        if (rows.isEmpty()) {
            return rows;
        }

        inferBloodGroup(rows, rawText);
        markDuplicateSerials(rows);

        if (rowOrder == 0) {
            warnings.add("No valid rows found from OCR text.");
        }
        return rows;
    }

    private void inferBloodGroup(List<TracerOcrRowDTO> rows, String rawText) {
        Map<String, Integer> frequency = new LinkedHashMap<>();
        for (TracerOcrRowDTO row : rows) {
            if (row.getBloodGroup() == null || row.getBloodGroup().isBlank()) continue;
            frequency.merge(row.getBloodGroup(), 1, Integer::sum);
        }

        String majority = "";
        int majorityCount = 0;
        for (Map.Entry<String, Integer> entry : frequency.entrySet()) {
            if (entry.getValue() > majorityCount) {
                majority = entry.getKey();
                majorityCount = entry.getValue();
            }
        }

        String formLevel = parseBloodGroup(normalizeLine(rawText));
        String inferred = !formLevel.isBlank() ? formLevel : (majorityCount >= 2 ? majority : "");
        if (inferred.isBlank()) return;

        for (TracerOcrRowDTO row : rows) {
            if (row.getBloodGroup() != null && !row.getBloodGroup().isBlank()) continue;
            row.setBloodGroup(inferred);
            List<String> issues = new ArrayList<>(row.getIssues());
            issues.add("Blood group inferred");
            row.setIssues(uniqueList(issues));
            row.setNeedsReview(true);
        }
    }

    private void markDuplicateSerials(List<TracerOcrRowDTO> rows) {
        Set<String> seen = new LinkedHashSet<>();
        for (TracerOcrRowDTO row : rows) {
            String serial = safeUpper(row.getSerialNumber());
            if (serial.isBlank()) continue;
            if (seen.contains(serial)) {
                List<String> issues = new ArrayList<>(row.getIssues());
                issues.add("Duplicate serial");
                row.setIssues(uniqueList(issues));
                row.setNeedsReview(true);
            } else {
                seen.add(serial);
            }
        }
    }

    private void normalizeDateOrder(TracerOcrRowDTO row, List<String> issues) {
        String collected = row.getCollectedAt();
        String expires = row.getExpiresAt();
        if (collected == null || collected.isBlank() || expires == null || expires.isBlank()) return;

        LocalDate cDate = parseIsoDate(collected);
        LocalDate eDate = parseIsoDate(expires);
        if (cDate == null || eDate == null) {
            issues.add("Invalid date");
            return;
        }

        if (cDate.isAfter(eDate)) {
            row.setCollectedAt(expires);
            row.setExpiresAt(collected);
            issues.add("Date order corrected");
            cDate = parseIsoDate(row.getCollectedAt());
            eDate = parseIsoDate(row.getExpiresAt());
        }

        if (cDate == null || eDate == null || cDate.getYear() < 2024 || eDate.getYear() < 2024) {
            issues.add("Invalid date");
        }
    }

    private LocalDate parseIsoDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private String normalizeLine(String line) {
        return safeUpper(line)
                .replace('|', ' ')
                .replace('—', ' ')
                .replace('_', ' ')
                .replace(',', ' ')
                .replace("P0S", "POS")
                .replace("N3G", "NEG")
                .replace("NE6", "NEG")
                .replace('%', '6')
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String parseBloodGroup(String line) {
        if (line == null || line.isBlank()) return "";

        String compact = line
                .replace("APOS", "A POS")
                .replace("ANEG", "A NEG")
                .replace("BPOS", "B POS")
                .replace("BNEG", "B NEG")
                .replace("ABPOS", "AB POS")
                .replace("ABNEG", "AB NEG")
                .replace("OPOS", "O POS")
                .replace("ONEG", "O NEG");

        Matcher m = BG_PATTERN.matcher(compact);
        if (!m.find()) return "";
        String abo = "0".equals(m.group(1)) ? "O" : m.group(1);
        String rhToken = m.group(2);
        String rh = (rhToken.contains("NEG") || "-".equals(rhToken)) ? "NEG" : "POS";
        return abo + "_" + rh;
    }

    private String parseComponent(String line) {
        if (line == null || line.isBlank()) return null;
        String normalized = line.replaceAll("[^A-Z0-9]", "");
        for (Map.Entry<String, String> entry : COMPONENT_MAP.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    private SerialParseResult parseSerial(String line) {
        if (line == null || line.isBlank()) {
            return SerialParseResult.empty();
        }

        String compact = safeUpper(line).replaceAll("[^A-Z0-9]", "");
        Matcher vMatcher = Pattern.compile("V[A-Z0-9]{4,10}").matcher(compact);
        String token = vMatcher.find() ? vMatcher.group() : "";

        if (token.isBlank()) {
            Matcher fallback = Pattern.compile("[A-Z]?\\d{5,8}").matcher(compact);
            if (fallback.find()) token = fallback.group();
        }
        if (token.isBlank()) {
            return SerialParseResult.empty();
        }

        String raw = token;
        token = token.replaceFirst("^VA(?=\\d)", "V");
        if (!token.startsWith("V")) {
            token = "V" + token.replaceFirst("^[A-Z]", "");
        }

        String digits = token.replaceFirst("^V", "").replaceAll("[^0-9]", "");
        if (digits.isBlank()) return SerialParseResult.empty();

        boolean corrected = !raw.equals(token);

        if (digits.length() > 6) {
            digits = digits.substring(0, 6);
            corrected = true;
        }
        if (digits.length() == 5) {
            digits = "4" + digits;
            corrected = true;
        }

        if (digits.length() != 6) {
            return new SerialParseResult("V" + digits, true);
        }
        return new SerialParseResult("V" + digits, corrected);
    }

    private List<String> parseDates(String line) {
        if (line == null || line.isBlank()) return Collections.emptyList();

        String cleaned = safeUpper(line)
                .replaceAll("O(?=\\d)", "0")
                .replaceAll("S0(?=(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC))", "30")
                .replaceAll("%", "6")
                .replaceAll("TU?0?2(?=(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC))", "02");

        List<String> dates = new ArrayList<>();
        Matcher m = DATE_PATTERN.matcher(cleaned);
        while (m.find()) {
            String dayToken = m.group(1).replace('O', '0').replace('S', '3');
            String monthToken = m.group(2);
            String yearToken = m.group(3).replace('O', '0');

            String iso = toIsoDate(dayToken, monthToken, yearToken);
            if (!iso.isBlank() && !dates.contains(iso)) {
                dates.add(iso);
            }
            if (dates.size() == 2) break;
        }
        return dates;
    }

    private String toIsoDate(String dayToken, String monthToken, String yearToken) {
        try {
            int day = Integer.parseInt(dayToken);
            int year = Integer.parseInt(yearToken.length() == 2 ? "20" + yearToken : yearToken);
            int month = monthFromName(monthToken);
            if (month < 1 || month > 12) return "";
            LocalDate date = LocalDate.of(year, month, day);
            return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (RuntimeException ex) {
            return "";
        }
    }

    private int monthFromName(String monthToken) {
        String month = safeUpper(monthToken);
        return switch (month) {
            case "JAN" -> 1;
            case "FEB" -> 2;
            case "MAR" -> 3;
            case "APR" -> 4;
            case "MAY" -> 5;
            case "JUN" -> 6;
            case "JUL" -> 7;
            case "AUG" -> 8;
            case "SEP", "SEPT" -> 9;
            case "OCT" -> 10;
            case "NOV" -> 11;
            case "DEC" -> 12;
            default -> 0;
        };
    }

    private String extractTransactionNumber(String rawText) {
        if (rawText == null || rawText.isBlank()) return "";
        Matcher matcher = TRANSACTION_PATTERN.matcher(rawText);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return "";
    }

    private void validateExistingSerials(List<TracerOcrRowDTO> rows) {
        if (rows == null || rows.isEmpty()) return;
        List<String> serials = rows.stream()
                .map(TracerOcrRowDTO::getSerialNumber)
                .filter(serial -> serial != null && !serial.isBlank())
                .map(String::trim)
                .map(String::toUpperCase)
                .distinct()
                .toList();
        if (serials.isEmpty()) return;

        List<String> existing = bloodBagRepository.findExistingSerialNumbers(serials);
        if (existing != null && !existing.isEmpty()) {
            List<String> normalized = existing.stream()
                    .filter(value -> value != null && !value.isBlank())
                    .map(String::trim)
                    .map(String::toUpperCase)
                    .distinct()
                    .toList();
            throw new DuplicateSerialException(normalized);
        }
    }

    private int estimateConfidence(List<TracerOcrRowDTO> rows) {
        if (rows == null || rows.isEmpty()) return 0;
        int ready = 0;
        for (TracerOcrRowDTO row : rows) {
            boolean strong = row.getComponentType() != null && !row.getComponentType().isBlank()
                    && isSixDigitSerial(row.getSerialNumber())
                    && row.getCollectedAt() != null && !row.getCollectedAt().isBlank()
                    && row.getExpiresAt() != null && !row.getExpiresAt().isBlank();
            if (strong) ready += 1;
        }
        return Math.max(25, Math.min(99, (int) Math.round((ready * 100.0) / rows.size())));
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
            throw new IllegalArgumentException("Please upload an image to scan.");
        }
        String contentType = safeUpper(file.getContentType()).toLowerCase(Locale.ROOT);
        String fileName = safeUpper(file.getOriginalFilename()).toLowerCase(Locale.ROOT);
        boolean acceptedByName = fileName.matches(".*\\.(jpe?g|png|webp|bmp|tiff?|jfif)$");
        boolean genericType = contentType.isBlank() || "application/octet-stream".equals(contentType);

        if ((!genericType || !acceptedByName) && !ACCEPTED_FILE_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Unsupported image type. Please upload JPG, PNG, WEBP, BMP, or TIFF.");
        }
        if (file.getSize() > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("Image is too large. Maximum upload size is 10MB.");
        }
    }

    private String sanitizeFileName(String original) {
        if (original == null || original.isBlank()) {
            return "tracer-upload.jpg";
        }
        return original.replaceAll("[^A-Za-z0-9._-]", "_");
    }

    private static class PreparedUpload {
        private final String filename;
        private final byte[] bytes;

        private PreparedUpload(String filename, byte[] bytes) {
            this.filename = filename;
            this.bytes = bytes;
        }
    }

    private boolean isSixDigitSerial(String serial) {
        return serial != null && serial.matches("^V\\d{6}$");
    }

    private static String safeUpper(String input) {
        return input == null ? "" : input.toUpperCase(Locale.ROOT);
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
        map.put("LPRBC", "LEUKOREDUCED_PRBC");
        map.put("LEUKOREDUCED", "LEUKOREDUCED_PRBC");
        map.put("APRBC", "ALIQUOTED_PRBC");
        map.put("ALIQUOTED", "ALIQUOTED_PRBC");
        map.put("CRYOSUPERNATANT", "CRYOSUPERNATANT");
        map.put("CRYOSUP", "CRYOSUPERNATANT");
        map.put("CRYOPRECIPITATE", "CRYOPRECIPITATE");
        map.put("CRYO", "CRYOPRECIPITATE");
        map.put("PLATELET", "PLATELET_CONCENTRATE");
        map.put("PLT", "PLATELET_CONCENTRATE");
        map.put("FFP", "FRESH_FROZEN_PLASMA");
        map.put("PRBC", "PRBC");
        map.put("WR", "WHOLE_BLOOD");
        map.put("WS", "WHOLE_BLOOD");
        map.put("W8", "WHOLE_BLOOD");
        map.put("WB", "WHOLE_BLOOD");
        map.put("WHOLEBLOOD", "WHOLE_BLOOD");
        return map;
    }

    private static class OcrAttempt {
        private final String rawText;
        private final List<TracerOcrRowDTO> rows;
        private final int confidence;
        private final List<String> warnings;
        private final int score;

        private OcrAttempt(String rawText, List<TracerOcrRowDTO> rows, int confidence, List<String> warnings) {
            this.rawText = rawText;
            this.rows = rows != null ? rows : new ArrayList<>();
            this.confidence = confidence;
            this.warnings = warnings != null ? warnings : new ArrayList<>();
            this.score = scoreRows(this.rows, confidence);
        }

        private static int scoreRows(List<TracerOcrRowDTO> rows, int confidence) {
            if (rows == null || rows.isEmpty()) return confidence / 10;
            int ready = 0;
            for (TracerOcrRowDTO row : rows) {
                if (!row.isNeedsReview()) ready += 1;
            }
            return (ready * 12) + (rows.size() * 4) + (confidence / 6);
        }
    }

    private static class SerialParseResult {
        private final String serialNumber;
        private final boolean serialCorrected;

        private SerialParseResult(String serialNumber, boolean serialCorrected) {
            this.serialNumber = serialNumber;
            this.serialCorrected = serialCorrected;
        }

        private static SerialParseResult empty() {
            return new SerialParseResult(null, false);
        }
    }
}
