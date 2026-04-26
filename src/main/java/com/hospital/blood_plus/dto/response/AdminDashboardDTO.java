package com.hospital.blood_plus.dto.response;

import java.util.Map;

public class AdminDashboardDTO {

    private int criticalBloodTypes;
    private int totalHospitals;
    private int totalUnits;
    private int pendingRequests;
    private Map<String, Integer> bloodBankSummary;  // count by blood type
    private Map<String, Integer> bloodBankVolume;   // volume in mL by blood type
    private int openSystemCount;
    private int expiringSoon;

    // Constructors
    public AdminDashboardDTO() {}

    public AdminDashboardDTO(int criticalBloodTypes, int totalHospitals, int totalUnits,
                             int pendingRequests, Map<String, Integer> bloodBankSummary,
                             Map<String, Integer> bloodBankVolume, int openSystemCount, int expiringSoon) {
        this.criticalBloodTypes = criticalBloodTypes;
        this.totalHospitals = totalHospitals;
        this.totalUnits = totalUnits;
        this.pendingRequests = pendingRequests;
        this.bloodBankSummary = bloodBankSummary;
        this.bloodBankVolume = bloodBankVolume;
        this.openSystemCount = openSystemCount;
        this.expiringSoon = expiringSoon;
    }

    // Getters & Setters
    public int getCriticalBloodTypes() {
        return criticalBloodTypes;
    }

    public void setCriticalBloodTypes(int criticalBloodTypes) {
        this.criticalBloodTypes = criticalBloodTypes;
    }

    public int getTotalHospitals() {
        return totalHospitals;
    }

    public void setTotalHospitals(int totalHospitals) {
        this.totalHospitals = totalHospitals;
    }

    public int getTotalUnits() {
        return totalUnits;
    }

    public void setTotalUnits(int totalUnits) {
        this.totalUnits = totalUnits;
    }

    public int getPendingRequests() {
        return pendingRequests;
    }

    public void setPendingRequests(int pendingRequests) {
        this.pendingRequests = pendingRequests;
    }

    public Map<String, Integer> getBloodBankSummary() {
        return bloodBankSummary;
    }

    public void setBloodBankSummary(Map<String, Integer> bloodBankSummary) {
        this.bloodBankSummary = bloodBankSummary;
    }

    public Map<String, Integer> getBloodBankVolume() {
        return bloodBankVolume;
    }

    public void setBloodBankVolume(Map<String, Integer> bloodBankVolume) {
        this.bloodBankVolume = bloodBankVolume;
    }

    public int getOpenSystemCount() {
        return openSystemCount;
    }

    public void setOpenSystemCount(int openSystemCount) {
        this.openSystemCount = openSystemCount;
    }

    public int getExpiringSoon() {
        return expiringSoon;
    }

    public void setExpiringSoon(int expiringSoon) {
        this.expiringSoon = expiringSoon;
    }
}