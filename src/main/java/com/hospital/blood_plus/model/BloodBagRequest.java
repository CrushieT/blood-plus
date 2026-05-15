package com.hospital.blood_plus.model;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.hospital.blood_plus.model.BloodBag.ComponentType;

@Entity
@Table(
    name = "blood_bag_requests",
    indexes = {
        @Index(
            name = "idx_blood_bag_requests_confirmation_token",
            columnList = "confirmation_token"
        )
    }
)
public class BloodBagRequest {

    // ─────────────────────────────────────────────
    // Enums
    // ─────────────────────────────────────────────
    public enum UrgencyLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }
    public enum RequestStatus {
        PENDING,
        APPROVED,
        NEEDS_CONFIRMATION,
        ALLOCATED,
        READY_FOR_RELEASE,
        RELEASED,
        REJECTED,
        CANCELLED
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

    public enum RequestType {
        STAT, ROUTINE
    }

    // ─────────────────────────────────────────────
    // Core / Shared Fields (EXISTING)
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
    private LocalDate requiredBy;

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

    @Column(name = "approved_units")
    private Integer approvedUnits;

    @Column(name = "approval_remarks", length = 1000)
    private String approvalRemarks;

    @Column(name = "alternative_component_suggestion", length = 500)
    private String alternativeComponentSuggestion;

    @Column(name = "patient_accepted_remarks")
    private Boolean patientAcceptedRemarks;

    @Column(name = "patient_responded_at")
    private LocalDateTime patientRespondedAt;

    @Column(name = "unserved_reason", length = 1000)
    private String unservedReason;

    @Column(name = "confirmation_token", length = 255)
    private String confirmationToken;

    @Column(name = "confirmation_token_expires_at")
    private LocalDateTime confirmationTokenExpiresAt;

    @Column(name = "confirmation_email_sent_at")
    private LocalDateTime confirmationEmailSentAt;

    @Column(name = "allocated_bag_ids", length = 500)
    private String allocatedBagIds;

    @ManyToOne
    @JoinColumn(name = "fulfilled_by_bag_id")
    private BloodBag fulfilledByBag;

    @Transient
    private List<BloodBag> reservedBags;

    // ─────────────────────────────────────────────
    // ANONYMOUS — Patient Information (EXISTING)
    // ─────────────────────────────────────────────

    @Column(length = 200)
    private String patientName;

    @Column(length = 200)
    private String patientMiddle;

    @Column(length = 200)
    private String patientLast;

    @Column(length = 20)
    private String patientSuffix;

    @Column
    private Integer patientAge;

    @Column(length = 10)
    private String patientSex;

    @Column
    private LocalDate patientBirthdate;

    @Column(length = 100)
    private String wardRoom;

    @Column(length = 100)
    private String roomNo;

    @Column(length = 120)
    private String patientPurok;

    @Column(length = 120)
    private String patientBarangay;

    @Column(length = 120)
    private String patientMunicipality;

    @Column(length = 120)
    private String patientProvince;

    @Column(length = 100)
    private String requestingPhysician;

    // ─────────────────────────────────────────────
    // Patient Type & Category (EXISTING)
    // ─────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private AgeGroup ageGroup;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RequestCategory requestCategory;

    // ─────────────────────────────────────────────
    // Blood Request Details (EXISTING)
    // ─────────────────────────────────────────────

    @Enumerated(EnumType.STRING)
    @Column
    private ComponentType bloodComponent;

    @Column
    private Integer numberOfUnits;

    @Column
    private Integer plateletCount;

    // ─────────────────────────────────────────────
    // Contact / Requester Information (EXISTING)
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
    // Reference Number (EXISTING)
    // ─────────────────────────────────────────────

    @Column(length = 30, unique = true)
    private String referenceNumber;

    // ═════════════════════════════════════════════════════════════
    // NEW FIELDS — FROM PDF FORMS (WITH BETTER STRUCTURE)
    // ═════════════════════════════════════════════════════════════

    // ─────────────────────────────────────────────
    // CLINICAL INFORMATION
    // ─────────────────────────────────────────────

    @Column(length = 200)
    private String clinicalImpression;  // From "CLINICAL IMPRESSION / DIAGNOSIS"

    @Column(length = 200)
    private String attendingPhysician;  // From "ATTENDING PHYSICIAN"

    @Column(length = 20)
    private String contactNumber;  // From "CONTACT NUM."

    @Column
    private Double hemoglobin;  // (g/L)

    @Column
    private Double hematocrit;  // (decimal: 0.30 = 30%)

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RequestType requestType;  // STAT or ROUTINE — PRIMARY URGENCY INDICATOR

    // ─────────────────────────────────────────────
    // TRANSFUSION HISTORY (STRUCTURED)
    // ─────────────────────────────────────────────

    @Column
    private Boolean hadPreviousTransfusion;  // YES/NO from checkbox

    @Column
    private LocalDate previousTransfusionDate;  // When last transfused

    @Column
    private Integer previousTransfusionUnits;  // How many units

    // Legacy field (still supported for backward compatibility)
    @Column(length = 500)
    private String previousTransfusionHistory;  // Pipe-separated: "YES|2026-04-01|1"

    // ─────────────────────────────────────────────
    // REACTION HISTORY (STRUCTURED)
    // ─────────────────────────────────────────────

    @Column
    private Boolean hadPreviousReaction;  // YES/NO from checkbox

    @Column
    private LocalDate previousReactionDate;  // When reaction occurred

    @Column(length = 500)
    private String previousReactionDetails;  // Type of reaction

    // Legacy field (still supported for backward compatibility)
    @Column(length = 500)
    private String previousReactionHistory;  // Pipe-separated: "YES|2026-04-01|Mild fever"

    // ─────────────────────────────────────────────
    // INDICATIONS FOR TRANSFUSION
    // ─────────────────────────────────────────────

    @Column(length = 500)
    private String indication;  // Comma-separated codes: "F-1,F-2,F-3"

    // ─────────────────────────────────────────────
    // INDICATIONS "OTHER (SPECIFY)" TRACKING
    // ─────────────────────────────────────────────
    // Store the specify text for each "Other" indication
    // Format: "WB-2:reason1,R-5:reason2,P-6:reason3" (code:text pairs)
    @Column(length = 1000)
    private String indicationOtherSpecify;

    // ─────────────────────────────────────────────
    // OTHER BLOOD COMPONENT (if component = OTHER)
    // ─────────────────────────────────────────────

    @Column(length = 200)
    private String otherComponentName;  // e.g., "Albumin", "Immunoglobulin"

    @Column(length = 500)
    private String otherComponentIndication;  // Indication text for OTHER component

    // ─────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        requestedAt = LocalDateTime.now();
    }

    // ─────────────────────────────────────────────
    // Getters & Setters (EXISTING)
    // ─────────────────────────────────────────────

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

    public LocalDate getRequiredBy() { return requiredBy; }
    public void setRequiredBy(LocalDate requiredBy) { this.requiredBy = requiredBy; }

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

    public Integer getApprovedUnits() { return approvedUnits; }
    public void setApprovedUnits(Integer approvedUnits) { this.approvedUnits = approvedUnits; }

    public String getApprovalRemarks() { return approvalRemarks; }
    public void setApprovalRemarks(String approvalRemarks) { this.approvalRemarks = approvalRemarks; }

    public String getAlternativeComponentSuggestion() { return alternativeComponentSuggestion; }
    public void setAlternativeComponentSuggestion(String alternativeComponentSuggestion) {
        this.alternativeComponentSuggestion = alternativeComponentSuggestion;
    }

    public Boolean getPatientAcceptedRemarks() { return patientAcceptedRemarks; }
    public void setPatientAcceptedRemarks(Boolean patientAcceptedRemarks) {
        this.patientAcceptedRemarks = patientAcceptedRemarks;
    }

    public LocalDateTime getPatientRespondedAt() { return patientRespondedAt; }
    public void setPatientRespondedAt(LocalDateTime patientRespondedAt) {
        this.patientRespondedAt = patientRespondedAt;
    }

    public String getUnservedReason() { return unservedReason; }
    public void setUnservedReason(String unservedReason) { this.unservedReason = unservedReason; }

    public String getConfirmationToken() { return confirmationToken; }
    public void setConfirmationToken(String confirmationToken) { this.confirmationToken = confirmationToken; }

    public LocalDateTime getConfirmationTokenExpiresAt() { return confirmationTokenExpiresAt; }
    public void setConfirmationTokenExpiresAt(LocalDateTime confirmationTokenExpiresAt) {
        this.confirmationTokenExpiresAt = confirmationTokenExpiresAt;
    }

    public LocalDateTime getConfirmationEmailSentAt() { return confirmationEmailSentAt; }
    public void setConfirmationEmailSentAt(LocalDateTime confirmationEmailSentAt) {
        this.confirmationEmailSentAt = confirmationEmailSentAt;
    }

    public String getAllocatedBagIds() { return allocatedBagIds; }
    public void setAllocatedBagIds(String allocatedBagIds) { this.allocatedBagIds = allocatedBagIds; }

    public BloodBag getFulfilledByBag() { return fulfilledByBag; }
    public void setFulfilledByBag(BloodBag fulfilledByBag) { this.fulfilledByBag = fulfilledByBag; }

    public List<BloodBag> getReservedBags() { return reservedBags; }
    public void setReservedBags(List<BloodBag> reservedBags) { this.reservedBags = reservedBags; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPatientMiddle() { return patientMiddle; }
    public void setPatientMiddle(String patientMiddle) { this.patientMiddle = patientMiddle; }

    public String getPatientLast() { return patientLast; }
    public void setPatientLast(String patientLast) { this.patientLast = patientLast; }
    
    public String getPatientSuffix() { return patientSuffix; }
    public void setPatientSuffix(String patientSuffix) { this.patientSuffix = patientSuffix; }

    public Integer getPatientAge() { return patientAge; }
    public void setPatientAge(Integer patientAge) { this.patientAge = patientAge; }

    public String getPatientSex() { return patientSex; }
    public void setPatientSex(String patientSex) { this.patientSex = patientSex; }

    public LocalDate getPatientBirthdate() { return patientBirthdate; }
    public void setPatientBirthdate(LocalDate patientBirthdate) { this.patientBirthdate = patientBirthdate; }

    public String getWardRoom() { return wardRoom; }
    public void setWardRoom(String wardRoom) { this.wardRoom = wardRoom; }

    public String getRoomNo() { return roomNo; }
    public void setRoomNo(String roomNo) { this.roomNo = roomNo; }

    public String getPatientPurok() { return patientPurok; }
    public void setPatientPurok(String patientPurok) { this.patientPurok = patientPurok; }

    public String getPatientBarangay() { return patientBarangay; }
    public void setPatientBarangay(String patientBarangay) { this.patientBarangay = patientBarangay; }

    public String getPatientMunicipality() { return patientMunicipality; }
    public void setPatientMunicipality(String patientMunicipality) { this.patientMunicipality = patientMunicipality; }

    public String getPatientProvince() { return patientProvince; }
    public void setPatientProvince(String patientProvince) { this.patientProvince = patientProvince; }

    public String getRequestingPhysician() { return requestingPhysician; }
    public void setRequestingPhysician(String requestingPhysician) { this.requestingPhysician = requestingPhysician; }

    public AgeGroup getAgeGroup() { return ageGroup; }
    public void setAgeGroup(AgeGroup ageGroup) { this.ageGroup = ageGroup; }

    public RequestCategory getRequestCategory() { return requestCategory; }
    public void setRequestCategory(RequestCategory requestCategory) { this.requestCategory = requestCategory; }

    public ComponentType getBloodComponent() { return bloodComponent; }
    public void setBloodComponent(ComponentType bloodComponent) { this.bloodComponent = bloodComponent; }

    public Integer getNumberOfUnits() { return numberOfUnits; }
    public void setNumberOfUnits(Integer numberOfUnits) { this.numberOfUnits = numberOfUnits; }

    public Integer getPlateletCount() { return plateletCount; }
    public void setPlateletCount(Integer plateletCount) { this.plateletCount = plateletCount; }

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getRequesterRelationship() { return requesterRelationship; }
    public void setRequesterRelationship(String requesterRelationship) { this.requesterRelationship = requesterRelationship; }

    public String getRequesterContact() { return requesterContact; }
    public void setRequesterContact(String requesterContact) { this.requesterContact = requesterContact; }

    public String getRequesterEmail() { return requesterEmail; }
    public void setRequesterEmail(String requesterEmail) { this.requesterEmail = requesterEmail; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    // ─────────────────────────────────────────────
    // Getters & Setters — NEW PDF FIELDS
    // ─────────────────────────────────────────────

    public String getClinicalImpression() { return clinicalImpression; }
    public void setClinicalImpression(String clinicalImpression) { this.clinicalImpression = clinicalImpression; }

    public String getAttendingPhysician() { return attendingPhysician; }
    public void setAttendingPhysician(String attendingPhysician) { this.attendingPhysician = attendingPhysician; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public Double getHemoglobin() { return hemoglobin; }
    public void setHemoglobin(Double hemoglobin) { this.hemoglobin = hemoglobin; }

    public Double getHematocrit() { return hematocrit; }
    public void setHematocrit(Double hematocrit) { this.hematocrit = hematocrit; }

    public RequestType getRequestType() { return requestType; }
    public void setRequestType(RequestType requestType) { this.requestType = requestType; }

    // ─────────────────────────────────────────────
    // TRANSFUSION HISTORY — NEW STRUCTURED FIELDS
    // ─────────────────────────────────────────────

    public Boolean getHadPreviousTransfusion() { return hadPreviousTransfusion; }
    public void setHadPreviousTransfusion(Boolean hadPreviousTransfusion) { this.hadPreviousTransfusion = hadPreviousTransfusion; }

    public LocalDate getPreviousTransfusionDate() { return previousTransfusionDate; }
    public void setPreviousTransfusionDate(LocalDate previousTransfusionDate) { this.previousTransfusionDate = previousTransfusionDate; }

    public Integer getPreviousTransfusionUnits() { return previousTransfusionUnits; }
    public void setPreviousTransfusionUnits(Integer previousTransfusionUnits) { this.previousTransfusionUnits = previousTransfusionUnits; }

    public String getPreviousTransfusionHistory() { return previousTransfusionHistory; }
    public void setPreviousTransfusionHistory(String previousTransfusionHistory) { this.previousTransfusionHistory = previousTransfusionHistory; }

    // ─────────────────────────────────────────────
    // REACTION HISTORY — NEW STRUCTURED FIELDS
    // ─────────────────────────────────────────────

    public Boolean getHadPreviousReaction() { return hadPreviousReaction; }
    public void setHadPreviousReaction(Boolean hadPreviousReaction) { this.hadPreviousReaction = hadPreviousReaction; }

    public LocalDate getPreviousReactionDate() { return previousReactionDate; }
    public void setPreviousReactionDate(LocalDate previousReactionDate) { this.previousReactionDate = previousReactionDate; }

    public String getPreviousReactionDetails() { return previousReactionDetails; }
    public void setPreviousReactionDetails(String previousReactionDetails) { this.previousReactionDetails = previousReactionDetails; }

    public String getPreviousReactionHistory() { return previousReactionHistory; }
    public void setPreviousReactionHistory(String previousReactionHistory) { this.previousReactionHistory = previousReactionHistory; }

    // ─────────────────────────────────────────────
    // INDICATIONS
    // ─────────────────────────────────────────────

    public String getIndication() { return indication; }
    public void setIndication(String indication) { this.indication = indication; }

    // ─────────────────────────────────────────────
    // INDICATIONS "OTHER (SPECIFY)" 
    // ─────────────────────────────────────────────

    public String getIndicationOtherSpecify() { return indicationOtherSpecify; }
    public void setIndicationOtherSpecify(String indicationOtherSpecify) { this.indicationOtherSpecify = indicationOtherSpecify; }

    // ─────────────────────────────────────────────
    // OTHER BLOOD COMPONENT 
    // ─────────────────────────────────────────────

    public String getOtherComponentName() { return otherComponentName; }
    public void setOtherComponentName(String otherComponentName) { this.otherComponentName = otherComponentName; }

    public String getOtherComponentIndication() { return otherComponentIndication; }
    public void setOtherComponentIndication(String otherComponentIndication) { this.otherComponentIndication = otherComponentIndication; }

    // ─────────────────────────────────────────────
    // HELPER METHOD — Format transfusion history for display
    // ─────────────────────────────────────────────

    public String formatTransfusionHistory() {
        if (hadPreviousTransfusion == null || !hadPreviousTransfusion) {
            return "No previous transfusion";
        }
        if (previousTransfusionDate != null && previousTransfusionUnits != null) {
            return String.format("YES on %s, %d unit%s", 
                previousTransfusionDate, 
                previousTransfusionUnits,
                previousTransfusionUnits > 1 ? "s" : "");
        }
        return "YES (details not specified)";
    }

    // ─────────────────────────────────────────────
    // HELPER METHOD — Format reaction history for display
    // ─────────────────────────────────────────────

    public String formatReactionHistory() {
        if (hadPreviousReaction == null || !hadPreviousReaction) {
            return "No previous reaction";
        }
        if (previousReactionDate != null) {
            String detail = previousReactionDetails != null ? previousReactionDetails : "Not specified";
            return String.format("YES on %s: %s", previousReactionDate, detail);
        }
        return "YES (details not specified)";
    }

    // ─────────────────────────────────────────────
    // HELPER METHOD — Parse indication other specify
    // ─────────────────────────────────────────────
    /**
     * Parse the indicationOtherSpecify field into a map of code -> specification.
     * Format stored: "WB-2:reason1,R-5:reason2,P-6:reason3"
     * Returns map like: {WB-2 -> "reason1", R-5 -> "reason2", ...}
     */
    public java.util.Map<String, String> getIndicationOtherSpecifyMap() {
        java.util.Map<String, String> map = new java.util.HashMap<>();
        if (indicationOtherSpecify == null || indicationOtherSpecify.isEmpty()) {
            return map;
        }
        for (String pair : indicationOtherSpecify.split(",")) {
            if (pair.contains(":")) {
                String[] parts = pair.split(":", 2);
                map.put(parts[0].trim(), parts[1].trim());
            }
        }
        return map;
    }

    /**
     * Format indication other specify for display.
     * Takes the stored format and returns human-readable text.
     */
    public String formatIndicationOtherSpecify() {
        java.util.Map<String, String> map = getIndicationOtherSpecifyMap();
        if (map.isEmpty()) {
            return "None";
        }
        StringBuilder sb = new StringBuilder();
        for (java.util.Map.Entry<String, String> entry : map.entrySet()) {
            if (sb.length() > 0) sb.append("; ");
            sb.append(entry.getKey()).append(": ").append(entry.getValue());
        }
        return sb.toString();
    }
}
