package com.hospital.blood_plus.dto.response;

import java.time.LocalDateTime;

public class FulfillmentExportRowDTO {
    private Long fulfillmentId;
    private Long requestId;
    private String referenceNumber;
    private Long bloodBagId;
    private String serialNumber;
    private String bloodType;
    private String componentType;
    private Integer volumeMl;
    private LocalDateTime fulfilledAt;
    private String fulfilledByUsername;
    private String notes;

    public Long getFulfillmentId() {
        return fulfillmentId;
    }

    public void setFulfillmentId(Long fulfillmentId) {
        this.fulfillmentId = fulfillmentId;
    }

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public String getReferenceNumber() {
        return referenceNumber;
    }

    public void setReferenceNumber(String referenceNumber) {
        this.referenceNumber = referenceNumber;
    }

    public Long getBloodBagId() {
        return bloodBagId;
    }

    public void setBloodBagId(Long bloodBagId) {
        this.bloodBagId = bloodBagId;
    }

    public String getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public String getBloodType() {
        return bloodType;
    }

    public void setBloodType(String bloodType) {
        this.bloodType = bloodType;
    }

    public String getComponentType() {
        return componentType;
    }

    public void setComponentType(String componentType) {
        this.componentType = componentType;
    }

    public Integer getVolumeMl() {
        return volumeMl;
    }

    public void setVolumeMl(Integer volumeMl) {
        this.volumeMl = volumeMl;
    }

    public LocalDateTime getFulfilledAt() {
        return fulfilledAt;
    }

    public void setFulfilledAt(LocalDateTime fulfilledAt) {
        this.fulfilledAt = fulfilledAt;
    }

    public String getFulfilledByUsername() {
        return fulfilledByUsername;
    }

    public void setFulfilledByUsername(String fulfilledByUsername) {
        this.fulfilledByUsername = fulfilledByUsername;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
