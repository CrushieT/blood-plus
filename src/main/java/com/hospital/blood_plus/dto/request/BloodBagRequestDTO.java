package com.hospital.blood_plus.dto.request;

import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBag.ComponentType;
import com.hospital.blood_plus.model.BloodBagRequest;
import java.time.LocalDate;

/**
 * Unified DTO for blood bag requests (Hospital & Anonymous)
 * 
 * - For HOSPITAL requests: populate hospital context + all clinical fields
 * - For ANONYMOUS requests: populate requester info only, skip hospital context
 */
public class BloodBagRequestDTO {

    // ─────────────────────────────────────────────────────────────
    // CORE FIELDS (Required for all request types)
    // ─────────────────────────────────────────────────────────────

    private String patientName;          // "Smith, John"
    private Integer patientAge;
    private String patientSex;           // "M" or "F"
    private LocalDate patientBirthdate;
    private String requestingPhysician;
    private BloodBag.BloodType bloodType;
    private ComponentType bloodComponent;
    private Integer numberOfUnits;
    private BloodBagRequest.UrgencyLevel urgencyLevel;

    // ─────────────────────────────────────────────────────────────
    // OPTIONAL FIELDS (May be populated depending on request type)
    // ─────────────────────────────────────────────────────────────

    // Patient context
    private String wardRoom;
    private String roomNo;
    private BloodBagRequest.AgeGroup ageGroup;
    private BloodBagRequest.RequestCategory requestCategory;

    // Additional patient info
    private LocalDate requiredBy;
    private String notes;

    // ─────────────────────────────────────────────────────────────
    // CLINICAL DATA FIELDS (NEW - from hospital form Step 3)
    // ─────────────────────────────────────────────────────────────

    private String clinicalImpression;      // From "CLINICAL IMPRESSION / DIAGNOSIS"
    private String attendingPhysician;      // From "ATTENDING PHYSICIAN"
    private String contactNumber;           // From "CONTACT NUM."
    private Double hemoglobin;              // (g/L) - from lab values
    private Double hematocrit;              // (decimal: 0.30 = 30%) - from lab values
    private BloodBagRequest.RequestType requestType;  // STAT or ROUTINE

    // ─────────────────────────────────────────────────────────────
    // TRANSFUSION HISTORY FIELDS (NEW - from hospital form Step 3)
    // ─────────────────────────────────────────────────────────────

    private Boolean hadPreviousTransfusion;
    private LocalDate previousTransfusionDate;
    private Integer previousTransfusionUnits;

    // ─────────────────────────────────────────────────────────────
    // REACTION HISTORY FIELDS (NEW - from hospital form Step 3)
    // ─────────────────────────────────────────────────────────────

    private Boolean hadPreviousReaction;
    private LocalDate previousReactionDate;
    private String previousReactionDetails;  // NEW: Type/details of reaction (e.g., "Fever, rash")

    // ─────────────────────────────────────────────────────────────
    // INDICATIONS FOR TRANSFUSION (NEW - from hospital form Step 4)
    // ─────────────────────────────────────────────────────────────

    private String indication;  // Comma-separated codes: "F-1,F-2,F-3" or with sub-codes "F-5,F-5a,F-5b"

    // ─────────────────────────────────────────────────────────────
    // REQUESTER FIELDS (For ANONYMOUS requests)
    // ─────────────────────────────────────────────────────────────

    private String requesterName;
    private String requesterRelationship;
    private String requesterContact;
    private String requesterEmail;

    // ─────────────────────────────────────────────────────────────
    // Getters & Setters
    // ─────────────────────────────────────────────────────────────

    // Core fields
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public Integer getPatientAge() { return patientAge; }
    public void setPatientAge(Integer patientAge) { this.patientAge = patientAge; }

    public String getPatientSex() { return patientSex; }
    public void setPatientSex(String patientSex) { this.patientSex = patientSex; }
    
    public LocalDate getPatientBirthdate() { return patientBirthdate; }
    public void setPatientBirthdate(LocalDate patientBirthdate) { this.patientBirthdate = patientBirthdate; }

