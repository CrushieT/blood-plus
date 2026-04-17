package com.hospital.blood_plus.dto.request;

import com.hospital.blood_plus.model.BloodBag.BagSource;
import com.hospital.blood_plus.model.BloodBag.ComponentType;
import com.hospital.blood_plus.model.BloodBag.RhType;
import com.hospital.blood_plus.model.BloodBag.BloodType;

import java.time.LocalDateTime;
public class BloodBankIntakeRequest {

    private String aboType;      // "A", "B", "AB", "O" from frontend
    private RhType rhType;       // POSITIVE or NEGATIVE from frontend
    private String serialNumber;
    private String transactionNumber;
    private Integer volumeMl;
    private String remarks;
    private LocalDateTime collectedAt;
    private LocalDateTime expiresAt;
    private BagSource source;
    private ComponentType componentType;

    // Combine aboType + rhType → BloodType enum
    public BloodType resolveBloodType() {
        if (aboType == null || rhType == null) return null;

        String normalizedAboType = aboType.trim().toUpperCase();
        String suffix = rhType == RhType.POSITIVE ? "_POS" : "_NEG";

        try {
            return BloodType.valueOf(normalizedAboType + suffix);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid aboType. Expected one of: A, B, AB, O.");
        }
    }

    public String getAboType() { return aboType; }
    public void setAboType(String aboType) { this.aboType = aboType; }

    public RhType getRhType() { return rhType; }
    public void setRhType(RhType rhType) { this.rhType = rhType; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

    public String getTransactionNumber() { return transactionNumber; }
    public void setTransactionNumber(String transactionNumber) { this.transactionNumber = transactionNumber; }

    public Integer getVolumeMl() { return volumeMl; }
    public void setVolumeMl(Integer volumeMl) { this.volumeMl = volumeMl; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDateTime getCollectedAt() { return collectedAt; }
    public void setCollectedAt(LocalDateTime collectedAt) { this.collectedAt = collectedAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public BagSource getSource() { return source; }
    public void setSource(BagSource source) { this.source = source; }

    public ComponentType getComponentType() { return componentType; }
    public void setComponentType(ComponentType componentType) { this.componentType = componentType; }
}