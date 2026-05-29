package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.BloodBankIntakeRequest;
import com.hospital.blood_plus.dto.request.DiscardBagRequest;
import com.hospital.blood_plus.dto.response.AdminDashboardResponse;
import com.hospital.blood_plus.dto.response.BloodBagAvailableDTO;
import com.hospital.blood_plus.dto.response.BloodBagResponse;
import com.hospital.blood_plus.dto.response.PaginatedResponse;
import com.hospital.blood_plus.model.*;
import com.hospital.blood_plus.model.BloodBag.BagSource;
import com.hospital.blood_plus.model.BloodBag.BagStatus;
import com.hospital.blood_plus.model.BloodBag.ComponentType;
import com.hospital.blood_plus.model.BloodBag.RhType;
import com.hospital.blood_plus.model.BloodBag.BloodType;
import com.hospital.blood_plus.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BloodBagService {

    private final BloodBagRepository          bloodBagRepository;
    private final BloodBagDispatchRepository  bloodBagDispatchRepository;

    public BloodBagService(BloodBagRepository bloodBagRepository,
                           BloodBagDispatchRepository bloodBagDispatchRepository) {
        this.bloodBagRepository         = bloodBagRepository;
        this.bloodBagDispatchRepository = bloodBagDispatchRepository;
    }

    // ── Receive stock from BMC ────────────────────────────────────

    public BloodBagResponse receiveStock(BloodBankIntakeRequest req, AppUser receivedBy) {
        if (bloodBagRepository.existsBySerialNumber(req.getSerialNumber())) {
            throw new IllegalArgumentException(
                "Serial number already exists: " + req.getSerialNumber());
        }

        BloodType bloodType = req.resolveBloodType();
        if (bloodType == null) {
            throw new IllegalArgumentException("Blood type and Rh type are required.");
        }

        BloodBag bag = new BloodBag();
        bag.setSerialNumber(req.getSerialNumber());
        bag.setTransactionNumber(req.getTransactionNumber());
        bag.setBloodType(bloodType);                          // e.g. A_NEG, O_POS
        bag.setRhType(req.getRhType());                       // still stored separately
        bag.setComponentType(req.getComponentType() != null
                ? req.getComponentType() : ComponentType.WHOLE_BLOOD);
        bag.setVolumeMl(req.getVolumeMl());
        bag.setRemarks(req.getRemarks());
        bag.setCollectedAt(req.getCollectedAt() != null
                ? req.getCollectedAt() : LocalDateTime.now());
        bag.setExpiresAt(req.getExpiresAt());
        bag.setSource(req.getSource() != null ? req.getSource() : BagSource.TRANSFER);
        bag.setStatus(BagStatus.AVAILABLE);
        bag.setReceivedBy(receivedBy);

        return mapToResponse(bloodBagRepository.save(bag));
    }

    

    // ── Get all bags ──────────────────────────────────────────────

    public List<BloodBagResponse> getAllBags() {
        return bloodBagRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public PaginatedResponse<BloodBagResponse> getBagsPage(
            int page,
            int size,
            BagStatus status,
            String search
    ) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 200);
        String normalizedSearch = (search == null || search.trim().isEmpty()) ? null : search.trim();

        Pageable pageable = PageRequest.of(
                safePage - 1,
                safeSize,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<BloodBag> bagsPage = bloodBagRepository.findForAdmin(status, normalizedSearch, pageable);
        List<BloodBagResponse> rows = bagsPage.getContent()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        int totalPages = Math.max(bagsPage.getTotalPages(), 1);
        return new PaginatedResponse<>(
                rows,
                bagsPage.getNumber() + 1,
                totalPages,
                bagsPage.getTotalElements(),
                bagsPage.getSize()
        );
    }

    // ── Inventory summary ─────────────────────────────────────────

    public Map<String, Object> getInventorySummary() {
        LocalDateTime now  = LocalDateTime.now();
        LocalDateTime soon = now.plusDays(7);

        List<BloodBag> available = bloodBagRepository.findByStatus(BagStatus.AVAILABLE)
                .stream()
                .filter(b -> b.getExpiresAt() != null && b.getExpiresAt().isAfter(now))
                .collect(Collectors.toList());

        // Key format: "O_NEG_NEGATIVE", "O_POS_POSITIVE" — matches frontend INVENTORY_LABEL map
        Map<String, Integer> countByType  = new LinkedHashMap<>();
        Map<String, Integer> volumeByType = new LinkedHashMap<>();

        for (BloodBag bag : available) {
            String key = bag.getBloodType().name() + "_" + bag.getRhType().name();
            countByType.merge(key, 1, Integer::sum);
            volumeByType.merge(key,
                    bag.getVolumeMl() != null ? bag.getVolumeMl() : 0,
                    Integer::sum);
        }

        // countByComponent
        Map<String, Integer> countByComponent = new LinkedHashMap<>();
        for (BloodBag bag : available) {
            countByComponent.merge(bag.getComponentType().name(), 1, Integer::sum);
        }

        long expiringSoon = available.stream()
                .filter(b -> b.getExpiresAt().isBefore(soon))
                .count();

        long openSystemCount = available.stream()
                .filter(BloodBag::isOpenSystem)
                .count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("countByType",      countByType);
        summary.put("countByComponent", countByComponent);
        summary.put("volumeByType",     volumeByType);
        summary.put("totalAvailable",   available.size());
        summary.put("expiringSoon",     expiringSoon);
        summary.put("openSystemCount",  openSystemCount);

        return summary;
    }

    // ── Discard ───────────────────────────────────────────────────

    public BloodBagResponse discardBag(Long bagId, DiscardBagRequest request, AppUser discardedBy) {
        BloodBag bag = bloodBagRepository.findById(bagId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Blood bag not found"));

        if (bag.getStatus() == BagStatus.DISCARDED) {
            throw new IllegalStateException("Bag is already discarded.");
        }
        if (bag.getStatus() == BagStatus.DISPENSED) {
            throw new IllegalStateException("Cannot discard a dispensed bag.");
        }

        bag.setStatus(BagStatus.DISCARDED);
        bag.setDiscardReason(request.getReason());
        bloodBagRepository.save(bag);

        BloodBagDispatch dispatch = new BloodBagDispatch();
        dispatch.setBloodBag(bag);
        dispatch.setDispatchType(BloodBagDispatch.DispatchType.DISCARDED);
        dispatch.setDispatchedBy(discardedBy);
        dispatch.setNotes(request.getReason());
        bloodBagDispatchRepository.save(dispatch);

        return mapToResponse(bag);
    }

    // ── Open system conversion ────────────────────────────────────

    public BloodBagResponse convertToOpenSystem(Long bagId) {
        BloodBag bag = bloodBagRepository.findById(bagId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Blood bag not found"));

        if (bag.getComponentType() != ComponentType.WHOLE_BLOOD) {
            throw new IllegalStateException("Only Whole Blood bags can be converted.");
        }
        if (bag.isOpenSystem()) {
            throw new IllegalStateException("Bag is already an open system.");
        }
        if (bag.getStatus() != BagStatus.AVAILABLE) {
            throw new IllegalStateException("Only available bags can be converted.");
        }

        bag.convertToOpenSystem();
        return mapToResponse(bloodBagRepository.save(bag));
    }

    // ── Auto-expire (called by scheduler) ────────────────────────

    public void autoExpireBags() {
        List<BloodBag> expired = bloodBagRepository.findExpiredBags(LocalDateTime.now());
        expired.forEach(b -> b.setStatus(BagStatus.EXPIRED));
        bloodBagRepository.saveAll(expired);
    }

    // ── Admin dashboard summary ───────────────────────────────────

    public AdminDashboardResponse getDashboardSummary() {
        LocalDateTime now = LocalDateTime.now();

        List<BloodBag> available = bloodBagRepository.findByStatus(BagStatus.AVAILABLE)
                .stream()
                .filter(b -> b.getExpiresAt() != null && b.getExpiresAt().isAfter(now))
                .collect(Collectors.toList());

        Map<String, Long> countByType = available.stream()
                .collect(Collectors.groupingBy(
                        b -> b.getBloodType().name(),
                        Collectors.counting()));

        int criticalCount = (int) countByType.values().stream()
                .filter(count -> count <= 5)
                .count();

        AdminDashboardResponse res = new AdminDashboardResponse();
        res.setCriticalBloodTypes(criticalCount);
        res.setBloodBankSummary(countByType);
        return res;
    }

    public List<BloodBagAvailableDTO> getAvailableBags(
            BloodType requestedType,
            BloodBag.ComponentType requestedComponent) {
 
        // Fetch all compatible donor types for this recipient
        List<BloodType> compatibleTypes = COMPATIBLE_DONORS.getOrDefault(
                requestedType, List.of(requestedType));
 
        // Query all AVAILABLE bags across all compatible types
        List<BloodBag> pool = bloodBagRepository
                .findByBloodTypeInAndStatus(compatibleTypes, BloodBag.BagStatus.AVAILABLE);
 
        LocalDateTime now = LocalDateTime.now();
 
        List<BloodBag> compatible = new ArrayList<>();
        List<BloodBag> others     = new ArrayList<>();
 
        for (BloodBag bag : pool) {
            // Skip expired
            if (bag.getExpiresAt() != null && bag.getExpiresAt().isBefore(now)) continue;
 
            boolean componentMatch = requestedComponent == null
                    || bag.getComponentType() == requestedComponent;
 
            // Exact type + component = fully compatible
            // Wrong component but right type family = shown as "other"
            if (componentMatch) compatible.add(bag);
            else                others.add(bag);
        }
 
        // Sort both groups soonest-to-expire first (FIFO — use oldest stock first)
        Comparator<BloodBag> byExpiry = Comparator.comparing(
                b -> b.getExpiresAt() != null ? b.getExpiresAt() : LocalDateTime.MAX);
        compatible.sort(byExpiry);
        others.sort(byExpiry);
 
        List<BloodBagAvailableDTO> result = new ArrayList<>();
        boolean firstCompatible = true;
 
        for (BloodBag bag : compatible) {
            // Exact blood type match = fully compatible
            // Compatible-but-not-exact (e.g. O_NEG for A_POS) = compatible=true but recommended only if no exact match
            boolean isExactType = bag.getBloodType() == requestedType;
            result.add(BloodBagAvailableDTO.from(bag, true, firstCompatible && isExactType
                    ? true   // exact type gets recommended first
                    : firstCompatible)); // fallback: first available gets recommended
            firstCompatible = false;
        }
        for (BloodBag bag : others) {
            result.add(BloodBagAvailableDTO.from(bag, false, false));
        }
 
        return result;
    }

    // ── Helpers ───────────────────────────────────────────────────

    private static final Map<BloodType, List<BloodType>> COMPATIBLE_DONORS;
    static {
        COMPATIBLE_DONORS = new EnumMap<>(BloodType.class);
        COMPATIBLE_DONORS.put(BloodType.A_POS,  List.of(BloodType.A_POS, BloodType.A_NEG, BloodType.O_POS, BloodType.O_NEG));
        COMPATIBLE_DONORS.put(BloodType.A_NEG,  List.of(BloodType.A_NEG, BloodType.O_NEG));
        COMPATIBLE_DONORS.put(BloodType.B_POS,  List.of(BloodType.B_POS, BloodType.B_NEG, BloodType.O_POS, BloodType.O_NEG));
        COMPATIBLE_DONORS.put(BloodType.B_NEG,  List.of(BloodType.B_NEG, BloodType.O_NEG));
        COMPATIBLE_DONORS.put(BloodType.AB_POS, List.of(BloodType.A_POS, BloodType.A_NEG, BloodType.B_POS, BloodType.B_NEG,
                                                         BloodType.AB_POS, BloodType.AB_NEG, BloodType.O_POS, BloodType.O_NEG));
        COMPATIBLE_DONORS.put(BloodType.AB_NEG, List.of(BloodType.A_NEG, BloodType.B_NEG, BloodType.AB_NEG, BloodType.O_NEG));
        COMPATIBLE_DONORS.put(BloodType.O_POS,  List.of(BloodType.O_POS, BloodType.O_NEG));
        COMPATIBLE_DONORS.put(BloodType.O_NEG,  List.of(BloodType.O_NEG));
    }

    private BloodBagResponse mapToResponse(BloodBag bag) {
        BloodBagResponse res = new BloodBagResponse();
        res.setId(bag.getId());
        res.setSerialNumber(bag.getSerialNumber());
        res.setTransactionNumber(bag.getTransactionNumber());
        res.setBloodType(bag.getBloodType());
        res.setRhType(bag.getRhType());
        res.setComponentType(bag.getComponentType());
        res.setVolumeMl(bag.getVolumeMl());
        res.setRemarks(bag.getRemarks());
        res.setCollectedAt(bag.getCollectedAt());
        res.setExpiresAt(bag.getExpiresAt());
        res.setStatus(bag.getStatus());
        res.setSource(bag.getSource());
        res.setOpenSystem(bag.isOpenSystem());
        res.setOpenSystemAt(bag.getOpenSystemAt());
        res.setDiscardReason(bag.getDiscardReason());
        res.setReceivedBy(bag.getReceivedBy() != null
                ? bag.getReceivedBy().getUsername() : null);

        bag.getDispatches().stream()
                .filter(d -> d.getDispatchType() == BloodBagDispatch.DispatchType.USED)
                .findFirst()
                .ifPresent(d -> {
                    res.setDispensedTo(d.getDispensedTo());
                    res.setDispensedAt(d.getDispatchedAt());
                });

     

        return res;
    }


    ////// HOSPITAL ACCOUNT ///////////
    // ──────────────────────────────────────────────────────────────
    // Blood Type Availability
    // ──────────────────────────────────────────────────────────────
 
    /**
     * Get availability status for all blood types
     * Returns: Map<BloodType, AvailabilityStatus>
     * Status: AVAILABLE, LOW_STOCK, NOT_AVAILABLE
     */
    public Map<String, Map<String, Object>> getAllBloodTypeAvailability() {
        Map<String, Map<String, Object>> result = new LinkedHashMap<>();
 
        for (BloodBag.BloodType bt : BloodBag.BloodType.values()) {
            int count = countAvailableBagsByBloodType(bt);
            result.put(formatBloodType(bt), buildAvailabilityMap(count));
        }
 
        return result;
    }
 
    /**
     * Count available blood bags by blood type (not expired, not used)
     */
    private int countAvailableBagsByBloodType(BloodBag.BloodType bloodType) {
        LocalDateTime now = LocalDateTime.now();
        List<BloodBag> bags = bloodBagRepository.findByBloodTypeAndStatus(
                bloodType, BloodBag.BagStatus.AVAILABLE);
        
        return (int) bags.stream()
                .filter(bag -> bag.getExpiresAt().isAfter(now))
                .count();
    }
 
    /**
     * Get single blood type availability
     */
    public Map<String, Object> getBloodTypeAvailability(String bloodTypeStr) {
        try {
            BloodBag.BloodType bloodType = BloodBag.BloodType.valueOf(bloodTypeStr);
            int count = countAvailableBagsByBloodType(bloodType);
            return buildAvailabilityMap(count);
        } catch (IllegalArgumentException e) {
            return Map.of("status", "INVALID", "count", 0);
        }
    }
 
    /**
     * Map count to status threshold
     * CRITICAL: 0 bags
     * LOW_STOCK: 1-5 bags
     * AVAILABLE: 6+ bags
     */
    private Map<String, Object> buildAvailabilityMap(int count) {
        String status;
        String label;
        String color;
 
        if (count == 0) {
            status = "NOT_AVAILABLE";
            label = "Not Available";
            color = "not-available";
        } else if (count >= 1 && count <= 5) {
            status = "LOW_STOCK";
            label = "Low Stock";
            color = "low-stock";
        } else {
            status = "AVAILABLE";
            label = "Available";
            color = "available";
        }
 
        return Map.of(
                "status", status,
                "label", label,
                "color", color,
                "count", count,
                "threshold", Map.of(
                        "low", 5,
                        "critical", 0
                )
        );
    }
 
    // ──────────────────────────────────────────────────────────────
    // Blood Component Availability
    // ──────────────────────────────────────────────────────────────
 
    /**
     * Get availability for all blood components
     */
    public Map<String, Map<String, Object>> getAllComponentAvailability() {
        Map<String, Map<String, Object>> result = new LinkedHashMap<>();
 
        BloodBag.ComponentType[] components = {
                BloodBag.ComponentType.WHOLE_BLOOD,
                BloodBag.ComponentType.PRBC,
                BloodBag.ComponentType.LEUKOREDUCED_PRBC,
                BloodBag.ComponentType.ALIQUOTED_PRBC,
                BloodBag.ComponentType.PLATELET_CONCENTRATE,
                BloodBag.ComponentType.FRESH_FROZEN_PLASMA,
                BloodBag.ComponentType.CRYOPRECIPITATE,
                BloodBag.ComponentType.CRYOSUPERNATANT
        };
 
        for (BloodBag.ComponentType comp : components) {
            int count = countAvailableBagsByComponent(comp);
            result.put(formatComponentType(comp), buildComponentAvailabilityMap(comp, count));
        }
 
        return result;
    }
 
    /**
     * Count available bags by component type
     */
    private int countAvailableBagsByComponent(BloodBag.ComponentType componentType) {
        LocalDateTime now = LocalDateTime.now();
        List<BloodBag> bags = bloodBagRepository.findByComponentTypeAndStatus(
                componentType, BloodBag.BagStatus.AVAILABLE);
        
        return (int) bags.stream()
                .filter(bag -> bag.getExpiresAt().isAfter(now))
                .count();
    }
 
    /**
     * Get single component availability
     */
    public Map<String, Object> getComponentAvailability(String componentStr) {
        try {
            BloodBag.ComponentType componentType = BloodBag.ComponentType.valueOf(componentStr);
            int count = countAvailableBagsByComponent(componentType);
            return buildComponentAvailabilityMap(componentType, count);
        } catch (IllegalArgumentException e) {
            return Map.of("status", "INVALID", "count", 0);
        }
    }

    public BloodBag getBagById(Long bagId) {
        return bloodBagRepository.findById(bagId)
                .orElseThrow(() -> new RuntimeException("Blood bag not found with ID: " + bagId));
    }
    
 
    /**
     * Build component-specific availability map
     * Platelets: LOW threshold at 3 bags (short shelf life of 5 days)
     * Other components: LOW threshold at 5 bags
     */
    private Map<String, Object> buildComponentAvailabilityMap(
            BloodBag.ComponentType componentType, int count) {
 
        int lowThreshold = componentType == BloodBag.ComponentType.PLATELET_CONCENTRATE ? 3 : 5;
 
        String status;
        String label;
        String color;
 
        if (count == 0) {
            status = "NOT_AVAILABLE";
            label = "Not Available";
            color = "not-available";
        } else if (count >= 1 && count <= lowThreshold) {
            status = "LOW_STOCK";
            label = "Low Stock";
            color = "low-stock";
        } else {
            status = "AVAILABLE";
            label = "Available";
            color = "available";
        }
 
        return Map.of(
                "status", status,
                "label", label,
                "color", color,
                "count", count,
                "displayName", formatComponentDisplay(componentType),
                "abbreviation", formatComponentAbbr(componentType),
                "threshold", Map.of(
                        "low", lowThreshold,
                        "critical", 0
                ),
                "shelfLife", getComponentShelfLife(componentType)
        );
    }
 
    // ──────────────────────────────────────────────────────────────
    // Blood Bank Summary
    // ──────────────────────────────────────────────────────────────
 
    /**
     * Get comprehensive blood bank status for dashboard
     */
    public Map<String, Object> getBloodBankStatus() {
        Map<String, Object> status = new LinkedHashMap<>();
 
        status.put("timestamp", LocalDateTime.now());
        status.put("lastUpdated", "Just now");
        
        Map<String, Map<String, Object>> bloodTypes = getAllBloodTypeAvailability();
        status.put("bloodTypes", bloodTypes);
        
        Map<String, Map<String, Object>> components = getAllComponentAvailability();
        status.put("components", components);
 
        // Summary counts
        int totalAvailable = bloodTypes.values().stream()
                .mapToInt(m -> (Integer) m.get("count"))
                .sum();
 
        int lowStockCount = (int) bloodTypes.values().stream()
                .filter(m -> "LOW_STOCK".equals(m.get("status")))
                .count();
 
        int notAvailableCount = (int) bloodTypes.values().stream()
                .filter(m -> "NOT_AVAILABLE".equals(m.get("status")))
                .count();
 
        status.put("summary", Map.of(
                "totalBagsAvailable", totalAvailable,
                "bloodTypesWithLowStock", lowStockCount,
                "bloodTypesNotAvailable", notAvailableCount,
                "totalBloodTypes", bloodTypes.size()
        ));
 
        return status;
    }
 
    // ──────────────────────────────────────────────────────────────
    // Formatting Utilities
    // ──────────────────────────────────────────────────────────────
 
    private String formatBloodType(BloodBag.BloodType bloodType) {
        return switch (bloodType) {
            case O_POS -> "O+";
            case O_NEG -> "O−";
            case A_POS -> "A+";
            case A_NEG -> "A−";
            case B_POS -> "B+";
            case B_NEG -> "B−";
            case AB_POS -> "AB+";
            case AB_NEG -> "AB−";
        };
    }
 
    private String formatComponentType(BloodBag.ComponentType componentType) {
        return componentType.toString().toLowerCase().replace("_", "-");
    }
 
    private String formatComponentDisplay(BloodBag.ComponentType componentType) {
        return switch (componentType) {
            case WHOLE_BLOOD -> "Whole Blood";
            case PRBC -> "Packed RBC";
            case LEUKOREDUCED_PRBC -> "Leukoreduced PRBC";
            case ALIQUOTED_PRBC -> "Aliquoted PRBC";
            case PLATELET_CONCENTRATE -> "Platelet Concentrate";
            case FRESH_FROZEN_PLASMA -> "Fresh Frozen Plasma";
            case CRYOPRECIPITATE -> "Cryoprecipitate";
            case CRYOSUPERNATANT -> "Cryosupernatant";
        };
    }
 
    private String formatComponentAbbr(BloodBag.ComponentType componentType) {
        return switch (componentType) {
            case WHOLE_BLOOD -> "WB";
            case PRBC -> "PRBC";
            case LEUKOREDUCED_PRBC -> "LR-PRBC";
            case ALIQUOTED_PRBC -> "ALQ-PRBC";
            case PLATELET_CONCENTRATE -> "PC";
            case FRESH_FROZEN_PLASMA -> "FFP";
            case CRYOPRECIPITATE -> "CRYO";
            case CRYOSUPERNATANT -> "CRYO-SN";
        };
    }
 
    private String getComponentShelfLife(BloodBag.ComponentType componentType) {
        return switch (componentType) {
            case WHOLE_BLOOD, PRBC, LEUKOREDUCED_PRBC, ALIQUOTED_PRBC -> "42 days";
            case PLATELET_CONCENTRATE -> "5 days";
            case FRESH_FROZEN_PLASMA, CRYOPRECIPITATE, CRYOSUPERNATANT -> "1 year";
        };
    }

}
