package com.hospital.blood_plus.dto.response;

import com.hospital.blood_plus.dto.request.RecentActivityDTO;

import java.util.List;
import java.util.Map;

/**
 * Comprehensive admin dashboard response combining all dashboard data + recent activities
 * Single API call replaces multiple endpoints
 */
public class AdminDashboardDTO {

    // ─────────────────────────────────────────────
    // Dashboard Statistics
    // ─────────────────────────────────────────────
    
    private int criticalBloodTypes;
    private int totalHospitals;
    private int totalUnits;
    private int pendingRequests;
    private Map<String, Integer> bloodBankSummary;  // count by blood type
    private Map<String, Integer> bloodBankVolume;   // volume in mL by blood type
    private int openSystemCount;
    private int expiringSoon;

    // ─────────────────────────────────────────────
    // NEW: Recent Activities (integrated)
    // ─────────────────────────────────────────────
    
    private List<RecentActivityDTO> recentActivities;
    private int totalActivitiesCount;

    // ─────────────────────────────────────────────
    // Additional Dashboard Stats (from AdminDashboardResponse)
    // ─────────────────────────────────────────────
    
    private int activeDrives;
    private Map<String, Long> bloodBankSummaryAlt; // alternative format if needed
    private int openSystemUrgent;

    // ─────────────────────────────────────────────
    // Constructors
    // ─────────────────────────────────────────────

    public AdminDashboardDTO() {}

    /**
     * Original constructor (backward compatible)
     */
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

    /**
     * Extended constructor with recent activities
     */
    public AdminDashboardDTO(int criticalBloodTypes, int totalHospitals, int totalUnits,
                             int pendingRequests, Map<String, Integer> bloodBankSummary,
                             Map<String, Integer> bloodBankVolume, int openSystemCount, int expiringSoon,
                             List<RecentActivityDTO> recentActivities, int totalActivitiesCount) {
        this.criticalBloodTypes = criticalBloodTypes;
        this.totalHospitals = totalHospitals;
        this.totalUnits = totalUnits;
        this.pendingRequests = pendingRequests;
        this.bloodBankSummary = bloodBankSummary;
        this.bloodBankVolume = bloodBankVolume;
        this.openSystemCount = openSystemCount;
        this.expiringSoon = expiringSoon;
        this.recentActivities = recentActivities;
        this.totalActivitiesCount = totalActivitiesCount;
    }

    /**
     * Full constructor with all fields
     */
    public AdminDashboardDTO(int criticalBloodTypes, int totalHospitals, int totalUnits,
                             int pendingRequests, Map<String, Integer> bloodBankSummary,
                             Map<String, Integer> bloodBankVolume, int openSystemCount, int expiringSoon,
                             List<RecentActivityDTO> recentActivities, int totalActivitiesCount,
                             int activeDrives, Map<String, Long> bloodBankSummaryAlt, int openSystemUrgent) {
        this.criticalBloodTypes = criticalBloodTypes;
        this.totalHospitals = totalHospitals;
        this.totalUnits = totalUnits;
        this.pendingRequests = pendingRequests;
        this.bloodBankSummary = bloodBankSummary;
        this.bloodBankVolume = bloodBankVolume;
        this.openSystemCount = openSystemCount;
        this.expiringSoon = expiringSoon;
        this.recentActivities = recentActivities;
        this.totalActivitiesCount = totalActivitiesCount;
        this.activeDrives = activeDrives;
        this.bloodBankSummaryAlt = bloodBankSummaryAlt;
        this.openSystemUrgent = openSystemUrgent;
    }

    // ─────────────────────────────────────────────
    // Getters & Setters - Dashboard Stats
    // ─────────────────────────────────────────────

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

    // ─────────────────────────────────────────────
    // Getters & Setters - Recent Activities (NEW)
    // ─────────────────────────────────────────────

    public List<RecentActivityDTO> getRecentActivities() {
        return recentActivities;
    }

    public void setRecentActivities(List<RecentActivityDTO> recentActivities) {
        this.recentActivities = recentActivities;
    }

    public int getTotalActivitiesCount() {
        return totalActivitiesCount;
    }

    public void setTotalActivitiesCount(int totalActivitiesCount) {
        this.totalActivitiesCount = totalActivitiesCount;
    }

    // ─────────────────────────────────────────────
    // Getters & Setters - Additional Stats
    // ─────────────────────────────────────────────

    public int getActiveDrives() {
        return activeDrives;
    }

    public void setActiveDrives(int activeDrives) {
        this.activeDrives = activeDrives;
    }

    public Map<String, Long> getBloodBankSummaryAlt() {
        return bloodBankSummaryAlt;
    }

    public void setBloodBankSummaryAlt(Map<String, Long> bloodBankSummaryAlt) {
        this.bloodBankSummaryAlt = bloodBankSummaryAlt;
    }

    public int getOpenSystemUrgent() {
        return openSystemUrgent;
    }

    public void setOpenSystemUrgent(int openSystemUrgent) {
        this.openSystemUrgent = openSystemUrgent;
    }
}