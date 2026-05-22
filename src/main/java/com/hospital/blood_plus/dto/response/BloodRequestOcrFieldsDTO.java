package com.hospital.blood_plus.dto.response;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class BloodRequestOcrFieldsDTO {
    private String patientName;
    private String patientMiddle;
    private String patientLast;
    private String patientSuffix;
    private String birthdate;
    private String sex;

    private String purok;
    private String barangay;
    private String municipality;
    private String province;

    private String physician;
    private String room;
    private String ward;
    private String diagnosis;
    private String contact;

    private String bloodType;
    private String hemoglobin;
    private String hematocrit;
    private String requestType;
    private String units;
    private String componentType;

    private String previousTransfusion;
    private String previousTransfusionDate;
    private String previousUnits;
    private String previousReaction;
    private String reactionDate;
    private String reactionDetails;

    private List<String> indicationCodes = new ArrayList<>();
    private Map<String, String> otherIndicationText = new LinkedHashMap<>();

    public String getPatientName() {
        return patientName;
    }

    public void setPatientName(String patientName) {
        this.patientName = patientName;
    }

    public String getPatientMiddle() {
        return patientMiddle;
    }

    public void setPatientMiddle(String patientMiddle) {
        this.patientMiddle = patientMiddle;
    }

    public String getPatientLast() {
        return patientLast;
    }

    public void setPatientLast(String patientLast) {
        this.patientLast = patientLast;
    }

    public String getPatientSuffix() {
        return patientSuffix;
    }

    public void setPatientSuffix(String patientSuffix) {
        this.patientSuffix = patientSuffix;
    }

    public String getBirthdate() {
        return birthdate;
    }

    public void setBirthdate(String birthdate) {
        this.birthdate = birthdate;
    }

    public String getSex() {
        return sex;
    }

    public void setSex(String sex) {
        this.sex = sex;
    }

    public String getPurok() {
        return purok;
    }

    public void setPurok(String purok) {
        this.purok = purok;
    }

    public String getBarangay() {
        return barangay;
    }

    public void setBarangay(String barangay) {
        this.barangay = barangay;
    }

    public String getMunicipality() {
        return municipality;
    }

    public void setMunicipality(String municipality) {
        this.municipality = municipality;
    }

    public String getProvince() {
        return province;
    }

    public void setProvince(String province) {
        this.province = province;
    }

    public String getPhysician() {
        return physician;
    }

    public void setPhysician(String physician) {
        this.physician = physician;
    }

    public String getRoom() {
        return room;
    }

    public void setRoom(String room) {
        this.room = room;
    }

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }

    public String getDiagnosis() {
        return diagnosis;
    }

    public void setDiagnosis(String diagnosis) {
        this.diagnosis = diagnosis;
    }

    public String getContact() {
        return contact;
    }

    public void setContact(String contact) {
        this.contact = contact;
    }

    public String getBloodType() {
        return bloodType;
    }

    public void setBloodType(String bloodType) {
        this.bloodType = bloodType;
    }

    public String getHemoglobin() {
        return hemoglobin;
    }

    public void setHemoglobin(String hemoglobin) {
        this.hemoglobin = hemoglobin;
    }

    public String getHematocrit() {
        return hematocrit;
    }

    public void setHematocrit(String hematocrit) {
        this.hematocrit = hematocrit;
    }

    public String getRequestType() {
        return requestType;
    }

    public void setRequestType(String requestType) {
        this.requestType = requestType;
    }

    public String getUnits() {
        return units;
    }

    public void setUnits(String units) {
        this.units = units;
    }

    public String getComponentType() {
        return componentType;
    }

    public void setComponentType(String componentType) {
        this.componentType = componentType;
    }

    public String getPreviousTransfusion() {
        return previousTransfusion;
    }

    public void setPreviousTransfusion(String previousTransfusion) {
        this.previousTransfusion = previousTransfusion;
    }

    public String getPreviousTransfusionDate() {
        return previousTransfusionDate;
    }

    public void setPreviousTransfusionDate(String previousTransfusionDate) {
        this.previousTransfusionDate = previousTransfusionDate;
    }

    public String getPreviousUnits() {
        return previousUnits;
    }

    public void setPreviousUnits(String previousUnits) {
        this.previousUnits = previousUnits;
    }

    public String getPreviousReaction() {
        return previousReaction;
    }

    public void setPreviousReaction(String previousReaction) {
        this.previousReaction = previousReaction;
    }

    public String getReactionDate() {
        return reactionDate;
    }

    public void setReactionDate(String reactionDate) {
        this.reactionDate = reactionDate;
    }

    public String getReactionDetails() {
        return reactionDetails;
    }

    public void setReactionDetails(String reactionDetails) {
        this.reactionDetails = reactionDetails;
    }

    public List<String> getIndicationCodes() {
        return indicationCodes;
    }

    public void setIndicationCodes(List<String> indicationCodes) {
        this.indicationCodes = indicationCodes != null ? indicationCodes : new ArrayList<>();
    }

    public Map<String, String> getOtherIndicationText() {
        return otherIndicationText;
    }

    public void setOtherIndicationText(Map<String, String> otherIndicationText) {
        this.otherIndicationText = otherIndicationText != null ? otherIndicationText : new LinkedHashMap<>();
    }
}
