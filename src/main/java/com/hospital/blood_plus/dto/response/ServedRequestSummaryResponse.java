package com.hospital.blood_plus.dto.response;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class ServedRequestSummaryResponse {
    private Long requestId;
    private String referenceNumber;
    private String patientName;
    private String requesterType;
    private String requestCategory;
    private String hospitalName;
    private String wardRoom;
    private String bloodType;
    private String bloodComponent;
    private Integer requestedUnits;
    private Integer approvedUnits;
    private Integer servedUnits;
    private Integer unservedUnits;
    private String result;
    private LocalDateTime lastServedAt;
    private String unservedReason;
    private List<ServedBagDetailResponse> servedBags = new ArrayList<>();

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

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public String getRequesterType() {
        return requesterType;
    }

    public void setRequesterType(String requesterType) {
        this.requesterType = requesterType;
    }

    public String getHospitalName() {
        return hospitalName;
    }

    public void setHospitalName(String hospitalName) {
        this.hospitalName = hospitalName;
    }

    public String getRequestCategory() {
        return requestCategory;
    }

    public void setRequestCategory(String requestCategory) {
        this.requestCategory = requestCategory;
    }

    public String getWardRoom() {
        return wardRoom;
    }

    public void setWardRoom(String wardRoom) {
        this.wardRoom = wardRoom;
    }

    public String getBloodType() {
        return bloodType;
    }

    public void setBloodType(String bloodType) {
        this.bloodType = bloodType;
    }

    public String getBloodComponent() {
        return bloodComponent;
    }

    public void setBloodComponent(String bloodComponent) {
        this.bloodComponent = bloodComponent;
    }

    public Integer getRequestedUnits() {
        return requestedUnits;
    }

    public void setRequestedUnits(Integer requestedUnits) {
        this.requestedUnits = requestedUnits;
    }

    public Integer getApprovedUnits() {
        return approvedUnits;
    }

    public void setApprovedUnits(Integer approvedUnits) {
        this.approvedUnits = approvedUnits;
    }

    public Integer getServedUnits() {
        return servedUnits;
    }

    public void setServedUnits(Integer servedUnits) {
        this.servedUnits = servedUnits;
    }

    public Integer getUnservedUnits() {
        return unservedUnits;
    }

    public void setUnservedUnits(Integer unservedUnits) {
        this.unservedUnits = unservedUnits;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public LocalDateTime getLastServedAt() {
        return lastServedAt;
    }

    public void setLastServedAt(LocalDateTime lastServedAt) {
        this.lastServedAt = lastServedAt;
    }

    public String getUnservedReason() {
        return unservedReason;
    }

    public void setUnservedReason(String unservedReason) {
        this.unservedReason = unservedReason;
    }

    public List<ServedBagDetailResponse> getServedBags() {
        return servedBags;
    }

    public void setServedBags(List<ServedBagDetailResponse> servedBags) {
        this.servedBags = servedBags;
    }
}
