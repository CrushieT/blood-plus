package com.hospital.blood_plus.dto.response;

import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class AdminBloodRequestListItemDTO {
    private Long id;
    private String referenceNumber;
    private BloodBagRequest.RequestStatus status;
    private BloodBagRequest.RequesterType requesterType;
    private BloodBagRequest.RequestCategory requestCategory;
    private BloodBagRequest.UrgencyLevel urgencyLevel;
    private BloodBagRequest.RequestType requestType;
    private LocalDateTime requestedAt;
    private LocalDate requiredBy;

    private String patientName;
    private String patientMiddle;
    private String patientLast;
    private String patientSuffix;
    private Integer patientAge;
    private String patientSex;
    private LocalDate patientBirthdate;
    private String wardRoom;
    private String roomNo;
    private String patientPurok;
    private String patientBarangay;
    private String patientMunicipality;
    private String patientProvince;
    private String requestingPhysician;
    private BloodBagRequest.AgeGroup ageGroup;

    private BloodBag.BloodType bloodType;
    private BloodBag.ComponentType bloodComponent;
    private Integer numberOfUnits;
    private Integer approvedUnits;
    private Boolean patientAcceptedRemarks;
    private String approvalRemarks;
    private LocalDateTime confirmationEmailSentAt;

    private Integer plateletCount;
    private Integer volumeMl;
    private String requesterName;
    private String requesterRelationship;
    private String requesterContact;
    private String requesterEmail;

    private String hospitalName;
    private String hospitalContactName;
    private String hospitalContactEmail;
    private String hospitalPhoneNumber;

    private String notes;
    private String doctorsNoteUrl;
    private String rejectionReason;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }
    public BloodBagRequest.RequestStatus getStatus() { return status; }
    public void setStatus(BloodBagRequest.RequestStatus status) { this.status = status; }
    public BloodBagRequest.RequesterType getRequesterType() { return requesterType; }
    public void setRequesterType(BloodBagRequest.RequesterType requesterType) { this.requesterType = requesterType; }
    public BloodBagRequest.RequestCategory getRequestCategory() { return requestCategory; }
    public void setRequestCategory(BloodBagRequest.RequestCategory requestCategory) { this.requestCategory = requestCategory; }
    public BloodBagRequest.UrgencyLevel getUrgencyLevel() { return urgencyLevel; }
    public void setUrgencyLevel(BloodBagRequest.UrgencyLevel urgencyLevel) { this.urgencyLevel = urgencyLevel; }
    public BloodBagRequest.RequestType getRequestType() { return requestType; }
    public void setRequestType(BloodBagRequest.RequestType requestType) { this.requestType = requestType; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public void setRequestedAt(LocalDateTime requestedAt) { this.requestedAt = requestedAt; }
    public LocalDate getRequiredBy() { return requiredBy; }
    public void setRequiredBy(LocalDate requiredBy) { this.requiredBy = requiredBy; }
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
    public BloodBagRequest.AgeGroup getAgeGroup() { return ageGroup; }
    public void setAgeGroup(BloodBagRequest.AgeGroup ageGroup) { this.ageGroup = ageGroup; }
    public BloodBag.BloodType getBloodType() { return bloodType; }
    public void setBloodType(BloodBag.BloodType bloodType) { this.bloodType = bloodType; }
    public BloodBag.ComponentType getBloodComponent() { return bloodComponent; }
    public void setBloodComponent(BloodBag.ComponentType bloodComponent) { this.bloodComponent = bloodComponent; }
    public Integer getNumberOfUnits() { return numberOfUnits; }
    public void setNumberOfUnits(Integer numberOfUnits) { this.numberOfUnits = numberOfUnits; }
    public Integer getApprovedUnits() { return approvedUnits; }
    public void setApprovedUnits(Integer approvedUnits) { this.approvedUnits = approvedUnits; }
    public Boolean getPatientAcceptedRemarks() { return patientAcceptedRemarks; }
    public void setPatientAcceptedRemarks(Boolean patientAcceptedRemarks) { this.patientAcceptedRemarks = patientAcceptedRemarks; }
    public String getApprovalRemarks() { return approvalRemarks; }
    public void setApprovalRemarks(String approvalRemarks) { this.approvalRemarks = approvalRemarks; }
    public LocalDateTime getConfirmationEmailSentAt() { return confirmationEmailSentAt; }
    public void setConfirmationEmailSentAt(LocalDateTime confirmationEmailSentAt) { this.confirmationEmailSentAt = confirmationEmailSentAt; }
    public Integer getPlateletCount() { return plateletCount; }
    public void setPlateletCount(Integer plateletCount) { this.plateletCount = plateletCount; }
    public Integer getVolumeMl() { return volumeMl; }
    public void setVolumeMl(Integer volumeMl) { this.volumeMl = volumeMl; }
    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }
    public String getRequesterRelationship() { return requesterRelationship; }
    public void setRequesterRelationship(String requesterRelationship) { this.requesterRelationship = requesterRelationship; }
    public String getRequesterContact() { return requesterContact; }
    public void setRequesterContact(String requesterContact) { this.requesterContact = requesterContact; }
    public String getRequesterEmail() { return requesterEmail; }
    public void setRequesterEmail(String requesterEmail) { this.requesterEmail = requesterEmail; }
    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }
    public String getHospitalContactName() { return hospitalContactName; }
    public void setHospitalContactName(String hospitalContactName) { this.hospitalContactName = hospitalContactName; }
    public String getHospitalContactEmail() { return hospitalContactEmail; }
    public void setHospitalContactEmail(String hospitalContactEmail) { this.hospitalContactEmail = hospitalContactEmail; }
    public String getHospitalPhoneNumber() { return hospitalPhoneNumber; }
    public void setHospitalPhoneNumber(String hospitalPhoneNumber) { this.hospitalPhoneNumber = hospitalPhoneNumber; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public String getDoctorsNoteUrl() { return doctorsNoteUrl; }
    public void setDoctorsNoteUrl(String doctorsNoteUrl) { this.doctorsNoteUrl = doctorsNoteUrl; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }
}
