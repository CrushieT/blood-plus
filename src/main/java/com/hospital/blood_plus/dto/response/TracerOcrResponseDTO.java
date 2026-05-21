package com.hospital.blood_plus.dto.response;

import java.util.ArrayList;
import java.util.List;

public class TracerOcrResponseDTO {
    private String transactionNumber;
    private List<TracerOcrRowDTO> rows = new ArrayList<>();
    private String rawText;
    private Integer confidence;
    private List<String> warnings = new ArrayList<>();

    public String getTransactionNumber() {
        return transactionNumber;
    }

    public void setTransactionNumber(String transactionNumber) {
        this.transactionNumber = transactionNumber;
    }

    public List<TracerOcrRowDTO> getRows() {
        return rows;
    }

    public void setRows(List<TracerOcrRowDTO> rows) {
        this.rows = rows != null ? rows : new ArrayList<>();
    }

    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }

    public Integer getConfidence() {
        return confidence;
    }

    public void setConfidence(Integer confidence) {
        this.confidence = confidence;
    }

    public List<String> getWarnings() {
        return warnings;
    }

    public void setWarnings(List<String> warnings) {
        this.warnings = warnings != null ? warnings : new ArrayList<>();
    }
}
