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
        RequestMetrics requests = calculateRequestMetrics();
        // Map<String, Long> urgency = calculateUrgencyBreakdown();
        Map<String, Long> category = calculateCategoryBreakdown();
        Map<String, Long> bloodTypes = calculateBloodTypeInventory();
        Map<String, Long> dispatch = calculateDispatchMetrics();
        AlertMetrics alerts = calculateAlerts();
        Map<String, Long> requesterType = calculateRequesterTypeBreakdown();
        Map<String, Long> bloodComponent = calculateBloodComponentBreakdown();
        List<HospitalMetric> hospitals = calculateTopHospitals();
        FulfillmentMetrics fulfillmentMetrics = calculateFulfillmentMetrics();

        return new AnalyticsDTO(
            requests,
            // urgency,
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
    private RequestMetrics calculateRequestMetrics() {
        Long pending = bloodBagRequestRepository.countByStatus(RequestStatus.PENDING);
        Long approved = bloodBagRequestRepository.countByStatus(RequestStatus.APPROVED);
        Long allocated = bloodBagRequestRepository.countByStatus(RequestStatus.ALLOCATED);
        Long released = bloodBagRequestRepository.countByStatus(RequestStatus.RELEASED);
        Long rejected = bloodBagRequestRepository.countByStatus(RequestStatus.REJECTED);
        Long cancelled = bloodBagRequestRepository.countByStatus(RequestStatus.CANCELLED);

        return new RequestMetrics(pending, approved, allocated, released, rejected, cancelled);
    }

    // /**
    //  * Calculate urgency level breakdown
    //  */
    // private Map<String, Long> calculateUrgencyBreakdown() {
    //     Map<String, Long> urgencyMap = new LinkedHashMap<>();

    //     for (UrgencyLevel level : UrgencyLevel.values()) {
    //         Long count = bloodBagRequestRepository.countByUrgencyLevel(level);
    //         urgencyMap.put(level.name(), count);
    //     }

    //     return urgencyMap;
    // }

    /**
     * Calculate request category breakdown
     */
    private Map<String, Long> calculateCategoryBreakdown() {
        Map<String, Long> categoryMap = new LinkedHashMap<>();

        for (RequestCategory category : RequestCategory.values()) {
            Long count = bloodBagRequestRepository.countByRequestCategory(category);
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
    private Map<String, Long> calculateDispatchMetrics() {
        Map<String, Long> dispatchMap = new LinkedHashMap<>();

        for (DispatchType type : DispatchType.values()) {
            Long count = bloodBagDispatchRepository.countByDispatchType(type);
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
    private Map<String, Long> calculateRequesterTypeBreakdown() {
        Map<String, Long> requesterMap = new LinkedHashMap<>();

        List<Object[]> results = bloodBagRequestRepository.countByRequesterTypeGrouped();

        for (Object[] row : results) {
            String type = (String) row[0];
            Long count = ((Number) row[1]).longValue();
            requesterMap.put(type, count);
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
    private Map<String, Long> calculateBloodComponentBreakdown() {
        Map<String, Long> componentMap = new LinkedHashMap<>();

        for (BloodBag.ComponentType component : BloodBag.ComponentType.values()) {
            Long count = bloodBagRequestRepository.countByBloodComponent(component);
            componentMap.put(component.name(), count);
        }

        return componentMap;
    }

    /**
     * Calculate top 5 requesting hospitals with fulfillment rates
     */
    private List<HospitalMetric> calculateTopHospitals() {
        List<HospitalMetric> hospitals = new ArrayList<>();
        List<Object[]> results = bloodBagRequestRepository.getTopRequestingHospitals();

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
    private FulfillmentMetrics calculateFulfillmentMetrics() {
        // Get all requests to calculate total and released
        Long pendingCount = bloodBagRequestRepository.countByStatus(RequestStatus.PENDING);
        Long approvedCount = bloodBagRequestRepository.countByStatus(RequestStatus.APPROVED);
        Long allocatedCount = bloodBagRequestRepository.countByStatus(RequestStatus.ALLOCATED);
        Long releasedCount = bloodBagRequestRepository.countByStatus(RequestStatus.RELEASED);
        Long rejectedCount = bloodBagRequestRepository.countByStatus(RequestStatus.REJECTED);
        Long cancelledCount = bloodBagRequestRepository.countByStatus(RequestStatus.CANCELLED);

        Long totalRequests = pendingCount + approvedCount + allocatedCount + releasedCount + rejectedCount + cancelledCount;

        // Calculate fulfillment rate
        Double fulfillmentRate = totalRequests > 0 
            ? (releasedCount.doubleValue() / totalRequests.doubleValue()) * 100 
            : 0.0;

        // Calculate average days to release
        Double avgDaysToRelease = calculateAverageDaysToRelease();

        return new FulfillmentMetrics(fulfillmentRate, releasedCount, avgDaysToRelease);
    }

    /**
     * Calculate average days between request and release
     */
    private Double calculateAverageDaysToRelease() {
        List<BloodBagRequest> releasedRequests = bloodBagRequestRepository.findAllReleasedRequests();

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
}