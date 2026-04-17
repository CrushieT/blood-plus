package com.hospital.blood_plus.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "blood_bag_dispatches")
public class BloodBagDispatch {

    public enum DispatchType {
        USED, DISCARDED, TRANSFERRED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "blood_bag_id", nullable = false)
    private BloodBag bloodBag;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DispatchType dispatchType;

    @Column(nullable = false)
    private LocalDateTime dispatchedAt;

    @ManyToOne
    @JoinColumn(name = "dispatched_by")
    private AppUser dispatchedBy;

    @Column(length = 500)
    private String notes;

    // nullable — only filled when dispatchType = USED
    @Column
    private String dispensedTo;

    @PrePersist
    protected void onCreate() {
        dispatchedAt = LocalDateTime.now();
    }

    // getters & setters
    public Long getId() { return id; }

    public BloodBag getBloodBag() { return bloodBag; }
    public void setBloodBag(BloodBag bloodBag) { this.bloodBag = bloodBag; }

    public DispatchType getDispatchType() { return dispatchType; }
    public void setDispatchType(DispatchType dispatchType) { this.dispatchType = dispatchType; }

    public LocalDateTime getDispatchedAt() { return dispatchedAt; }

    public AppUser getDispatchedBy() { return dispatchedBy; }
    public void setDispatchedBy(AppUser dispatchedBy) { this.dispatchedBy = dispatchedBy; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getDispensedTo() { return dispensedTo; }
    public void setDispensedTo(String dispensedTo) { this.dispensedTo = dispensedTo; }
}