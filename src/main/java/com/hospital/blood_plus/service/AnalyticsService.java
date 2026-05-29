package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.AnalyticsDTO;
import com.hospital.blood_plus.dto.request.AnalyticsDTO.*;
import com.hospital.blood_plus.model.*;
import com.hospital.blood_plus.model.BloodBag.BloodType;
import com.hospital.blood_plus.model.BloodBag.BagStatus;
import com.hospital.blood_plus.model.BloodBagRequest.*;
import com.hospital.blood_plus.model.BloodBagDispatch.DispatchType;
import com.hospital.blood_plus.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for calculating analytics metrics for the admin dashboard
 */
@Service
public class AnalyticsService {

    @Autowired
    private BloodBagRequestRepository bloodBagRequestRepository;

    @Autowired
    private BloodBagRepository bloodBagRepository;

    @Autowired
    private BloodBagDispatchRepository bloodBagDispatchRepository;

    @Autowired
    private HospitalProfileRepository hospitalProfileRepository;

    /**
     * Main method to calculate all dashboard metrics
     */
    public AnalyticsDTO getDashboardMetrics() {
        return getDashboardMetrics(null, null);
    }

    public AnalyticsDTO getDashboardMetrics(LocalDate startDate, LocalDate endDate) {
        LocalDateTime startDateTime = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime endDateTime = endDate != null ? endDate.plusDays(1).atStartOfDay().minusNanos(1) : null;

        RequestMetrics requests = calculateRequestMetrics(startDateTime, endDateTime);
        Map<String, Long> urgency = calculateUrgencyBreakdown(startDateTime, endDateTime);
        Map<String, Long> category = calculateCategoryBreakdown(startDateTime, endDateTime);
        Map<String, Long> bloodTypes = calculateBloodTypeInventory();
        Map<String, Long> dispatch = calculateDispatchMetrics(startDateTime, endDateTime);
        AlertMetrics alerts = calculateAlerts();
        Map<String, Long> requesterType = calculateRequesterTypeBreakdown(startDateTime, endDateTime);
        Map<String, Long> bloodComponent = calculateBloodComponentBreakdown(startDateTime, endDateTime);
        List<HospitalMetric> hospitals = calculateTopHospitals(startDateTime, endDateTime);
        FulfillmentMetrics fulfillmentMetrics = calculateFulfillmentMetrics(startDateTime, endDateTime);

        return new AnalyticsDTO(
            requests,
            urgency,
            category,
            bloodTypes,
            dispatch,
            alerts,
            requesterType,
            bloodComponent,
            hospitals,
            fulfillmentMetrics
        );
    }

    /**
     * Calculate request status breakdown
     * Gets counts for: PENDING, APPROVED, ALLOCATED, RELEASED, REJECTED, CANCELLED
     */
    private RequestMetrics calculateRequestMetrics(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        Long pending = countByStatus(RequestStatus.PENDING, startDateTime, endDateTime);
        Long approved = countByStatus(RequestStatus.APPROVED, startDateTime, endDateTime);
        Long allocated = countByStatus(RequestStatus.ALLOCATED, startDateTime, endDateTime);
        Long released = countByStatus(RequestStatus.RELEASED, startDateTime, endDateTime);
        Long rejected = countByStatus(RequestStatus.REJECTED, startDateTime, endDateTime);
        Long cancelled = countByStatus(RequestStatus.CANCELLED, startDateTime, endDateTime);

        return new RequestMetrics(pending, approved, allocated, released, rejected, cancelled);
    }

    // /**
    //  * Calculate urgency level breakdown
    //  */
    private Map<String, Long> calculateUrgencyBreakdown(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        Map<String, Long> urgencyMap = new LinkedHashMap<>();

        for (UrgencyLevel level : UrgencyLevel.values()) {
            Long count = hasDateRange(startDateTime, endDateTime)
                    ? bloodBagRequestRepository.countByUrgencyLevelAndRequestedAtBetween(level, startDateTime, endDateTime)
                    : bloodBagRequestRepository.countByUrgencyLevel(level);
            urgencyMap.put(level.name(), count);
        }

        return urgencyMap;
    }

