package com.hospital.blood_plus.dto.response;

import com.hospital.blood_plus.model.BloodBag.BagSource;
import com.hospital.blood_plus.model.BloodBag.BagStatus;
import com.hospital.blood_plus.model.BloodBag.ComponentType;
import com.hospital.blood_plus.model.BloodBag.RhType;
import com.hospital.blood_plus.model.BloodBag.BloodType;

import java.time.LocalDateTime;

public class BloodBagResponse {

    private Long id;
    private String serialNumber;
    private String transactionNumber;
    private BloodType bloodType;
    private RhType rhType;
    private ComponentType componentType;
    private Integer volumeMl;
    private String remarks;
    private LocalDateTime collectedAt;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private BagStatus status;
    private BagSource source;
    private boolean openSystem;
    private LocalDateTime openSystemAt;
    private String receivedBy;
    private String discardReason;
    private String dispensedTo;
    private LocalDateTime dispensedAt;
    private String eventName;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

    public String getTransactionNumber() { return transactionNumber; }
    public void setTransactionNumber(String transactionNumber) { this.transactionNumber = transactionNumber; }

    public BloodType getBloodType() { return bloodType; }
    public void setBloodType(BloodType bloodType) { this.bloodType = bloodType; }

    public RhType getRhType() { return rhType; }
    public void setRhType(RhType rhType) { this.rhType = rhType; }

    public ComponentType getComponentType() { return componentType; }
    public void setComponentType(ComponentType componentType) { this.componentType = componentType; }

    public Integer getVolumeMl() { return volumeMl; }
    public void setVolumeMl(Integer volumeMl) { this.volumeMl = volumeMl; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public LocalDateTime getCollectedAt() { return collectedAt; }
    public void setCollectedAt(LocalDateTime collectedAt) { this.collectedAt = collectedAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public BagStatus getStatus() { return status; }
    public void setStatus(BagStatus status) { this.status = status; }

    public BagSource getSource() { return source; }
    public void setSource(BagSource source) { this.source = source; }

    public boolean isOpenSystem() { return openSystem; }
    public void setOpenSystem(boolean openSystem) { this.openSystem = openSystem; }

    public LocalDateTime getOpenSystemAt() { return openSystemAt; }
    public void setOpenSystemAt(LocalDateTime openSystemAt) { this.openSystemAt = openSystemAt; }

    public String getReceivedBy() { return receivedBy; }
    public void setReceivedBy(String receivedBy) { this.receivedBy = receivedBy; }

    public String getDiscardReason() { return discardReason; }
    public void setDiscardReason(String discardReason) { this.discardReason = discardReason; }

    public String getDispensedTo() { return dispensedTo; }
    public void setDispensedTo(String dispensedTo) { this.dispensedTo = dispensedTo; }

    public LocalDateTime getDispensedAt() { return dispensedAt; }
    public void setDispensedAt(LocalDateTime dispensedAt) { this.dispensedAt = dispensedAt; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }
}
