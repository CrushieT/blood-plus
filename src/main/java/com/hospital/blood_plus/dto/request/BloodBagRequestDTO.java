package com.hospital.blood_plus.dto.request;

import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;

import java.time.LocalDate;

public class BloodBagRequestDTO {

    // ─────────────────────────────────────────────
    // PATIENT INFO
    // ─────────────────────────────────────────────

    private String patientName;
    private Integer patientAge;
    private String patientSex;
    private String wardRoom;
    private String requestingPhysician;

    private BloodBagRequest.AgeGroup ageGroup;
    private BloodBagRequest.RequestCategory requestCategory;

    // ─────────────────────────────────────────────
    // BLOOD DETAILS
    // ─────────────────────────────────────────────

    private BloodBag.BloodType bloodType;
    private BloodBagRequest.BloodComponent bloodComponent;
    private Integer numberOfUnits;

    // ─────────────────────────────────────────────
    // URGENCY
    // ─────────────────────────────────────────────

    private BloodBagRequest.UrgencyLevel urgencyLevel;
    private LocalDate requiredBy;

    // ─────────────────────────────────────────────
    // CONTACT INFO (WALK-IN)
    // ─────────────────────────────────────────────

    private String requesterName;
    private String requesterRelationship;
    private String requesterContact;
    private String requesterEmail;

    // ─────────────────────────────────────────────
    // NOTES
    // ─────────────────────────────────────────────

    private String notes;

    // ─────────────────────────────────────────────
    // GETTERS & SETTERS
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

    public BloodBagRequest.BloodComponent getBloodComponent() { return bloodComponent; }
    public void setBloodComponent(BloodBagRequest.BloodComponent bloodComponent) { this.bloodComponent = bloodComponent; }

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

}