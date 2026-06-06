package com.hospital.blood_plus.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "request_status_logs")
public class RequestStatusLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private BloodBagRequest request;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BloodBagRequest.RequestStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BloodBagRequest.RequestStatus newStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by", nullable = true)
    private AppUser changedBy;

    @Column(nullable = false)
    private LocalDateTime changedAt;

    @Column(length = 500)
    private String notes;

    @PrePersist
    protected void onCreate() {
        changedAt = LocalDateTime.now();
    }

    // ─────────────────────────────────────────────
    // Getters & Setters
    // ─────────────────────────────────────────────

    public Long getId() {
        return id;
    }

    public BloodBagRequest getRequest() {
        return request;
    }

    public void setRequest(BloodBagRequest request) {
        this.request = request;
    }

    public BloodBagRequest.RequestStatus getOldStatus() {
        return oldStatus;
    }

    public void setOldStatus(BloodBagRequest.RequestStatus oldStatus) {
        this.oldStatus = oldStatus;
    }

    public BloodBagRequest.RequestStatus getNewStatus() {
        return newStatus;
    }

    public void setNewStatus(BloodBagRequest.RequestStatus newStatus) {
        this.newStatus = newStatus;
    }

    public AppUser getChangedBy() {
        return changedBy;
    }

    public void setChangedBy(AppUser changedBy) {
        this.changedBy = changedBy;
    }

    public LocalDateTime getChangedAt() {
        return changedAt;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
