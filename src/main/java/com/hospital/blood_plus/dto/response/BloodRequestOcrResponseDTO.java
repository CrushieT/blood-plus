package com.hospital.blood_plus.dto.response;

import java.util.ArrayList;
import java.util.List;

public class BloodRequestOcrResponseDTO {
    private boolean success;
    private int confidence;
    private String rawText;
    private List<String> warnings = new ArrayList<>();
    private BloodRequestOcrFieldsDTO fields = new BloodRequestOcrFieldsDTO();

    public boolean isSuccess() {
        return success;
    }

    public void setSuccess(boolean success) {
        this.success = success;
    }

    public int getConfidence() {
        return confidence;
    }

    public void setConfidence(int confidence) {
        this.confidence = confidence;
    }

    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings != null ? warnings : new ArrayList<>();
    }

    public BloodRequestOcrFieldsDTO getFields() {
        return fields;
    }

    public void setFields(BloodRequestOcrFieldsDTO fields) {
        this.fields = fields != null ? fields : new BloodRequestOcrFieldsDTO();
    }
}
