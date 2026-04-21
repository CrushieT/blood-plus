package com.hospital.blood_plus.model;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "blood_bag_requests")
public class BloodBagRequest {

    // ─────────────────────────────────────────────
    // Enums
    // ─────────────────────────────────────────────

    public enum UrgencyLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public enum RequestStatus {
        PENDING, APPROVED, ALLOCATED, READY_FOR_RELEASE, RELEASED, REJECTED, CANCELLED
    }

    public enum RequesterType {
        HOSPITAL, ANONYMOUS
    }

    public enum AgeGroup {
        ADULT, PEDIA
    }

    public enum RequestCategory {
        INPATIENT, OUTPATIENT, HOSPITAL, EMERGENCY
    }

    public enum BloodComponent {
        WHOLE_BLOOD, PRBC, PLATELET, FFP, LEUKOREDUCED, ALIQUOT
    }

    // ─────────────────────────────────────────────
    // Core / Shared Fields
    // ─────────────────────────────────────────────

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "requested_by", nullable = true, foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT))
    private AppUser requestedBy;
    
    @ManyToOne
    @JoinColumn(name = "hospital_profile_id", nullable = true)
    private HospitalProfile hospitalProfile;
 
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequesterType requesterType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BloodBag.BloodType bloodType;

    @Column
    private Integer volumeMl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UrgencyLevel urgencyLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.PENDING;

    @Column(nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column
    private LocalDate  requiredBy;

    @Column(length = 1000)
    private String notes;

    @Column(length = 500)
    private String doctorsNoteUrl;

    @Column(length = 500)
    private String doctorsNoteKey;

    @ManyToOne
    @JoinColumn(name = "reviewed_by")
    private AppUser reviewedBy;

    @Column
    private LocalDateTime reviewedAt;

    @Column(length = 500)
    private String rejectionReason;

    @ManyToOne
    @JoinColumn(name = "fulfilled_by_bag_id")
    private BloodBag fulfilledByBag;

    // ─────────────────────────────────────────────
    // ANONYMOUS — Patient Information
    // ─────────────────────────────────────────────

    @Column(length = 200)
    private String patientName;

    @Column
    private Integer patientAge;

    @Column(length = 10)
    private String patientSex;

    @Column(length = 100)
    private String wardRoom;

    @Column(length = 100)
    private String requestingPhysician;

    // ─────────────────────────────────────────────
    // Patient Type & Category
    // ─────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private AgeGroup ageGroup;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RequestCategory requestCategory;

    // ─────────────────────────────────────────────
    // Blood Request Details
    // ─────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private BloodComponent bloodComponent;

    @Column
    private Integer numberOfUnits;

    // ─────────────────────────────────────────────
    // Contact / Requester Information
    // ─────────────────────────────────────────────

    @Column(length = 150)
    private String requesterName;

    @Column(length = 50)
    private String requesterRelationship;

    @Column(length = 20)
    private String requesterContact;

    @Column(length = 150)
    private String requesterEmail;

    // ─────────────────────────────────────────────
    // Reference Number
    // ─────────────────────────────────────────────

    @Column(length = 30, unique = true)
    private String referenceNumber;

    // ─────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        requestedAt = LocalDateTime.now();
    }

    // Getters & Setters 
    public Long getId() { return id; }

    public AppUser getRequestedBy() { return requestedBy; }
    public void setRequestedBy(AppUser requestedBy) { this.requestedBy = requestedBy; }

    public HospitalProfile getHospitalProfile() { return hospitalProfile; }
    public void setHospitalProfile(HospitalProfile hospitalProfile) { this.hospitalProfile = hospitalProfile; }


    public RequesterType getRequesterType() { return requesterType; }
    public void setRequesterType(RequesterType requesterType) { this.requesterType = requesterType; }

    public BloodBag.BloodType getBloodType() { return bloodType; }
    public void setBloodType(BloodBag.BloodType bloodType) { this.bloodType = bloodType; }

    public Integer getVolumeMl() { return volumeMl; }
    public void setVolumeMl(Integer volumeMl) { this.volumeMl = volumeMl; }

    public UrgencyLevel getUrgencyLevel() { return urgencyLevel; }
    public void setUrgencyLevel(UrgencyLevel urgencyLevel) { this.urgencyLevel = urgencyLevel; }

    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }

    public LocalDateTime getRequestedAt() { return requestedAt; }

    public LocalDate  getRequiredBy() { return requiredBy; }
    public void setRequiredBy(LocalDate   requiredBy) { this.requiredBy = requiredBy; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getDoctorsNoteUrl() { return doctorsNoteUrl; }
    public void setDoctorsNoteUrl(String doctorsNoteUrl) { this.doctorsNoteUrl = doctorsNoteUrl; }

    public String getDoctorsNoteKey() { return doctorsNoteKey; }
    public void setDoctorsNoteKey(String doctorsNoteKey) { this.doctorsNoteKey = doctorsNoteKey; }

    public AppUser getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(AppUser reviewedBy) { this.reviewedBy = reviewedBy; }

    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public BloodBag getFulfilledByBag() { return fulfilledByBag; }
    public void setFulfilledByBag(BloodBag fulfilledByBag) { this.fulfilledByBag = fulfilledByBag; }

    // ─────────────────────────────────────────────
    // Getters & Setters — ANONYMOUS Patient Info
    // ─────────────────────────────────────────────

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public Integer getPatientAge() { return patientAge; }
    public void setPatientAge(Integer patientAge) { this.patientAge = patientAge; }

    public String getPatientSex() { return patientSex; }
    public void setPatientSex(String patientSex) { this.patientSex = patientSex; }

    public String getWardRoom() { return wardRoom; }
    public void setWardRoom(String wardRoom) { this.wardRoom = wardRoom; }

    public String getRequestingPhysician() { return requestingPhysician; }
    public void setRequestingPhysician(String requestingPhysician) { this.requestingPhysician = requestingPhysician; }

    // ─────────────────────────────────────────────
    // Getters & Setters — ANONYMOUS Patient Type & Category
    // ─────────────────────────────────────────────

    public AgeGroup getAgeGroup() { return ageGroup; }
    public void setAgeGroup(AgeGroup ageGroup) { this.ageGroup = ageGroup; }

    public RequestCategory getRequestCategory() { return requestCategory; }
    public void setRequestCategory(RequestCategory requestCategory) { this.requestCategory = requestCategory; }

    // ─────────────────────────────────────────────
    // Getters & Setters — ANONYMOUS Blood Details
    // ─────────────────────────────────────────────

    public BloodComponent getBloodComponent() { return bloodComponent; }
    public void setBloodComponent(BloodComponent bloodComponent) { this.bloodComponent = bloodComponent; }

    public Integer getNumberOfUnits() { return numberOfUnits; }
    public void setNumberOfUnits(Integer numberOfUnits) { this.numberOfUnits = numberOfUnits; }

    // ─────────────────────────────────────────────
    // Getters & Setters — ANONYMOUS Contact Info
    // ─────────────────────────────────────────────

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getRequesterRelationship() { return requesterRelationship; }
    public void setRequesterRelationship(String requesterRelationship) { this.requesterRelationship = requesterRelationship; }

    public String getRequesterContact() { return requesterContact; }
    public void setRequesterContact(String requesterContact) { this.requesterContact = requesterContact; }

    public String getRequesterEmail() { return requesterEmail; }
    public void setRequesterEmail(String requesterEmail) { this.requesterEmail = requesterEmail; }

    // ─────────────────────────────────────────────
    // Getters & Setters — Reference Number
    // ─────────────────────────────────────────────

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
}