    /**
     * Calculate request category breakdown
     */
    private Map<String, Long> calculateCategoryBreakdown(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        Map<String, Long> categoryMap = new LinkedHashMap<>();

        for (RequestCategory category : RequestCategory.values()) {
            Long count = hasDateRange(startDateTime, endDateTime)
                    ? bloodBagRequestRepository.countByRequestCategoryAndRequestedAtBetween(category, startDateTime, endDateTime)
                    : bloodBagRequestRepository.countByRequestCategory(category);
            categoryMap.put(category.name(), count);
        }

        return categoryMap;
    }

    /**
     * Calculate current blood type inventory
     * Only counts AVAILABLE bags
     */
    private Map<String, Long> calculateBloodTypeInventory() {
        Map<String, Long> inventoryMap = new LinkedHashMap<>();

        // Blood types in correct order
        BloodType[] bloodTypes = {
            BloodType.O_NEG, BloodType.O_POS,
            BloodType.A_NEG, BloodType.A_POS,
            BloodType.B_NEG, BloodType.B_POS,
            BloodType.AB_NEG, BloodType.AB_POS
        };

        for (BloodType type : bloodTypes) {
            Long count = bloodBagRepository.countByBloodTypeAndStatus(type, BagStatus.AVAILABLE);
            inventoryMap.put(type.getDisplayName(), count != null ? count : 0L);
        }

        return inventoryMap;
    }

    /**
     * Calculate dispatch type metrics
     */
    private Map<String, Long> calculateDispatchMetrics(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        Map<String, Long> dispatchMap = new LinkedHashMap<>();

        for (DispatchType type : DispatchType.values()) {
            Long count = hasDateRange(startDateTime, endDateTime)
                    ? bloodBagDispatchRepository.countByDispatchTypeAndDispatchedAtBetween(type, startDateTime, endDateTime)
                    : bloodBagDispatchRepository.countByDispatchType(type);
            dispatchMap.put(type.name(), count);
        }

        return dispatchMap;
    }

    /**
     * Calculate expiry and quality alerts
     */
    private AlertMetrics calculateAlerts() {

        // Use LocalDateTime (matches entity)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sevenDaysFromNow = now.plusDays(7);

        // Expiring soon (within 7 days)
        Long expiringSoon = bloodBagRepository.countExpiringSoon(now, sevenDaysFromNow);

        // Already expired
        Long expired = bloodBagRepository.countExpired();

        // Quality issues (temporary = 0 or use DISCARDED query)
        Long qualityIssues = 0L;

        return new AlertMetrics(expiringSoon, expired, qualityIssues);
    }

    /**
     * Calculate requester type breakdown
     */
    private Map<String, Long> calculateRequesterTypeBreakdown(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        Map<String, Long> requesterMap = new LinkedHashMap<>();

        if (hasDateRange(startDateTime, endDateTime)) {
            requesterMap.put(
                    RequesterType.HOSPITAL.name(),
                    bloodBagRequestRepository.countByRequesterTypeAndRequestedAtBetween(
                            RequesterType.HOSPITAL, startDateTime, endDateTime
                    )
            );
            requesterMap.put(
                    RequesterType.ANONYMOUS.name(),
                    bloodBagRequestRepository.countByRequesterTypeAndRequestedAtBetween(
                            RequesterType.ANONYMOUS, startDateTime, endDateTime
                    )
            );
        } else {
            List<Object[]> results = bloodBagRequestRepository.countByRequesterTypeGrouped();
            for (Object[] row : results) {
                String type = (String) row[0];
                Long count = ((Number) row[1]).longValue();
                requesterMap.put(type, count);
            }
        }

        // Ensure both types are in map (even if 0)
        if (!requesterMap.containsKey("HOSPITAL")) {
            requesterMap.put("HOSPITAL", 0L);
        }
        if (!requesterMap.containsKey("ANONYMOUS")) {
            requesterMap.put("ANONYMOUS", 0L);
        }

        return requesterMap;
    }

