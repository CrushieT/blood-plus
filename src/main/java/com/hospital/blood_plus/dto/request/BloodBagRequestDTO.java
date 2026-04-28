package com.hospital.blood_plus.dto.request;

import com.hospital.blood_plus.model.BloodBag.ComponentType;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;

import java.time.LocalDate;

public class BloodBagRequestDTO {

    // ─────────────────────────────────────────────
    // PATIENT INFO (EXISTING)
    // ─────────────────────────────────────────────

    private String patientName;
    private Integer patientAge;
    private String patientSex;
    private String wardRoom;
    private String requestingPhysician;

    private BloodBagRequest.AgeGroup ageGroup;
    private BloodBagRequest.RequestCategory requestCategory;

    // ─────────────────────────────────────────────
    // BLOOD DETAILS (EXISTING)
    // ─────────────────────────────────────────────

    private BloodBag.BloodType bloodType;
    private ComponentType bloodComponent;
    private Integer numberOfUnits;

    // ─────────────────────────────────────────────
    // URGENCY (EXISTING)
    // ─────────────────────────────────────────────

    private BloodBagRequest.UrgencyLevel urgencyLevel;
    private LocalDate requiredBy;

    // ─────────────────────────────────────────────
    // CONTACT INFO / REQUESTER (EXISTING)
    // ─────────────────────────────────────────────

    private String requesterName;
    private String requesterRelationship;
    private String requesterContact;
    private String requesterEmail;

    // ─────────────────────────────────────────────
    // NOTES (EXISTING)
    // ─────────────────────────────────────────────

    private String notes;

    // ─────────────────────────────────────────────
    // NEW FIELDS — FROM PDF FORMS
    // ─────────────────────────────────────────────

    private Double hemoglobin;                       // From "HEMOGLOBIN" field (g/L)
    private Double hematocrit;                       // From "HEMATOCRIT" field (decimal: 0.30 = 30%)
    private BloodBagRequest.RequestType requestType; // STAT or ROUTINE
    private String previousTransfusionHistory;       // "Yes/No" + when + units
    private String previousReactionHistory;          // "Yes/No" + when + details
    private String indication;                       // Comma-separated codes: "PR-1,PR-2" or "WB-1,R-2"
    private String clinicalImpression;               // From "CLINICAL IMPRESSION / DIAGNOSIS"
    private String attendingPhysician;               // From "ATTENDING PHYSICIAN"
    private String contactNumber;                    // From "CONTACT NUM."

    // ─────────────────────────────────────────────
    // GETTERS & SETTERS (EXISTING)
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

    public BloodBagRequest.AgeGroup getAgeGroup() { return ageGroup; }
    public void setAgeGroup(BloodBagRequest.AgeGroup ageGroup) { this.ageGroup = ageGroup; }

    public BloodBagRequest.RequestCategory getRequestCategory() { return requestCategory; }
    public void setRequestCategory(BloodBagRequest.RequestCategory requestCategory) { this.requestCategory = requestCategory; }

    public BloodBag.BloodType getBloodType() { return bloodType; }
    public void setBloodType(BloodBag.BloodType bloodType) { this.bloodType = bloodType; }

    public ComponentType getBloodComponent() { return bloodComponent; }
    public void setBloodComponent(ComponentType bloodComponent) { this.bloodComponent = bloodComponent; }

    public Integer getNumberOfUnits() { return numberOfUnits; }
    public void setNumberOfUnits(Integer numberOfUnits) { this.numberOfUnits = numberOfUnits; }

    public BloodBagRequest.UrgencyLevel getUrgencyLevel() { return urgencyLevel; }
    public void setUrgencyLevel(BloodBagRequest.UrgencyLevel urgencyLevel) { this.urgencyLevel = urgencyLevel; }

    public LocalDate getRequiredBy() { return requiredBy; }
    public void setRequiredBy(LocalDate requiredBy) { this.requiredBy = requiredBy; }

    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }

    public String getRequesterRelationship() { return requesterRelationship; }
    public void setRequesterRelationship(String requesterRelationship) { this.requesterRelationship = requesterRelationship; }

    public String getRequesterContact() { return requesterContact; }
    public void setRequesterContact(String requesterContact) { this.requesterContact = requesterContact; }

    public String getRequesterEmail() { return requesterEmail; }
    public void setRequesterEmail(String requesterEmail) { this.requesterEmail = requesterEmail; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    // ─────────────────────────────────────────────
    // GETTERS & SETTERS — NEW PDF FIELDS
    // ─────────────────────────────────────────────

    public Double getHemoglobin() { return hemoglobin; }
    public void setHemoglobin(Double hemoglobin) { this.hemoglobin = hemoglobin; }

    public Double getHematocrit() { return hematocrit; }
    public void setHematocrit(Double hematocrit) { this.hematocrit = hematocrit; }

    public BloodBagRequest.RequestType getRequestType() { return requestType; }
    public void setRequestType(BloodBagRequest.RequestType requestType) { this.requestType = requestType; }

    public String getPreviousTransfusionHistory() { return previousTransfusionHistory; }
    public void setPreviousTransfusionHistory(String previousTransfusionHistory) { this.previousTransfusionHistory = previousTransfusionHistory; }

    public String getPreviousReactionHistory() { return previousReactionHistory; }
    public void setPreviousReactionHistory(String previousReactionHistory) { this.previousReactionHistory = previousReactionHistory; }

    public String getIndication() { return indication; }
    public void setIndication(String indication) { this.indication = indication; }

    public String getClinicalImpression() { return clinicalImpression; }
    public void setClinicalImpression(String clinicalImpression) { this.clinicalImpression = clinicalImpression; }

    public String getAttendingPhysician() { return attendingPhysician; }
    public void setAttendingPhysician(String attendingPhysician) { this.attendingPhysician = attendingPhysician; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }
}