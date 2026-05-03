package com.hospital.blood_plus.dto.request;

import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;

public class RecentActivityDTO {

    public enum ActivityType {
        BLOOD_BAG_ADDED,           // New blood bag logged
        BLOOD_BAG_DISPATCHED,      // Blood bag used/discarded/transferred
        REQUEST_CREATED,           // New blood request
        REQUEST_APPROVED,          // Request approved
        REQUEST_ALLOCATED,         // Request allocated
        REQUEST_FULFILLED,         // Request fulfilled with blood bag
        REQUEST_REJECTED,          // Request rejected
        REQUEST_STATUS_CHANGED,    // Status change (generic)
        STOCK_CRITICAL,            // Stock level critical
        STOCK_LOW                  // Stock level low
    }

    public enum ActivitySeverity {
        INFO, WARNING, CRITICAL, SUCCESS
    }

    private Long id;

    @JsonProperty("activityType")
    private ActivityType activityType;

    @JsonProperty("severity")
    private ActivitySeverity severity;

    @JsonProperty("title")
    private String title;

    @JsonProperty("description")
    private String description;

    @JsonProperty("timestamp")
    private LocalDateTime timestamp;

    @JsonProperty("bloodType")
    private String bloodType;

    @JsonProperty("quantity")
    private Integer quantity;

    @JsonProperty("entityId")
    private Long entityId;

    @JsonProperty("relatedEntityId")
    private Long relatedEntityId;

    @JsonProperty("actorName")
    private String actorName;

    @JsonProperty("location")
    private String location;

    @JsonProperty("metadata")
    private String metadata;

    // ─────────────────────────────────────────────
    // Constructors
    // ─────────────────────────────────────────────

    public RecentActivityDTO() {}

    public RecentActivityDTO(ActivityType activityType, ActivitySeverity severity, 
                            String title, String description, LocalDateTime timestamp) {
        this.activityType = activityType;
        this.severity = severity;
        this.title = title;
        this.description = description;
        this.timestamp = timestamp;
    }

    // ─────────────────────────────────────────────
    // Getters & Setters
    // ─────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ActivityType getActivityType() { return activityType; }
    public void setActivityType(ActivityType activityType) { this.activityType = activityType; }

    public ActivitySeverity getSeverity() { return severity; }
    public void setSeverity(ActivitySeverity severity) { this.severity = severity; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Long getEntityId() { return entityId; }
    public void setEntityId(Long entityId) { this.entityId = entityId; }

    public Long getRelatedEntityId() { return relatedEntityId; }
    public void setRelatedEntityId(Long relatedEntityId) { this.relatedEntityId = relatedEntityId; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
}