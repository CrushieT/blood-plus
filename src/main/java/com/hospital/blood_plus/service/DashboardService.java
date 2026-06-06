package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.response.AdminDashboardDTO;
import com.hospital.blood_plus.dto.request.RecentActivityDTO;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.repository.BloodBagRepository;
import com.hospital.blood_plus.repository.BloodBagRequestRepository;
import com.hospital.blood_plus.repository.HospitalProfileRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class DashboardService {

    private final BloodBagRepository bloodBagRepository;
    private final BloodBagRequestRepository bloodBagRequestRepository;
    private final HospitalProfileRepository hospitalProfileRepository;
    private final RecentActivityService recentActivityService;  // NEW: Inject activity service

    public DashboardService(BloodBagRepository bloodBagRepository,
                            BloodBagRequestRepository bloodBagRequestRepository,
                            HospitalProfileRepository hospitalProfileRepository,
                            RecentActivityService recentActivityService) {  // NEW: Add to constructor
        this.bloodBagRepository = bloodBagRepository;
        this.bloodBagRequestRepository = bloodBagRequestRepository;
        this.hospitalProfileRepository = hospitalProfileRepository;
        this.recentActivityService = recentActivityService;
    }

    /**
     * Get comprehensive dashboard summary with integrated recent activities
     * Single API call replaces /api/dashboard + /api/activities/recent
     */
    public AdminDashboardDTO getDashboardSummary() {
        // 1. Count critical blood types (≤5 units)
        int criticalCount = countCriticalBloodTypes();

        // 2. Count total hospitals
        long totalHospitals = hospitalProfileRepository.count();

        // 3. Count total available units
        int totalUnits = countTotalAvailableUnits();

        // 4. Count pending requests
        long pendingRequests = bloodBagRequestRepository.countByStatus(BloodBagRequest.RequestStatus.PENDING);

        // 5. Blood bank summary by type (unit count)
        Map<String, Integer> bloodBankSummary = getBloodBankCountByType();

        // 6. Blood bank volume by type (mL)
        Map<String, Integer> bloodBankVolume = getBloodBankVolumeByType();

        // 7. Count open system bags
        int openSystemCount = countOpenSystemBags();

        // 8. Count bags expiring within 7 days
        int expiringSoon = countExpiringBags();

        // NEW: 9. Get recent activities (limit to 10 for dashboard)
        List<RecentActivityDTO> recentActivities = recentActivityService.getRecentActivities(5);
        int totalActivitiesCount = recentActivities.size();

        return new AdminDashboardDTO(
                criticalCount,
                (int) totalHospitals,
                totalUnits,
                (int) pendingRequests,
                bloodBankSummary,
                bloodBankVolume,
                openSystemCount,
                expiringSoon,
                recentActivities,           // NEW
                totalActivitiesCount        // NEW
        );
    }

    /**
     * Count blood types with ≤5 units available
     */
    private int countCriticalBloodTypes() {
        List<Object[]> counts = bloodBagRepository.getBloodBankCountByTypeQuery();
        return (int) counts.stream()
                .filter(row -> ((Long) row[1]) <= 5)
                .count();
    }

    /**
     * Count total units (only AVAILABLE status)
     */
    private int countTotalAvailableUnits() {
        long totalAvailableBags = bloodBagRepository.countTotalAvailableUnits();
        return Math.toIntExact(totalAvailableBags);
    }

    /**
     * Get count of blood units by blood type (only AVAILABLE)
     */
    private Map<String, Integer> getBloodBankCountByType() {
        List<BloodBag> bags = bloodBagRepository.findByStatusOrderByExpiresAtAsc(BloodBag.BagStatus.AVAILABLE);
        Map<String, Integer> countByType = new LinkedHashMap<>();

        // Initialize all blood types
        String[] bloodTypes = {
                "O_NEG", "O_POS", "A_POS", "A_NEG",
                "B_POS", "B_NEG", "AB_POS", "AB_NEG"
        };
        for (String type : bloodTypes) {
            countByType.put(type, 0);
        }

        // Count by blood type
        for (BloodBag bag : bags) {
            if (bag.getBloodType() == null) continue;
            String key = bag.getBloodType().name();
            countByType.put(key, countByType.getOrDefault(key, 0) + 1);
        }

        return countByType;
    }

    /**
     * Get volume (mL) of blood by blood type (only AVAILABLE)
     */
    private Map<String, Integer> getBloodBankVolumeByType() {
        List<BloodBag> bags = bloodBagRepository.findByStatusOrderByExpiresAtAsc(BloodBag.BagStatus.AVAILABLE);
        Map<String, Integer> volumeByType = new LinkedHashMap<>();

        // Initialize all blood types
        String[] bloodTypes = {
                "O_NEG", "O_POS", "A_POS", "A_NEG",
                "B_POS", "B_NEG", "AB_POS", "AB_NEG"
        };
        for (String type : bloodTypes) {
            volumeByType.put(type, 0);
        }

        // Sum volumes by blood type
        for (BloodBag bag : bags) {
            if (bag.getBloodType() == null) continue;
            String key = bag.getBloodType().name();
            volumeByType.put(key, volumeByType.getOrDefault(key, 0) + (bag.getVolumeMl() != null ? bag.getVolumeMl() : 0));
        }

        return volumeByType;
    }

    /**
     * Count bags with open system (converted Whole Blood to PRBC)
     */
    private int countOpenSystemBags() {
        List<BloodBag> bags = bloodBagRepository.findByOpenSystem(true);
        return (int) bags.stream()
                .filter(b -> b.getStatus() == BloodBag.BagStatus.AVAILABLE)
                .count();
    }

    /**
     * Count AVAILABLE bags expiring within 7 days
     */
    private int countExpiringBags() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime soon = now.plusDays(7);

        List<BloodBag> bags = bloodBagRepository.findByStatusOrderByExpiresAtAsc(BloodBag.BagStatus.AVAILABLE);
        return (int) bags.stream()
                .filter(b -> b.getExpiresAt() != null
                        && b.getExpiresAt().isAfter(now)
                        && b.getExpiresAt().isBefore(soon))
                .count();
    }
}
