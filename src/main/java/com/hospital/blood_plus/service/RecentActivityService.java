package com.hospital.blood_plus.service;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hospital.blood_plus.dto.request.RecentActivityDTO;
import com.hospital.blood_plus.dto.request.RecentActivityDTO.ActivitySeverity;
import com.hospital.blood_plus.dto.request.RecentActivityDTO.ActivityType;
import com.hospital.blood_plus.model.*;
import com.hospital.blood_plus.repository.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecentActivityService {

    private final BloodBagRequestRepository bloodBagRequestRepository;
    private final RequestStatusLogRepository requestStatusLogRepository;
    private final RequestFulfillmentRepository requestFulfillmentRepository;
    private final BloodBagRepository bloodBagRepository;
    private final BloodBagDispatchRepository bloodBagDispatchRepository;

    public RecentActivityService(
            BloodBagRequestRepository bloodBagRequestRepository,
            RequestStatusLogRepository requestStatusLogRepository,
            RequestFulfillmentRepository requestFulfillmentRepository,
            BloodBagRepository bloodBagRepository,
            BloodBagDispatchRepository bloodBagDispatchRepository) {
        this.bloodBagRequestRepository = bloodBagRequestRepository;
        this.requestStatusLogRepository = requestStatusLogRepository;
        this.requestFulfillmentRepository = requestFulfillmentRepository;
        this.bloodBagRepository = bloodBagRepository;
        this.bloodBagDispatchRepository = bloodBagDispatchRepository;
    }

    /**
     * Fetch recent activities from all sources and merge into one timeline
     */
    @Transactional(readOnly = true)
    public List<RecentActivityDTO> getRecentActivities(int limit) {
        Pageable pageable = PageRequest.of(0, limit * 2); // Fetch more to filter
        List<RecentActivityDTO> activities = new ArrayList<>();

        // Fetch from all sources
        activities.addAll(buildBloodBagActivities(pageable));
        activities.addAll(buildBloodBagDispatchActivities(pageable));
        activities.addAll(buildRequestActivities(pageable));
        activities.addAll(buildStatusLogActivities(pageable));
        activities.addAll(buildFulfillmentActivities(pageable));

        // Sort by timestamp descending and limit
        return activities.stream()
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    /**
     * Fetch recent activities since a specific datetime
     */
    @Transactional(readOnly = true)
    public List<RecentActivityDTO> getRecentActivitiesSince(LocalDateTime since, int limit) {
        Pageable pageable = PageRequest.of(0, limit * 2);
        List<RecentActivityDTO> activities = new ArrayList<>();

        activities.addAll(buildBloodBagActivitiesSince(since, pageable));
        activities.addAll(buildBloodBagDispatchActivitiesSince(since, pageable));
        activities.addAll(buildRequestActivitiesSince(since, pageable));
        activities.addAll(buildStatusLogActivitiesSince(since, pageable));
        activities.addAll(buildFulfillmentActivitiesSince(since, pageable));

        return activities.stream()
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .limit(limit)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────
    // BLOOD BAG ACTIVITIES
    // ─────────────────────────────────────────────

    private List<RecentActivityDTO> buildBloodBagActivities(Pageable pageable) {
        return bloodBagRepository.findRecentBloodBags(pageable).stream()
                .map(this::createBloodBagAddedActivity)
                .collect(Collectors.toList());
    }

    private List<RecentActivityDTO> buildBloodBagActivitiesSince(LocalDateTime since, Pageable pageable) {
        return bloodBagRepository.findBloodBagsSince(since, pageable).stream()
                .map(this::createBloodBagAddedActivity)
                .collect(Collectors.toList());
    }

    private RecentActivityDTO createBloodBagAddedActivity(BloodBag bloodBag) {
        RecentActivityDTO activity = new RecentActivityDTO();
        activity.setActivityType(ActivityType.BLOOD_BAG_ADDED);
        activity.setSeverity(ActivitySeverity.SUCCESS);
        
        String bloodTypeDisplay = bloodBag.getBloodType().getDisplayName();
        activity.setTitle(bloodTypeDisplay + " Blood Bag Added");
        activity.setDescription(String.format("%s (Serial: %s) — %d mL added to inventory",
                bloodTypeDisplay,
                bloodBag.getSerialNumber(),
                bloodBag.getVolumeMl()));
        
        activity.setTimestamp(bloodBag.getCreatedAt());
        activity.setBloodType(bloodTypeDisplay);
        activity.setQuantity(bloodBag.getVolumeMl());
        activity.setEntityId(bloodBag.getId());
        
        if (bloodBag.getReceivedBy() != null) {
            activity.setActorName(bloodBag.getReceivedBy().getUsername());
        }
        activity.setMetadata("source:" + bloodBag.getSource().toString());
        
        return activity;
    }

    // ─────────────────────────────────────────────
    // BLOOD BAG DISPATCH ACTIVITIES
    // ─────────────────────────────────────────────

    private List<RecentActivityDTO> buildBloodBagDispatchActivities(Pageable pageable) {
        return bloodBagDispatchRepository.findRecentDispatches(pageable).stream()
                .map(this::createBloodBagDispatchActivity)
                .collect(Collectors.toList());
    }

    private List<RecentActivityDTO> buildBloodBagDispatchActivitiesSince(LocalDateTime since, Pageable pageable) {
        return bloodBagDispatchRepository.findDispatchesSince(since, pageable).stream()
                .map(this::createBloodBagDispatchActivity)
                .collect(Collectors.toList());
    }

    private RecentActivityDTO createBloodBagDispatchActivity(BloodBagDispatch dispatch) {
        RecentActivityDTO activity = new RecentActivityDTO();
        BloodBag bloodBag = dispatch.getBloodBag();
        String bloodTypeDisplay = bloodBag.getBloodType().getDisplayName();

        switch (dispatch.getDispatchType()) {
            case USED:
                activity.setActivityType(ActivityType.BLOOD_BAG_DISPATCHED);
                activity.setSeverity(ActivitySeverity.INFO);
                activity.setTitle(bloodTypeDisplay + " Dispensed");
                activity.setDescription(String.format("%s (Serial: %s) — %d mL dispensed to %s",
                        bloodTypeDisplay,
                        bloodBag.getSerialNumber(),
                        bloodBag.getVolumeMl(),
                        dispatch.getDispensedTo() != null ? dispatch.getDispensedTo() : "patient"));
                break;

            case DISCARDED:
                activity.setActivityType(ActivityType.BLOOD_BAG_DISPATCHED);
                activity.setSeverity(ActivitySeverity.WARNING);
                activity.setTitle(bloodTypeDisplay + " Discarded");
                activity.setDescription(String.format("%s (Serial: %s) — discarded. Reason: %s",
                        bloodTypeDisplay,
                        bloodBag.getSerialNumber(),
                        bloodBag.getDiscardReason() != null ? bloodBag.getDiscardReason() : "Unknown"));
                break;

            case TRANSFERRED:
                activity.setActivityType(ActivityType.BLOOD_BAG_DISPATCHED);
                activity.setSeverity(ActivitySeverity.INFO);
                activity.setTitle(bloodTypeDisplay + " Transferred");
                activity.setDescription(String.format("%s (Serial: %s) — transferred to %s",
                        bloodTypeDisplay,
                        bloodBag.getSerialNumber(),
                        dispatch.getNotes() != null ? dispatch.getNotes() : "another facility"));
                break;
        }

        activity.setTimestamp(dispatch.getDispatchedAt());
        activity.setBloodType(bloodTypeDisplay);
        activity.setQuantity(bloodBag.getVolumeMl());
        activity.setEntityId(dispatch.getId());
        activity.setRelatedEntityId(bloodBag.getId());
        
        if (dispatch.getDispatchedBy() != null) {
            activity.setActorName(dispatch.getDispatchedBy().getUsername());
        }
        activity.setMetadata("dispatchType:" + dispatch.getDispatchType().toString());

        return activity;
    }

    // ─────────────────────────────────────────────
    // BLOOD BAG REQUEST ACTIVITIES
    // ─────────────────────────────────────────────

    private List<RecentActivityDTO> buildRequestActivities(Pageable pageable) {
        return bloodBagRequestRepository.findRecentRequests(pageable).stream()
                .map(this::createRequestCreatedActivity)
                .collect(Collectors.toList());
    }

    private List<RecentActivityDTO> buildRequestActivitiesSince(LocalDateTime since, Pageable pageable) {
        return bloodBagRequestRepository.findRequestsSince(since, pageable).stream()
                .map(this::createRequestCreatedActivity)
                .collect(Collectors.toList());
    }

    private RecentActivityDTO createRequestCreatedActivity(BloodBagRequest request) {
        RecentActivityDTO activity = new RecentActivityDTO();
        activity.setActivityType(ActivityType.REQUEST_CREATED);
        
        String bloodTypeDisplay = request.getBloodType().getDisplayName();
        String requesterName = null;
        
        if (request.getHospitalProfile() != null) {
            requesterName = request.getHospitalProfile().getUser().getUsername();
        } else if (request.getPatientName() != null) {
            requesterName = request.getPatientName();
        }
        
        activity.setTitle(bloodTypeDisplay + " Requested");
        activity.setDescription(String.format("%s requested %d unit%s of %s (%s)",
                requesterName != null ? requesterName : "Unknown",
                request.getNumberOfUnits() != null ? request.getNumberOfUnits() : 1,
                request.getNumberOfUnits() != null && request.getNumberOfUnits() > 1 ? "s" : "",
                bloodTypeDisplay,
                request.getRequestType() != null ? request.getRequestType().toString() : "ROUTINE"));
        
        activity.setTimestamp(request.getRequestedAt());
        activity.setBloodType(bloodTypeDisplay);
        activity.setQuantity(request.getNumberOfUnits());
        activity.setEntityId(request.getId());
        activity.setLocation(request.getWardRoom() != null ? request.getWardRoom() : "Unknown");
        
        if (request.getRequestedBy() != null) {
            activity.setActorName(request.getRequestedBy().getUsername());
        }
        activity.setMetadata("requestType:" + (request.getRequestType() != null ? request.getRequestType().toString() : "ROUTINE") + 
                            "|status:" + request.getStatus().toString());

        return activity;
    }

    // ─────────────────────────────────────────────
    // REQUEST STATUS LOG ACTIVITIES
    // ─────────────────────────────────────────────

    private List<RecentActivityDTO> buildStatusLogActivities(Pageable pageable) {
        return requestStatusLogRepository.findRecentStatusLogs(pageable).stream()
                .map(this::createStatusLogActivity)
                .collect(Collectors.toList());
    }

    private List<RecentActivityDTO> buildStatusLogActivitiesSince(LocalDateTime since, Pageable pageable) {
        return requestStatusLogRepository.findStatusLogsSince(since, pageable).stream()
                .map(this::createStatusLogActivity)
                .collect(Collectors.toList());
    }

    private RecentActivityDTO createStatusLogActivity(RequestStatusLog log) {
        RecentActivityDTO activity = new RecentActivityDTO();
        BloodBagRequest request = log.getRequest();
        String bloodTypeDisplay = request.getBloodType().getDisplayName();

        // Determine activity type based on new status
        ActivityType activityType = mapStatusToActivityType(log.getNewStatus());
        activity.setActivityType(activityType);
        activity.setSeverity(mapStatusToSeverity(log.getNewStatus()));

        String statusString = formatStatusName(log.getNewStatus());
        activity.setTitle(bloodTypeDisplay + " Request " + statusString);
        activity.setDescription(String.format("Blood request for %s transitioned from %s to %s",
                bloodTypeDisplay,
                formatStatusName(log.getOldStatus()),
                statusString));

        activity.setTimestamp(log.getChangedAt());
        activity.setBloodType(bloodTypeDisplay);
        activity.setQuantity(request.getNumberOfUnits());
        activity.setEntityId(log.getId());
        activity.setRelatedEntityId(request.getId());
        
        if (log.getChangedBy() != null) {
            activity.setActorName(log.getChangedBy().getUsername());
        }
        activity.setMetadata("oldStatus:" + log.getOldStatus().toString() + 
                            "|newStatus:" + log.getNewStatus().toString());

        return activity;
    }

    // ─────────────────────────────────────────────
    // REQUEST FULFILLMENT ACTIVITIES
    // ─────────────────────────────────────────────

    private List<RecentActivityDTO> buildFulfillmentActivities(Pageable pageable) {
        return requestFulfillmentRepository.findRecentFulfillments(pageable).stream()
                .map(this::createFulfillmentActivity)
                .collect(Collectors.toList());
    }

    private List<RecentActivityDTO> buildFulfillmentActivitiesSince(LocalDateTime since, Pageable pageable) {
        return requestFulfillmentRepository.findFulfillmentsSince(since, pageable).stream()
                .map(this::createFulfillmentActivity)
                .collect(Collectors.toList());
    }

    private RecentActivityDTO createFulfillmentActivity(RequestFulfillment fulfillment) {
        RecentActivityDTO activity = new RecentActivityDTO();
        BloodBagRequest request = fulfillment.getRequest();
        BloodBag bloodBag = fulfillment.getBloodBag();
        String bloodTypeDisplay = request.getBloodType().getDisplayName();

        activity.setActivityType(ActivityType.REQUEST_FULFILLED);
        activity.setSeverity(ActivitySeverity.SUCCESS);
        
        String requesterName = null;
        if (request.getHospitalProfile() != null) {
            requesterName = request.getHospitalProfile().getUser().getUsername();
        } else if (request.getPatientName() != null) {
            requesterName = request.getPatientName();
        }
        
        activity.setTitle(bloodTypeDisplay + " Fulfilled");
        activity.setDescription(String.format("Request by %s fulfilled with blood bag (Serial: %s)",
                requesterName != null ? requesterName : "Unknown",
                bloodBag.getSerialNumber()));

        activity.setTimestamp(fulfillment.getFulfilledAt());
        activity.setBloodType(bloodTypeDisplay);
        activity.setQuantity(bloodBag.getVolumeMl());
        activity.setEntityId(fulfillment.getId());
        activity.setRelatedEntityId(request.getId());
        
        if (fulfillment.getFulfilledBy() != null) {
            activity.setActorName(fulfillment.getFulfilledBy().getUsername());
        }
        activity.setMetadata("requestId:" + request.getId() + "|bloodBagId:" + bloodBag.getId());

        return activity;
    }

    // ─────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────

    // private ActivitySeverity mapUrgencyToSeverity(BloodBagRequest.UrgencyLevel urgency) {
    //     switch (urgency) {
    //         case CRITICAL:
    //             return ActivitySeverity.CRITICAL;
    //         case HIGH:
    //             return ActivitySeverity.WARNING;
    //         case MEDIUM:
    //         case LOW:
    //         default:
    //             return ActivitySeverity.INFO;
    //     }
    // }

    private ActivityType mapStatusToActivityType(BloodBagRequest.RequestStatus status) {
        switch (status) {
            case APPROVED:
                return ActivityType.REQUEST_APPROVED;
            case ALLOCATED:
                return ActivityType.REQUEST_ALLOCATED;
            case READY_FOR_RELEASE:
                return ActivityType.REQUEST_ALLOCATED;
            case RELEASED:
                return ActivityType.REQUEST_FULFILLED;
            case REJECTED:
                return ActivityType.REQUEST_REJECTED;
            case CANCELLED:
                return ActivityType.REQUEST_REJECTED;
            case PENDING:
            default:
                return ActivityType.REQUEST_STATUS_CHANGED;
        }
    }

    private ActivitySeverity mapStatusToSeverity(BloodBagRequest.RequestStatus status) {
        switch (status) {
            case REJECTED:
            case CANCELLED:
                return ActivitySeverity.WARNING;
            case APPROVED:
            case READY_FOR_RELEASE:
            case RELEASED:
                return ActivitySeverity.SUCCESS;
            case PENDING:
            case ALLOCATED:
            default:
                return ActivitySeverity.INFO;
        }
    }

    private String formatStatusName(BloodBagRequest.RequestStatus status) {
        switch (status) {
            case PENDING:
                return "Pending";
            case APPROVED:
                return "Approved";
            case ALLOCATED:
                return "Allocated";
            case READY_FOR_RELEASE:
                return "Ready for Release";
            case RELEASED:
                return "Released";
            case REJECTED:
                return "Rejected";
            case CANCELLED:
                return "Cancelled";
            default:
                return status.toString();
        }
    }

    /**
     * Format time difference for display (e.g., "2 hours ago")
     */
    public String formatTimeAgo(LocalDateTime timestamp) {
        LocalDateTime now = LocalDateTime.now();
        long minutes = ChronoUnit.MINUTES.between(timestamp, now);
        long hours = ChronoUnit.HOURS.between(timestamp, now);
        long days = ChronoUnit.DAYS.between(timestamp, now);

        if (minutes < 1) {
            return "Just now";
        } else if (minutes < 60) {
            return minutes + " minute" + (minutes > 1 ? "s" : "") + " ago";
        } else if (hours < 24) {
            return hours + " hour" + (hours > 1 ? "s" : "") + " ago";
        } else if (days < 7) {
            return days + " day" + (days > 1 ? "s" : "") + " ago";
        } else {
            return timestamp.toLocalDate().toString();
        }
    }
}