package com.hospital.blood_plus.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "request_fulfillments")
public class RequestFulfillment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private BloodBagRequest request;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blood_bag_id", nullable = false)
    private BloodBag bloodBag;

    @Column(nullable = false)
    private LocalDateTime fulfilledAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fulfilled_by", nullable = false)
    private AppUser fulfilledBy;

    @Column(length = 500)
    private String notes;

    @PrePersist
    protected void onCreate() {
        fulfilledAt = LocalDateTime.now();
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

    public BloodBag getBloodBag() {
        return bloodBag;
    }

    public void setBloodBag(BloodBag bloodBag) {
        this.bloodBag = bloodBag;
    }

    public LocalDateTime getFulfilledAt() {
        return fulfilledAt;
    }

    public AppUser getFulfilledBy() {
        return fulfilledBy;
    }

    public void setFulfilledBy(AppUser fulfilledBy) {
        this.fulfilledBy = fulfilledBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}