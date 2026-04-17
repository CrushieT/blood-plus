package com.hospital.blood_plus.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "blood_bags")
public class BloodBag {

    public enum BagStatus {
        AVAILABLE, CROSSMATCHED, DISPENSED, EXPIRED, DISCARDED
    }

    public enum BagSource {
        DONATION, WALK_IN, TRANSFER, EXTERNAL_SUPPLY
    }

    public enum ComponentType {
        WHOLE_BLOOD,
        PRBC,
        LEUKOREDUCED_PRBC,
        ALIQUOTED_PRBC,
        PLATELET_CONCENTRATE,
        FRESH_FROZEN_PLASMA,
        CRYOPRECIPITATE,
        CRYOSUPERNATANT
    }

    public enum RhType {
        POSITIVE, NEGATIVE
    }

    public enum BloodType {
        A_POS, A_NEG,
        B_POS, B_NEG,
        AB_POS, AB_NEG,
        O_POS, O_NEG
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Unique identifier for physical blood bag
    @Column(nullable = false, unique = true)
    private String serialNumber;

    // Internal tracking/reference number
    @Column
    private String transactionNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BloodType bloodType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RhType rhType = RhType.POSITIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ComponentType componentType = ComponentType.WHOLE_BLOOD;

    @Column(nullable = false)
    private Integer volumeMl;

    @Column(length = 500)
    private String remarks;

    @Column(nullable = false)
    private LocalDateTime collectedAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BagStatus status = BagStatus.AVAILABLE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BagSource source;

    @Column(length = 500)
    private String discardReason;

    // If processed into component for internal hospital use
    @Column(nullable = false)
    private boolean openSystem = false;

    @Column
    private LocalDateTime openSystemAt;

    // Staff who logged the blood bag into system
    @ManyToOne
    @JoinColumn(name = "received_by")
    private AppUser receivedBy;

    @OneToMany(mappedBy = "bloodBag", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<BloodBagDispatch> dispatches = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (expiresAt == null && collectedAt != null) {
            expiresAt = resolveExpiry(collectedAt);
        }
    }

    private LocalDateTime resolveExpiry(LocalDateTime from) {
        if (componentType == null) return from.plusDays(42);

        switch (componentType) {
            case WHOLE_BLOOD:
            case PRBC:
            case LEUKOREDUCED_PRBC:
            case ALIQUOTED_PRBC:
                return from.plusDays(42);

            case PLATELET_CONCENTRATE:
                return from.plusDays(5);

            case FRESH_FROZEN_PLASMA:
            case CRYOPRECIPITATE:
            case CRYOSUPERNATANT:
                return from.plusDays(365);

            default:
                return from.plusDays(42);
        }
    }

    public void convertToOpenSystem() {
        this.openSystem = true;
        this.openSystemAt = LocalDateTime.now();
        this.componentType = ComponentType.PRBC;
        this.expiresAt = this.openSystemAt.plusHours(24);
    }

    // ── Getters & Setters ─────────────────────────────────────

    public Long getId() { return id; }

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

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }

    public BagStatus getStatus() { return status; }
    public void setStatus(BagStatus status) { this.status = status; }

    public BagSource getSource() { return source; }
    public void setSource(BagSource source) { this.source = source; }

    public String getDiscardReason() { return discardReason; }
    public void setDiscardReason(String discardReason) { this.discardReason = discardReason; }

    public boolean isOpenSystem() { return openSystem; }
    public void setOpenSystem(boolean openSystem) { this.openSystem = openSystem; }

    public LocalDateTime getOpenSystemAt() { return openSystemAt; }
    public void setOpenSystemAt(LocalDateTime openSystemAt) { this.openSystemAt = openSystemAt; }

    public AppUser getReceivedBy() { return receivedBy; }
    public void setReceivedBy(AppUser receivedBy) { this.receivedBy = receivedBy; }

    public List<BloodBagDispatch> getDispatches() { return dispatches; }

    public LocalDateTime getCreatedAt() { return createdAt; }
}