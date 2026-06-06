package com.hospital.blood_plus.dto.request;

import java.util.List;
import java.util.Map;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Data Transfer Object for Analytics Dashboard
 * Contains all metrics needed for the admin analytics dashboard
 */
public class AnalyticsDTO {

    @JsonProperty("requests")
    private RequestMetrics requests;

    @JsonProperty("urgency")
    private Map<String, Long> urgency;

    @JsonProperty("category")
    private Map<String, Long> category;

    @JsonProperty("bloodTypes")
    private Map<String, Long> bloodTypes;

    @JsonProperty("dispatch")
    private Map<String, Long> dispatch;

    @JsonProperty("alerts")
    private AlertMetrics alerts;

    @JsonProperty("requesterType")
    private Map<String, Long> requesterType;

    @JsonProperty("bloodComponent")
    private Map<String, Long> bloodComponent;

    @JsonProperty("hospitals")
    private List<HospitalMetric> hospitals;

    @JsonProperty("fulfillmentMetrics")
    private FulfillmentMetrics fulfillmentMetrics;

    // ===== Inner Classes =====

    /**
     * Request status breakdown
     */
    public static class RequestMetrics {
        @JsonProperty("pending")
        public Long pending;

        @JsonProperty("approved")
        public Long approved;

        @JsonProperty("allocated")
        public Long allocated;

        @JsonProperty("released")
        public Long released;

        @JsonProperty("rejected")
        public Long rejected;

        @JsonProperty("cancelled")
        public Long cancelled;

        public RequestMetrics() {}

        public RequestMetrics(Long pending, Long approved, Long allocated, 
                            Long released, Long rejected, Long cancelled) {
            this.pending = pending;
            this.approved = approved;
            this.allocated = allocated;
            this.released = released;
            this.rejected = rejected;
            this.cancelled = cancelled;
        }
    }

    /**
     * Expiry and quality alerts
     */
    public static class AlertMetrics {
        @JsonProperty("expiringSoon")
        public Long expiringSoon;

        @JsonProperty("expired")
        public Long expired;

        @JsonProperty("qualityIssues")
        public Long qualityIssues;

        public AlertMetrics() {}

        public AlertMetrics(Long expiringSoon, Long expired, Long qualityIssues) {
            this.expiringSoon = expiringSoon;
            this.expired = expired;
            this.qualityIssues = qualityIssues;
        }
    }

    /**
     * Hospital performance metrics
     */
    public static class HospitalMetric {
        @JsonProperty("name")
        public String name;

        @JsonProperty("requests")
        public Long requests;

        @JsonProperty("fulfilled")
        public Long fulfilled;

        public HospitalMetric() {}

        public HospitalMetric(String name, Long requests, Long fulfilled) {
            this.name = name;
            this.requests = requests;
            this.fulfilled = fulfilled;
        }
    }

    /**
     * Fulfillment rate and timing metrics
     */
    public static class FulfillmentMetrics {
        @JsonProperty("rate")
        public Double rate;

        @JsonProperty("totalReleased")
        public Long totalReleased;

        @JsonProperty("avgDaysToRelease")
        public Double avgDaysToRelease;

        public FulfillmentMetrics() {}

        public FulfillmentMetrics(Double rate, Long totalReleased, Double avgDaysToRelease) {
            this.rate = rate;
            this.totalReleased = totalReleased;
            this.avgDaysToRelease = avgDaysToRelease;
        }
    }

    // ===== Constructors =====

    public AnalyticsDTO() {}

    public AnalyticsDTO(RequestMetrics requests, Map<String, Long> urgency,
                       Map<String, Long> category, Map<String, Long> bloodTypes,
                       Map<String, Long> dispatch, AlertMetrics alerts,
                       Map<String, Long> requesterType, Map<String, Long> bloodComponent,
                       List<HospitalMetric> hospitals, FulfillmentMetrics fulfillmentMetrics) {
        this.requests = requests;
        this.urgency = urgency;
        this.category = category;
        this.bloodTypes = bloodTypes;
        this.dispatch = dispatch;
        this.alerts = alerts;
        this.requesterType = requesterType;
        this.bloodComponent = bloodComponent;
        this.hospitals = hospitals;
        this.fulfillmentMetrics = fulfillmentMetrics;
    }

    // ===== Getters & Setters =====

    public RequestMetrics getRequests() { return requests; }
    public void setRequests(RequestMetrics requests) { this.requests = requests; }

    public Map<String, Long> getUrgency() { return urgency; }
    public void setUrgency(Map<String, Long> urgency) { this.urgency = urgency; }

    public Map<String, Long> getCategory() { return category; }
    public void setCategory(Map<String, Long> category) { this.category = category; }

    public Map<String, Long> getBloodTypes() { return bloodTypes; }
    public void setBloodTypes(Map<String, Long> bloodTypes) { this.bloodTypes = bloodTypes; }

    public Map<String, Long> getDispatch() { return dispatch; }
    public void setDispatch(Map<String, Long> dispatch) { this.dispatch = dispatch; }

    public AlertMetrics getAlerts() { return alerts; }
    public void setAlerts(AlertMetrics alerts) { this.alerts = alerts; }

    public Map<String, Long> getRequesterType() { return requesterType; }
    public void setRequesterType(Map<String, Long> requesterType) { this.requesterType = requesterType; }

    public Map<String, Long> getBloodComponent() { return bloodComponent; }
    public void setBloodComponent(Map<String, Long> bloodComponent) { this.bloodComponent = bloodComponent; }

    public List<HospitalMetric> getHospitals() { return hospitals; }
    public void setHospitals(List<HospitalMetric> hospitals) { this.hospitals = hospitals; }

    public FulfillmentMetrics getFulfillmentMetrics() { return fulfillmentMetrics; }
    public void setFulfillmentMetrics(FulfillmentMetrics fulfillmentMetrics) { 
        this.fulfillmentMetrics = fulfillmentMetrics; 
    }
}