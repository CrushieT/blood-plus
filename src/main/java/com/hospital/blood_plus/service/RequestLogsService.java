package com.hospital.blood_plus.service;

import com.hospital.blood_plus.model.RequestStatusLog;
import com.hospital.blood_plus.model.RequestFulfillment;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.repository.RequestStatusLogRepository;
import com.hospital.blood_plus.repository.RequestFulfillmentRepository;
import com.hospital.blood_plus.repository.BloodBagRequestRepository;
import com.hospital.blood_plus.dto.response.InsideServedSummaryRow;
import com.hospital.blood_plus.dto.response.LogsSummaryResponse;
import com.hospital.blood_plus.dto.response.OutsideServedSummaryRow;
import com.hospital.blood_plus.dto.response.PaginatedResponse;
import com.hospital.blood_plus.dto.response.ServedBagDetailResponse;
import com.hospital.blood_plus.dto.response.ServedRequestSummaryResponse;
import com.hospital.blood_plus.dto.response.StatusLogExportRowDTO;
import com.hospital.blood_plus.dto.response.FulfillmentExportRowDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class RequestLogsService {
    private static final int SERVED_EXPORT_BATCH_SIZE = 250;

    @Autowired
    private RequestStatusLogRepository statusLogRepository;

    @Autowired
    private RequestFulfillmentRepository fulfillmentRepository;

    @Autowired
    private BloodBagRequestRepository requestRepository;

    /**
     * Fetch status logs with pagination, filtering, and sorting
     */
    public Page<RequestStatusLog> getStatusLogs(
            String search,
            String statusFilter,
            String sort,
            int page,
            int size) {

        Pageable pageable = createPageableForStatusLogs(sort, page, size);
        
        if (search != null && !search.isEmpty()) {
            // Search by request ID
            try {
                Long requestId = Long.parseLong(search);
                if (statusFilter != null && !statusFilter.equals("ALL")) {
                    // ✓ FIXED: Convert String to enum before passing
                    return statusLogRepository.findByRequestIdAndNewStatus(
                            requestId,
                            BloodBagRequest.RequestStatus.valueOf(statusFilter),
                            pageable
                    );
                }
                return statusLogRepository.findByRequestId(requestId, pageable);
            } catch (NumberFormatException e) {
                // Search by reference number
                if (statusFilter != null && !statusFilter.equals("ALL")) {
                    // ✓ FIXED: Convert String to enum before passing
                    return statusLogRepository.findByRequestReferenceNumberAndNewStatus(
                            "%" + search + "%",
                            BloodBagRequest.RequestStatus.valueOf(statusFilter),
                            pageable
                    );
                }
                return statusLogRepository.findByRequestReferenceNumber("%" + search + "%", pageable);
            }
        }

        // No search, filter by status only
        if (statusFilter != null && !statusFilter.equals("ALL")) {
            // ✓ FIXED: Convert String to enum before passing
            return statusLogRepository.findByNewStatus(
                    BloodBagRequest.RequestStatus.valueOf(statusFilter),
                    pageable
            );
        }

        // Return all logs
        return statusLogRepository.findAll(pageable);
    }

    /**
     * Fetch fulfillment logs with pagination, filtering, and sorting
     */
    public Page<RequestFulfillment> getFulfillments(
            String search,
            LocalDateTime dateFrom,
            LocalDateTime dateTo,
            String sort,
            int page,
            int size) {

        Pageable pageable = createPageableForFulfillments(sort, page, size);

        if (search != null && !search.isEmpty()) {
            // Search by request ID (only numeric searches)
            try {
                Long requestId = Long.parseLong(search);
                if (dateFrom != null || dateTo != null) {
                    return fulfillmentRepository.findByRequestIdAndDateRange(
                            requestId,
                            dateFrom,
                            dateTo,
                            pageable
                    );
                }
                return fulfillmentRepository.findByRequestId(requestId, pageable);
            } catch (NumberFormatException e) {
                // For non-numeric searches, return date-filtered results without search
                if (dateFrom != null || dateTo != null) {
                    return fulfillmentRepository.findByDateRange(dateFrom, dateTo, pageable);
                }
                return fulfillmentRepository.findAll(pageable);
            }
        }

        // No search, filter by date range only
        if (dateFrom != null || dateTo != null) {
            return fulfillmentRepository.findByDateRange(dateFrom, dateTo, pageable);
        }

        // Return all fulfillments
        return fulfillmentRepository.findAll(pageable);
    }

    /**
     * Get summary statistics for logs
     * ✓ FIXED: Pass enum values instead of strings
     */
    public LogsSummaryResponse getSummary() {
        LogsSummaryResponse summary = new LogsSummaryResponse();
        
        summary.setTotalFulfillments(fulfillmentRepository.count());
        summary.setTotalStatusChanges(statusLogRepository.count());
        
        // ✓ FIXED: Pass enum type instead of String
        summary.setPendingRequestsCount(
                statusLogRepository.countByNewStatus(BloodBagRequest.RequestStatus.PENDING)
        );
        summary.setReleasedCount(
                statusLogRepository.countByNewStatus(BloodBagRequest.RequestStatus.RELEASED)
        );
        
        return summary;
    }

    /**
     * Get single status log detail
     */
    public RequestStatusLog getStatusLogDetail(Long id) {
        return statusLogRepository.findById(id).orElse(null);
    }

    /**
     * Get single fulfillment detail
     */
    public RequestFulfillment getFulfillmentDetail(Long id) {
        return fulfillmentRepository.findById(id).orElse(null);
    }

    /**
     * Helper method to create Pageable with sorting for STATUS LOGS
     * Uses 'changedAt' for sorting
     */
    private Pageable createPageableForStatusLogs(String sort, int page, int size) {
        Sort.Direction direction = Sort.Direction.DESC;
        String sortField = "changedAt";

        if ("date_desc".equals(sort)) {
            direction = Sort.Direction.DESC;
            sortField = "changedAt";
        } else if ("date_asc".equals(sort)) {
            direction = Sort.Direction.ASC;
            sortField = "changedAt";
        } else if ("request_id".equals(sort)) {
            direction = Sort.Direction.ASC;
            sortField = "request";
        }

        return PageRequest.of(page - 1, size, Sort.by(direction, sortField));
    }

    /**
     * Helper method to create Pageable with sorting for FULFILLMENTS
     * Uses 'fulfilledAt' for sorting
     */
    private Pageable createPageableForFulfillments(String sort, int page, int size) {
        Sort.Direction direction = Sort.Direction.DESC;
        String sortField = "fulfilledAt";

        if ("date_desc".equals(sort)) {
            direction = Sort.Direction.DESC;
            sortField = "fulfilledAt";
        } else if ("date_asc".equals(sort)) {
            direction = Sort.Direction.ASC;
            sortField = "fulfilledAt";
        } else if ("request_id".equals(sort)) {
            direction = Sort.Direction.ASC;
            sortField = "request";
        }

        return PageRequest.of(page - 1, size, Sort.by(direction, sortField));
    }

    /**
     * Helper method to create Pageable with sorting for served logs.
     */
    private Pageable createPageableForServed(String sort, int page, int size) {
        Sort.Direction direction = Sort.Direction.DESC;
        String sortField = "requestedAt";

        if ("date_asc".equalsIgnoreCase(sort)) {
            direction = Sort.Direction.ASC;
            sortField = "requestedAt";
        } else if ("request_id".equalsIgnoreCase(sort)) {
            direction = Sort.Direction.ASC;
            sortField = "id";
        }

        return PageRequest.of(Math.max(page - 1, 0), Math.max(size, 1), Sort.by(direction, sortField));
    }

    /**
     * Export status logs as list
     */
    public List<StatusLogExportRowDTO> exportStatusLogs(
            String search,
            String statusFilter,
            LocalDate startDate,
            LocalDate endDate) {
        String normalizedSearch = hasText(search) ? search.trim() : null;
        Long searchId = parseLongOrNull(normalizedSearch);
        BloodBagRequest.RequestStatus status = parseStatusFilter(statusFilter);
        LocalDateTime from = startDate.atStartOfDay();
        LocalDateTime to = endDate.plusDays(1).atStartOfDay().minusNanos(1);

        return statusLogRepository.findForExport(normalizedSearch, searchId, status, from, to).stream()
                .map(this::toStatusLogExportRow)
                .collect(Collectors.toList());
    }

    /**
     * Export fulfillments as list
     */
    public List<FulfillmentExportRowDTO> exportFulfillments(
            String search,
            LocalDate startDate,
            LocalDate endDate) {
        String normalizedSearch = hasText(search) ? search.trim() : null;
        Long searchId = parseLongOrNull(normalizedSearch);
        LocalDateTime from = startDate.atStartOfDay();
        LocalDateTime to = endDate.plusDays(1).atStartOfDay().minusNanos(1);

        return fulfillmentRepository.findForExport(normalizedSearch, searchId, from, to).stream()
                .map(this::toFulfillmentExportRow)
                .collect(Collectors.toList());
    }

    public PaginatedResponse<ServedRequestSummaryResponse> getServedRequests(
            String search,
            LocalDate startDate,
            LocalDate endDate,
            String requestGroup,
            String sort,
            int page,
            int size) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.max(size, 1);
        Page<BloodBagRequest> requestPage = fetchServedRequestPage(
                search, startDate, endDate, requestGroup, sort, safePage, safeSize
        );
        List<ServedRequestSummaryResponse> rows = mapServedRequests(requestPage.getContent(), false);
        int totalPages = Math.max(requestPage.getTotalPages(), 1);
        return new PaginatedResponse<>(
                rows,
                requestPage.getNumber() + 1,
                totalPages,
                requestPage.getTotalElements(),
                safeSize
        );
    }

    public ServedRequestSummaryResponse getServedRequestDetail(Long requestId) {
        BloodBagRequest request = requestRepository.findById(requestId).orElse(null);
        if (request == null) {
            return null;
        }
        List<RequestFulfillment> requestFulfillments = fulfillmentRepository.findByRequestIdNoPage(requestId);
        requestFulfillments.sort(Comparator.comparing(RequestFulfillment::getFulfilledAt));
        return toServedSummary(request, requestFulfillments, true);
    }

    public List<ServedRequestSummaryResponse> exportServedDetails(
            String search,
            LocalDate startDate,
            LocalDate endDate,
            String requestGroup,
            String sort) {
        List<ServedRequestSummaryResponse> rows = new ArrayList<>();
        int page = 1;
        while (true) {
            Page<BloodBagRequest> requestPage = fetchServedRequestPage(
                    search, startDate, endDate, requestGroup, sort, page, SERVED_EXPORT_BATCH_SIZE
            );
            if (!requestPage.hasContent()) {
                break;
            }
            rows.addAll(mapServedRequests(requestPage.getContent(), true));
            if (page >= requestPage.getTotalPages()) {
                break;
            }
            page++;
        }
        return rows;
    }

    public List<ServedRequestSummaryResponse> exportServedDetails(LocalDate startDate, LocalDate endDate) {
        return exportServedDetails(null, startDate, endDate, "ALL", "date_desc");
    }

    public List<InsideServedSummaryRow> exportInsideServedSummary(LocalDate startDate, LocalDate endDate) {
        List<ServedRequestSummaryResponse> details = exportServedDetails(startDate, endDate);
        Map<String, InsideServedSummaryRow> grouped = new HashMap<>();

        for (ServedRequestSummaryResponse row : details) {
            if ("HOSPITAL".equalsIgnoreCase(row.getRequesterType())) {
                continue;
            }

            String ward = hasText(row.getWardRoom()) ? row.getWardRoom().trim() : "Unspecified Ward";
            String component = hasText(row.getBloodComponent()) ? row.getBloodComponent().trim() : "UNKNOWN";
            String key = ward + "||" + component;

            InsideServedSummaryRow current = grouped.computeIfAbsent(
                    key,
                    k -> new InsideServedSummaryRow(ward, component, 0, 0)
            );

            current.setServedUnits(current.getServedUnits() + safeInt(row.getServedUnits()));
            current.setUnservedUnits(current.getUnservedUnits() + safeInt(row.getUnservedUnits()));
        }

        return grouped.values().stream()
                .sorted(Comparator.comparing(InsideServedSummaryRow::getWard)
                        .thenComparing(InsideServedSummaryRow::getComponent))
                .collect(Collectors.toList());
    }

    public List<OutsideServedSummaryRow> exportOutsideServedSummary(LocalDate startDate, LocalDate endDate) {
        List<ServedRequestSummaryResponse> details = exportServedDetails(startDate, endDate);
        Map<String, OutsideServedSummaryRow> grouped = new HashMap<>();

        for (ServedRequestSummaryResponse row : details) {
            if (!"HOSPITAL".equalsIgnoreCase(row.getRequesterType())) {
                continue;
            }

            String hospital = hasText(row.getHospitalName()) ? row.getHospitalName().trim() : "Unknown Hospital";
            OutsideServedSummaryRow current = grouped.computeIfAbsent(
                    hospital,
                    k -> new OutsideServedSummaryRow(hospital, 0, 0)
            );
            current.setServedUnits(current.getServedUnits() + safeInt(row.getServedUnits()));
            current.setUnservedUnits(current.getUnservedUnits() + safeInt(row.getUnservedUnits()));
        }

        return grouped.values().stream()
                .sorted(Comparator.comparing(OutsideServedSummaryRow::getHospital))
                .collect(Collectors.toList());
    }

    private Page<BloodBagRequest> fetchServedRequestPage(
            String search,
            LocalDate startDate,
            LocalDate endDate,
            String requestGroup,
            String sort,
            int page,
            int size) {
        String normalizedSearch = hasText(search) ? search.trim() : null;
        Long searchId = parseLongOrNull(normalizedSearch);
        String normalizedGroup = normalizeRequestGroup(requestGroup);
        LocalDateTime basisFrom = startDate != null ? startDate.atStartOfDay() : null;
        LocalDateTime basisTo = endDate != null ? endDate.plusDays(1).atStartOfDay().minusNanos(1) : null;
        Pageable pageable = createPageableForServed(sort, page, size);

        return requestRepository.findServedRequestsForLogs(
                normalizedSearch,
                searchId,
                normalizedGroup,
                BloodBagRequest.RequesterType.HOSPITAL,
                BloodBagRequest.RequestCategory.OUTPATIENT,
                BloodBagRequest.RequestCategory.INPATIENT,
                BloodBagRequest.RequestCategory.HOSPITAL,
                basisFrom,
                basisTo,
                BloodBagRequest.RequestStatus.RELEASED,
                pageable
        );
    }

    private List<ServedRequestSummaryResponse> mapServedRequests(
            List<BloodBagRequest> requests,
            boolean includeBagDetails) {
        if (requests == null || requests.isEmpty()) {
            return new ArrayList<>();
        }

        List<Long> requestIds = requests.stream()
                .map(BloodBagRequest::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        if (requestIds.isEmpty()) {
            return new ArrayList<>();
        }

        List<RequestFulfillment> fulfillments = fulfillmentRepository.findByRequestIdsForServedSummary(requestIds);
        Map<Long, List<RequestFulfillment>> byRequestId = fulfillments.stream()
                .filter(f -> f.getRequest() != null && f.getRequest().getId() != null)
                .collect(Collectors.groupingBy(f -> f.getRequest().getId()));

        List<ServedRequestSummaryResponse> rows = new ArrayList<>(requests.size());
        for (BloodBagRequest request : requests) {
            List<RequestFulfillment> requestFulfillments = byRequestId.getOrDefault(request.getId(), new ArrayList<>());
            ServedRequestSummaryResponse row = toServedSummary(request, requestFulfillments, includeBagDetails);
            if (!shouldIncludeInServedTab(request, row)) {
                continue;
            }
            rows.add(row);
        }
        return rows;
    }

    private ServedRequestSummaryResponse toServedSummary(
            BloodBagRequest request,
            List<RequestFulfillment> requestFulfillments,
            boolean includeBagDetails) {
        ServedRequestSummaryResponse row = new ServedRequestSummaryResponse();
        row.setRequestId(request.getId());
        row.setReferenceNumber(request.getReferenceNumber());
        row.setPatientName(request.getPatientName());
        row.setRequesterType(request.getRequesterType() != null ? request.getRequesterType().name() : null);
        row.setRequestCategory(resolveRequestCategory(request));
        row.setHospitalName(request.getHospitalProfile() != null ? request.getHospitalProfile().getHospitalName() : null);
        row.setWardRoom(request.getWardRoom());
        row.setBloodType(request.getBloodType() != null ? request.getBloodType().name() : null);
        row.setBloodComponent(request.getBloodComponent() != null ? request.getBloodComponent().name() : null);
        row.setRequestedUnits(resolveRequestedUnits(request));
        row.setApprovedUnits(request.getApprovedUnits());

        int requestedUnits = resolveRequestedUnits(request);
        int servedUnits = resolveServedUnits(request, requestedUnits);
        int unservedUnits = Math.max(requestedUnits - servedUnits, 0);

        row.setServedUnits(servedUnits);
        row.setUnservedUnits(unservedUnits);
        row.setResult(resolveResult(servedUnits, requestedUnits));
        row.setLastServedAt(resolveLastServedAt(requestFulfillments));
        row.setUnservedReason(resolveUnservedReason(request, servedUnits, unservedUnits));

        if (includeBagDetails) {
            List<ServedBagDetailResponse> servedBags = requestFulfillments.stream()
                    .sorted(Comparator.comparing(RequestFulfillment::getFulfilledAt))
                    .map(this::toServedBagDetail)
                    .collect(Collectors.toList());
            row.setServedBags(servedBags);
        }

        return row;
    }

    private ServedBagDetailResponse toServedBagDetail(RequestFulfillment fulfillment) {
        ServedBagDetailResponse bag = new ServedBagDetailResponse();
        bag.setFulfillmentId(fulfillment.getId());

        BloodBag bloodBag = fulfillment.getBloodBag();
        if (bloodBag != null) {
            bag.setBloodBagId(bloodBag.getId());
            bag.setSerialNumber(bloodBag.getSerialNumber());
            bag.setBloodType(bloodBag.getBloodType() != null ? bloodBag.getBloodType().name() : null);
            bag.setComponent(bloodBag.getComponentType() != null ? bloodBag.getComponentType().name() : null);
            bag.setVolumeMl(bloodBag.getVolumeMl());
        }

        bag.setFulfilledAt(fulfillment.getFulfilledAt());
        bag.setFulfilledBy(fulfillment.getFulfilledBy() != null ? fulfillment.getFulfilledBy().getUsername() : "System");
        bag.setNotes(fulfillment.getNotes());
        return bag;
    }

    private int resolveRequestedUnits(BloodBagRequest request) {
        if (request.getNumberOfUnits() != null && request.getNumberOfUnits() > 0) {
            return request.getNumberOfUnits();
        }
        return 0;
    }

    private String resolveRequestCategory(BloodBagRequest request) {
        if (request.getRequestCategory() != null) {
            return request.getRequestCategory().name();
        }
        if (request.getRequesterType() == BloodBagRequest.RequesterType.HOSPITAL) {
            return BloodBagRequest.RequestCategory.OUTPATIENT.name();
        }
        if (request.getRequesterType() == BloodBagRequest.RequesterType.ANONYMOUS) {
            return BloodBagRequest.RequestCategory.INPATIENT.name();
        }
        return null;
    }

    private int resolveServedUnits(BloodBagRequest request, int requestedUnits) {
        if (request.getApprovedUnits() != null && request.getApprovedUnits() > 0) {
            return request.getApprovedUnits();
        }
        // If no approved units are stored, treat the request as fully served.
        return Math.max(requestedUnits, 0);
    }

    private String resolveResult(int servedUnits, int requestedUnits) {
        if (servedUnits <= 0 && requestedUnits > 0) {
            return "Unserved";
        }
        if (requestedUnits == 0) {
            return servedUnits > 0 ? "Served" : "Unserved";
        }
        if (servedUnits >= requestedUnits) {
            return "Served";
        }
        return "Partially Served";
    }

    private String resolveUnservedReason(BloodBagRequest request, int servedUnits, int unservedUnits) {
        if (unservedUnits <= 0) {
            return null;
        }
        if (hasText(request.getUnservedReason())) {
            return request.getUnservedReason().trim();
        }
        if (servedUnits > 0) {
            return "No compatible stock available for remaining units.";
        }
        return "No compatible stock available.";
    }

    private LocalDateTime resolveLastServedAt(List<RequestFulfillment> requestFulfillments) {
        return requestFulfillments.stream()
                .map(RequestFulfillment::getFulfilledAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    private boolean shouldIncludeInServedTab(BloodBagRequest request, ServedRequestSummaryResponse row) {
        boolean hasServedBags = safeInt(row.getServedUnits()) > 0;
        boolean markedReleased = request.getStatus() == BloodBagRequest.RequestStatus.RELEASED;
        boolean hasUnservedReason = hasText(request.getUnservedReason());
        return hasServedBags || markedReleased || hasUnservedReason;
    }

    private BloodBagRequest.RequestStatus parseStatusFilter(String statusFilter) {
        if (!hasText(statusFilter) || "ALL".equalsIgnoreCase(statusFilter.trim())) {
            return null;
        }
        return BloodBagRequest.RequestStatus.valueOf(statusFilter.trim().toUpperCase());
    }

    private StatusLogExportRowDTO toStatusLogExportRow(RequestStatusLog log) {
        StatusLogExportRowDTO row = new StatusLogExportRowDTO();
        row.setLogId(log.getId());
        row.setRequestId(log.getRequest() != null ? log.getRequest().getId() : null);
        row.setReferenceNumber(log.getRequest() != null ? log.getRequest().getReferenceNumber() : null);
        row.setOldStatus(log.getOldStatus() != null ? log.getOldStatus().name() : null);
        row.setNewStatus(log.getNewStatus() != null ? log.getNewStatus().name() : null);
        row.setChangedByUsername(log.getChangedBy() != null ? log.getChangedBy().getUsername() : "System");
        row.setChangedByEmail(log.getChangedBy() != null ? log.getChangedBy().getEmail() : null);
        row.setChangedAt(log.getChangedAt());
        row.setNotes(log.getNotes());
        return row;
    }

    private FulfillmentExportRowDTO toFulfillmentExportRow(RequestFulfillment fulfillment) {
        FulfillmentExportRowDTO row = new FulfillmentExportRowDTO();
        row.setFulfillmentId(fulfillment.getId());
        row.setRequestId(fulfillment.getRequest() != null ? fulfillment.getRequest().getId() : null);
        row.setReferenceNumber(fulfillment.getRequest() != null ? fulfillment.getRequest().getReferenceNumber() : null);
        row.setBloodBagId(fulfillment.getBloodBag() != null ? fulfillment.getBloodBag().getId() : null);
        row.setSerialNumber(fulfillment.getBloodBag() != null ? fulfillment.getBloodBag().getSerialNumber() : null);
        row.setBloodType(
                fulfillment.getBloodBag() != null && fulfillment.getBloodBag().getBloodType() != null
                        ? fulfillment.getBloodBag().getBloodType().name()
                        : null
        );
        row.setComponentType(
                fulfillment.getBloodBag() != null && fulfillment.getBloodBag().getComponentType() != null
                        ? fulfillment.getBloodBag().getComponentType().name()
                        : null
        );
        row.setVolumeMl(fulfillment.getBloodBag() != null ? fulfillment.getBloodBag().getVolumeMl() : null);
        row.setFulfilledAt(fulfillment.getFulfilledAt());
        row.setFulfilledByUsername(fulfillment.getFulfilledBy() != null ? fulfillment.getFulfilledBy().getUsername() : "System");
        row.setNotes(fulfillment.getNotes());
        return row;
    }

    private String normalizeRequestGroup(String requestGroup) {
        if (!hasText(requestGroup)) {
            return "ALL";
        }
        String normalized = requestGroup.trim().toUpperCase();
        if ("INPATIENT".equals(normalized)) {
            return "INHOUSE";
        }
        if ("OUTPATIENT".equals(normalized)) {
            return "OPD";
        }
        if ("ALL".equals(normalized)
                || "HOSPITAL_OUTPATIENT".equals(normalized)
                || "INHOUSE".equals(normalized)
                || "OPD".equals(normalized)
                || "HOSPITAL".equals(normalized)) {
            return normalized;
        }
        return "ALL";
    }

    private Long parseLongOrNull(String value) {
        if (!hasText(value)) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private int safeInt(Integer value) {
        return value != null ? value : 0;
    }
}
