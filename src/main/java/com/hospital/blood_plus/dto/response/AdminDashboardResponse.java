package com.hospital.blood_plus.dto.response;

import java.util.Map;

public class AdminDashboardResponse {

    private int activeDrives;
    private int criticalBloodTypes;
    private Map<String, Long> bloodBankSummary; // blood type → unit count
    private int openSystemUrgent;

    public int getOpenSystemUrgent() { return openSystemUrgent; }
    public void setOpenSystemUrgent(int o) { this.openSystemUrgent = o; }

    // getters & setters

    public int getActiveDrives() { return activeDrives; }
    public void setActiveDrives(int activeDrives) { this.activeDrives = activeDrives; }

    public int getCriticalBloodTypes() { return criticalBloodTypes; }
    public void setCriticalBloodTypes(int criticalBloodTypes) { this.criticalBloodTypes = criticalBloodTypes; }

    public Map<String, Long> getBloodBankSummary() { return bloodBankSummary; }
    public void setBloodBankSummary(Map<String, Long> bloodBankSummary) { this.bloodBankSummary = bloodBankSummary; }
}