    public String getRequestingPhysician() { return requestingPhysician; }
    public void setRequestingPhysician(String requestingPhysician) { this.requestingPhysician = requestingPhysician; }

    public BloodBag.BloodType getBloodType() { return bloodType; }
    public void setBloodType(BloodBag.BloodType bloodType) { this.bloodType = bloodType; }

    public ComponentType getBloodComponent() { return bloodComponent; }
    public void setBloodComponent(ComponentType bloodComponent) { this.bloodComponent = bloodComponent; }

    public Integer getNumberOfUnits() { return numberOfUnits; }
    public void setNumberOfUnits(Integer numberOfUnits) { this.numberOfUnits = numberOfUnits; }

    public BloodBagRequest.UrgencyLevel getUrgencyLevel() { return urgencyLevel; }
    public void setUrgencyLevel(BloodBagRequest.UrgencyLevel urgencyLevel) { this.urgencyLevel = urgencyLevel; }

    // Optional fields
    public String getWardRoom() { return wardRoom; }
    public void setWardRoom(String wardRoom) { this.wardRoom = wardRoom; }

    public String getRoomNo() { return roomNo; }
    public void setRoomNo(String roomNo) { this.roomNo = roomNo; }

    public BloodBagRequest.AgeGroup getAgeGroup() { return ageGroup; }
    public void setAgeGroup(BloodBagRequest.AgeGroup ageGroup) { this.ageGroup = ageGroup; }

    public BloodBagRequest.RequestCategory getRequestCategory() { return requestCategory; }
    public void setRequestCategory(BloodBagRequest.RequestCategory requestCategory) { this.requestCategory = requestCategory; }

    public LocalDate getRequiredBy() { return requiredBy; }
    public void setRequiredBy(LocalDate requiredBy) { this.requiredBy = requiredBy; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    // Clinical data fields
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

    public BloodBagRequest.RequestType getRequestType() { return requestType; }
    public void setRequestType(BloodBagRequest.RequestType requestType) { this.requestType = requestType; }

    // Transfusion history fields
    public Boolean getHadPreviousTransfusion() { return hadPreviousTransfusion; }
    public void setHadPreviousTransfusion(Boolean hadPreviousTransfusion) { this.hadPreviousTransfusion = hadPreviousTransfusion; }

    public LocalDate getPreviousTransfusionDate() { return previousTransfusionDate; }
    public void setPreviousTransfusionDate(LocalDate previousTransfusionDate) { this.previousTransfusionDate = previousTransfusionDate; }

    public Integer getPreviousTransfusionUnits() { return previousTransfusionUnits; }
    public void setPreviousTransfusionUnits(Integer previousTransfusionUnits) { this.previousTransfusionUnits = previousTransfusionUnits; }

    // Reaction history fields
    public Boolean getHadPreviousReaction() { return hadPreviousReaction; }
    public void setHadPreviousReaction(Boolean hadPreviousReaction) { this.hadPreviousReaction = hadPreviousReaction; }

    public LocalDate getPreviousReactionDate() { return previousReactionDate; }
    public void setPreviousReactionDate(LocalDate previousReactionDate) { this.previousReactionDate = previousReactionDate; }

    public String getPreviousReactionDetails() { return previousReactionDetails; }
    public void setPreviousReactionDetails(String previousReactionDetails) { this.previousReactionDetails = previousReactionDetails; }

    // Indications
    public String getIndication() { return indication; }
    public void setIndication(String indication) { this.indication = indication; }

    // Requester fields (for anonymous requests)
    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getRequesterRelationship() { return requesterRelationship; }
    public void setRequesterRelationship(String requesterRelationship) { this.requesterRelationship = requesterRelationship; }

    public String getRequesterContact() { return requesterContact; }
    public void setRequesterContact(String requesterContact) { this.requesterContact = requesterContact; }

    public String getRequesterEmail() { return requesterEmail; }
    public void setRequesterEmail(String requesterEmail) { this.requesterEmail = requesterEmail; }
}