    /**
     * Calculate blood component breakdown
     */
    private Map<String, Long> calculateBloodComponentBreakdown(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        Map<String, Long> componentMap = new LinkedHashMap<>();

        for (BloodBag.ComponentType component : BloodBag.ComponentType.values()) {
            Long count = hasDateRange(startDateTime, endDateTime)
                    ? bloodBagRequestRepository.countByBloodComponentAndRequestedAtBetween(component, startDateTime, endDateTime)
                    : bloodBagRequestRepository.countByBloodComponent(component);
            componentMap.put(component.name(), count);
        }

        return componentMap;
    }

    /**
     * Calculate top 5 requesting hospitals with fulfillment rates
     */
    private List<HospitalMetric> calculateTopHospitals(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<HospitalMetric> hospitals = new ArrayList<>();
        List<Object[]> results = hasDateRange(startDateTime, endDateTime)
                ? bloodBagRequestRepository.getTopRequestingHospitalsInRange(startDateTime, endDateTime)
                : bloodBagRequestRepository.getTopRequestingHospitals();

        for (Object[] row : results) {
            String name = (String) row[0];
            Long requests = ((Number) row[1]).longValue();
            Long fulfilled = ((Number) row[2]).longValue();

            hospitals.add(new HospitalMetric(name, requests, fulfilled));
        }

        return hospitals;
    }

    /**
     * Calculate fulfillment metrics
     * Including fulfillment rate and average days to release
     */
    private FulfillmentMetrics calculateFulfillmentMetrics(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        // Get all requests to calculate total and released
        Long pendingCount = countByStatus(RequestStatus.PENDING, startDateTime, endDateTime);
        Long approvedCount = countByStatus(RequestStatus.APPROVED, startDateTime, endDateTime);
        Long allocatedCount = countByStatus(RequestStatus.ALLOCATED, startDateTime, endDateTime);
        Long releasedCount = countByStatus(RequestStatus.RELEASED, startDateTime, endDateTime);
        Long rejectedCount = countByStatus(RequestStatus.REJECTED, startDateTime, endDateTime);
        Long cancelledCount = countByStatus(RequestStatus.CANCELLED, startDateTime, endDateTime);

        Long totalRequests = pendingCount + approvedCount + allocatedCount + releasedCount + rejectedCount + cancelledCount;

        // Calculate fulfillment rate
        Double fulfillmentRate = totalRequests > 0 
            ? (releasedCount.doubleValue() / totalRequests.doubleValue()) * 100 
            : 0.0;

        // Calculate average days to release
        Double avgDaysToRelease = calculateAverageDaysToRelease(startDateTime, endDateTime);

        return new FulfillmentMetrics(fulfillmentRate, releasedCount, avgDaysToRelease);
    }

    /**
     * Calculate average days between request and release
     */
    private Double calculateAverageDaysToRelease(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        List<BloodBagRequest> releasedRequests = hasDateRange(startDateTime, endDateTime)
                ? bloodBagRequestRepository.findReleasedRequestsInRequestedAtRange(startDateTime, endDateTime)
                : bloodBagRequestRepository.findAllReleasedRequests();

        if (releasedRequests.isEmpty()) {
            return 0.0;
        }

        double totalDays = 0;

        for (BloodBagRequest request : releasedRequests) {
            // Calculate days between request and review/release
            // Using reviewedAt if available, otherwise use current time
            long days = ChronoUnit.DAYS.between(
                request.getRequestedAt().toLocalDate(),
                request.getReviewedAt() != null 
                    ? request.getReviewedAt().toLocalDate() 
                    : java.time.LocalDateTime.now().toLocalDate()
            );
            totalDays += days;
        }

        return totalDays / releasedRequests.size();
    }

    private Long countByStatus(RequestStatus status, LocalDateTime startDateTime, LocalDateTime endDateTime) {
        if (hasDateRange(startDateTime, endDateTime)) {
            return bloodBagRequestRepository.countByStatusAndRequestedAtBetween(status, startDateTime, endDateTime);
        }
        return bloodBagRequestRepository.countByStatus(status);
    }

    private boolean hasDateRange(LocalDateTime startDateTime, LocalDateTime endDateTime) {
        return startDateTime != null && endDateTime != null;
    }
}
