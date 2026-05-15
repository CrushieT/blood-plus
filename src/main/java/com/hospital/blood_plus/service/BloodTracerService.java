package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.BloodTracerSaveDTO;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.BloodTracer;
import com.hospital.blood_plus.repository.BloodBagRequestRepository;
import com.hospital.blood_plus.repository.BloodTracerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BloodTracerService {

    private static final String SEP_COL = "|";
    private static final String SEP_ROW = "\n";

    private final BloodTracerRepository bloodTracerRepository;
    private final BloodBagRequestRepository bloodBagRequestRepository;

    public BloodTracerService(BloodTracerRepository bloodTracerRepository,
                              BloodBagRequestRepository bloodBagRequestRepository) {
        this.bloodTracerRepository = bloodTracerRepository;
        this.bloodBagRequestRepository = bloodBagRequestRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTracerData(Long requestId) {
        BloodTracer tracer = bloodTracerRepository.findByRequest_Id(requestId)
                .orElseThrow(() -> new IllegalArgumentException("No blood tracer found for request ID: " + requestId));
        return toResponse(tracer);
    }

    @Transactional
    public Map<String, Object> saveTracerData(Long requestId, BloodTracerSaveDTO dto, AppUser editedBy) {
        BloodBagRequest request = bloodBagRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("Blood request not found with ID: " + requestId));

        BloodTracer tracer = bloodTracerRepository.findByRequest_Id(requestId)
                .orElseGet(BloodTracer::new);

        tracer.setRequest(request);
        tracer.setBloodServiceFacility(normalizeOptionalText(dto.getBloodServiceFacility()));
        tracer.setPreparedBy(normalizeOptionalText(dto.getPreparedBy()));
        tracer.setReleasedBy(normalizeOptionalText(dto.getReleasedBy()));
        tracer.setDateReleased(normalizeOptionalText(dto.getDateReleased()));
        tracer.setTimeReleased(normalizeOptionalText(dto.getTimeReleased()));
        tracer.setTemperaturePriorTransport(normalizeOptionalText(dto.getTemperaturePriorTransport()));
        tracer.setTransportedBy(normalizeOptionalText(dto.getTransportedBy()));
        tracer.setBloodReceivedBy(normalizeOptionalText(dto.getBloodReceivedBy()));
        tracer.setDateReceived(normalizeOptionalText(dto.getDateReceived()));
        tracer.setTimeReceived(normalizeOptionalText(dto.getTimeReceived()));
        tracer.setTempUponReceipt(normalizeOptionalText(dto.getTempUponReceipt()));
        tracer.setTransportBoxTemp(normalizeOptionalText(dto.getTransportBoxTemp()));
        tracer.setTransactionNumber(normalizeOptionalText(dto.getTransactionNumber()));
        tracer.setQualityManager(normalizeOptionalText(dto.getQualityManager()));
        tracer.setReceivingOfficer(normalizeOptionalText(dto.getReceivingOfficer()));
        tracer.setPathologist(normalizeOptionalText(dto.getPathologist()));
        tracer.setCheckSignHemolysis(normalizeChecklistValue(dto.getCheckSignHemolysis()));
        tracer.setCheckBloodClots(normalizeChecklistValue(dto.getCheckBloodClots()));
        tracer.setCheckLeakageOnBag(normalizeChecklistValue(dto.getCheckLeakageOnBag()));
        tracer.setCheckBacterialContamination(normalizeChecklistValue(dto.getCheckBacterialContamination()));
        tracer.setCheckGreenishDiscoloration(normalizeChecklistValue(dto.getCheckGreenishDiscoloration()));
        tracer.setCheckIndirectCoolantContact(normalizeChecklistValue(dto.getCheckIndirectCoolantContact()));
        tracer.setCheckPlasmaNotFrozen(normalizeChecklistValue(dto.getCheckPlasmaNotFrozen()));
        tracer.setCheckCoolantsSufficientFrozen(normalizeChecklistValue(dto.getCheckCoolantsSufficientFrozen()));
        tracer.setRowsJson(serializeRows(dto.getRows()));
        tracer.setEditedBy(editedBy);

        BloodTracer saved = bloodTracerRepository.save(tracer);
        return toResponse(saved);
    }

    private Map<String, Object> toResponse(BloodTracer tracer) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", tracer.getId());
        response.put("requestId", tracer.getRequest().getId());
        response.put("bloodServiceFacility", tracer.getBloodServiceFacility());
        response.put("preparedBy", tracer.getPreparedBy());
        response.put("releasedBy", tracer.getReleasedBy());
        response.put("dateReleased", tracer.getDateReleased());
        response.put("timeReleased", tracer.getTimeReleased());
        response.put("temperaturePriorTransport", tracer.getTemperaturePriorTransport());
        response.put("transportedBy", tracer.getTransportedBy());
        response.put("bloodReceivedBy", tracer.getBloodReceivedBy());
        response.put("dateReceived", tracer.getDateReceived());
        response.put("timeReceived", tracer.getTimeReceived());
        response.put("tempUponReceipt", tracer.getTempUponReceipt());
        response.put("transportBoxTemp", tracer.getTransportBoxTemp());
        response.put("transactionNumber", tracer.getTransactionNumber());
        response.put("qualityManager", tracer.getQualityManager());
        response.put("receivingOfficer", tracer.getReceivingOfficer());
        response.put("pathologist", tracer.getPathologist());
        response.put("checkSignHemolysis", defaultChecklistValue(tracer.getCheckSignHemolysis()));
        response.put("checkBloodClots", defaultChecklistValue(tracer.getCheckBloodClots()));
        response.put("checkLeakageOnBag", defaultChecklistValue(tracer.getCheckLeakageOnBag()));
        response.put("checkBacterialContamination", defaultChecklistValue(tracer.getCheckBacterialContamination()));
        response.put("checkGreenishDiscoloration", defaultChecklistValue(tracer.getCheckGreenishDiscoloration()));
        response.put("checkIndirectCoolantContact", defaultChecklistValue(tracer.getCheckIndirectCoolantContact()));
        response.put("checkPlasmaNotFrozen", defaultChecklistValue(tracer.getCheckPlasmaNotFrozen()));
        response.put("checkCoolantsSufficientFrozen", defaultChecklistValue(tracer.getCheckCoolantsSufficientFrozen()));
        response.put("updatedAt", tracer.getUpdatedAt());
        response.put("createdAt", tracer.getCreatedAt());
        response.put("editedBy", tracer.getEditedBy() != null ? tracer.getEditedBy().getUsername() : null);
        response.put("rows", deserializeRows(tracer.getRowsJson()));
        return response;
    }

    private String serializeRows(List<BloodTracerSaveDTO.RowDTO> rows) {
        if (rows == null || rows.isEmpty()) return "";

        List<String> lines = new ArrayList<>();
        for (int i = 0; i < rows.size(); i++) {
            BloodTracerSaveDTO.RowDTO row = rows.get(i);
            int rowIndex = row.getRowIndex() != null ? row.getRowIndex() : i;
            List<String> cols = new ArrayList<>();
            cols.add(encodeValue(String.valueOf(rowIndex)));
            cols.add(encodeValue(row.getAboRh()));
            cols.add(encodeValue(row.getComponentReleased()));
            cols.add(encodeValue(row.getSerialNumber()));
            cols.add(encodeValue(row.getExtractionDate()));
            cols.add(encodeValue(row.getExpirationDate()));
            cols.add(encodeValue(row.getPatientName()));
            cols.add(encodeValue(row.getAddress()));
            cols.add(encodeValue(row.getAge()));
            cols.add(encodeValue(row.getSex()));
            cols.add(encodeValue(row.getWard()));
            cols.add(encodeValue(row.getRmNo()));
            cols.add(encodeValue(row.getIndicationCode()));
            cols.add(encodeValue(row.getTransfusionDate()));
            cols.add(encodeValue(row.getComp()));
            cols.add(encodeValue(row.getRxn()));
            cols.add(encodeValue(row.getRemarks()));
            lines.add(String.join(SEP_COL, cols));
        }
        return String.join(SEP_ROW, lines);
    }

    private List<Map<String, Object>> deserializeRows(String rowsJson) {
        List<Map<String, Object>> rows = new ArrayList<>();
        if (rowsJson == null || rowsJson.isBlank()) {
            return rows;
        }

        String[] lines = rowsJson.split("\\n", -1);
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            if (line.isBlank()) continue;

            String[] cols = line.split("\\|", -1);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("rowIndex", parseRowIndex(decodeValue(cols, 0), i));
            row.put("aboRh", decodeValue(cols, 1));
            row.put("componentReleased", decodeValue(cols, 2));
            row.put("serialNumber", decodeValue(cols, 3));
            row.put("extractionDate", decodeValue(cols, 4));
            row.put("expirationDate", decodeValue(cols, 5));
            row.put("patientName", decodeValue(cols, 6));
            row.put("address", decodeValue(cols, 7));
            row.put("age", decodeValue(cols, 8));
            row.put("sex", decodeValue(cols, 9));
            row.put("ward", decodeValue(cols, 10));
            row.put("rmNo", decodeValue(cols, 11));
            row.put("indicationCode", decodeValue(cols, 12));
            row.put("transfusionDate", decodeValue(cols, 13));
            row.put("comp", decodeValue(cols, 14));
            row.put("rxn", decodeValue(cols, 15));
            row.put("remarks", decodeValue(cols, 16));
            rows.add(row);
        }
        return rows;
    }

    private String encodeValue(String value) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) return "";
        return Base64.getEncoder().encodeToString(normalized.getBytes(StandardCharsets.UTF_8));
    }

    private String decodeValue(String[] cols, int index) {
        if (index >= cols.length || cols[index] == null || cols[index].isBlank()) {
            return null;
        }
        byte[] bytes = Base64.getDecoder().decode(cols[index]);
        String decoded = new String(bytes, StandardCharsets.UTF_8);
        return decoded.isBlank() ? null : decoded;
    }

    private Integer parseRowIndex(String value, int fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private String normalizeOptionalText(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private Boolean normalizeChecklistValue(Boolean value) {
        return value == null ? Boolean.TRUE : value;
    }

    private Boolean defaultChecklistValue(Boolean value) {
        return value == null ? Boolean.TRUE : value;
    }
}
