package com.hospital.blood_plus.dto.request;

import com.hospital.blood_plus.model.BloodBagRequest.RequestStatus;
import java.time.LocalDateTime;

/**
 * DTO for transferring RequestStatusLog data to the client.
 * Includes formatted dates and user information.
 */
public class RequestStatusLogDTO {

    private Long id;
    private Long requestId;
    private String referenceNumber;
    private RequestStatus oldStatus;
    private RequestStatus newStatus;
    private String changedByEmail;
    private String changedByFullName;
    private LocalDateTime changedAt;
    private String notes;
    private String formattedDate;

    // ─────────────────────────────────────
    // Constructors
    // ─────────────────────────────────────

    public RequestStatusLogDTO() {
    }

    public RequestStatusLogDTO(Long id, Long requestId, String referenceNumber,
                              RequestStatus oldStatus, RequestStatus newStatus,
                              String changedByEmail, String changedByFullName,
                              LocalDateTime changedAt, String notes) {
        this.id = id;
        this.requestId = requestId;
        this.referenceNumber = referenceNumber;
        this.oldStatus = oldStatus;
        this.newStatus = newStatus;
        this.changedByEmail = changedByEmail;
        this.changedByFullName = changedByFullName;
        this.changedAt = changedAt;
        this.notes = notes;
        this.formattedDate = formatDate(changedAt);
    }

    // ─────────────────────────────────────
    // Getters & Setters
    // ─────────────────────────────────────

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public RequestStatus getOldStatus() {
        return oldStatus;
    }

    public void setOldStatus(RequestStatus oldStatus) {
        this.oldStatus = oldStatus;
    }

    public RequestStatus getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(RequestStatus newStatus) {
        this.newStatus = newStatus;
    }

    public String getChangedByEmail() {
        return changedByEmail;
    }

    public void setChangedByEmail(String changedByEmail) {
        this.changedByEmail = changedByEmail;
    }

    public String getChangedByFullName() {
        return changedByFullName;
    }

    public void setChangedByFullName(String changedByFullName) {
        this.changedByFullName = changedByFullName;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public void setChangedAt(LocalDateTime changedAt) {
        this.changedAt = changedAt;
        this.formattedDate = formatDate(changedAt);
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getFormattedDate() {
        return formattedDate;
    }

    public void setFormattedDate(String formattedDate) {
        this.formattedDate = formattedDate;
    }

    // ─────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────

    /**
     * Formats a LocalDateTime to a readable string.
     * Format: "MMM dd, yyyy HH:mm:ss" (e.g., "Jan 15, 2024 14:30:45")
     */
    private static String formatDate(LocalDateTime dateTime) {
        if (dateTime == null) {
            return null;
        }
        return dateTime.format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm:ss"));
    }

    @Override
    public String toString() {
        return "RequestStatusLogDTO{" +
                "id=" + id +
                ", requestId=" + requestId +
                ", referenceNumber='" + referenceNumber + '\'' +
                ", oldStatus=" + oldStatus +
                ", newStatus=" + newStatus +
                ", changedByEmail='" + changedByEmail + '\'' +
                ", changedByFullName='" + changedByFullName + '\'' +
                ", changedAt=" + changedAt +
                ", notes='" + notes + '\'' +
                '}';
    }
}