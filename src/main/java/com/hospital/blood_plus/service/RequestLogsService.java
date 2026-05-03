package com.hospital.blood_plus.service;

import com.hospital.blood_plus.model.RequestStatusLog;
import com.hospital.blood_plus.model.RequestFulfillment;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.repository.RequestStatusLogRepository;
import com.hospital.blood_plus.repository.RequestFulfillmentRepository;
import com.hospital.blood_plus.dto.response.LogsSummaryResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class RequestLogsService {

    @Autowired
    private RequestStatusLogRepository statusLogRepository;

    @Autowired
    private RequestFulfillmentRepository fulfillmentRepository;

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
     * Export status logs as list
     */
    public List<RequestStatusLog> exportStatusLogs(String search, String statusFilter) {
        if (search != null && !search.isEmpty()) {
            try {
                Long requestId = Long.parseLong(search);
                if (statusFilter != null && !statusFilter.equals("ALL")) {
                    // ✓ FIXED: Convert String to enum before passing
                    return statusLogRepository.findByRequestIdAndNewStatusNoPage(
                            requestId,
                            BloodBagRequest.RequestStatus.valueOf(statusFilter)
                    );
                }
                return statusLogRepository.findByRequestIdNoPage(requestId);
            } catch (NumberFormatException e) {
                if (statusFilter != null && !statusFilter.equals("ALL")) {
                    // ✓ FIXED: Convert String to enum before passing
                    return statusLogRepository.findByRequestReferenceNumberAndNewStatusNoPage(
                            "%" + search + "%",
                            BloodBagRequest.RequestStatus.valueOf(statusFilter)
                    );
                }
                return statusLogRepository.findByRequestReferenceNumberNoPage("%" + search + "%");
            }
        }

        if (statusFilter != null && !statusFilter.equals("ALL")) {
            // ✓ FIXED: Convert String to enum before passing
            return statusLogRepository.findByNewStatusNoPage(
                    BloodBagRequest.RequestStatus.valueOf(statusFilter)
            );
        }

        return statusLogRepository.findAll();
    }

    /**
     * Export fulfillments as list
     */
    public List<RequestFulfillment> exportFulfillments(String search, LocalDateTime dateFrom, LocalDateTime dateTo) {
        if (search != null && !search.isEmpty()) {
            try {
                Long requestId = Long.parseLong(search);
                if (dateFrom != null || dateTo != null) {
                    return fulfillmentRepository.findByRequestIdAndDateRangeNoPage(requestId, dateFrom, dateTo);
                }
                return fulfillmentRepository.findByRequestIdNoPage(requestId);
            } catch (NumberFormatException e) {
                // For non-numeric searches, return date-filtered results without search
                if (dateFrom != null || dateTo != null) {
                    return fulfillmentRepository.findByDateRangeNoPage(dateFrom, dateTo);
                }
                return fulfillmentRepository.findAll();
            }
        }

        if (dateFrom != null || dateTo != null) {
            return fulfillmentRepository.findByDateRangeNoPage(dateFrom, dateTo);
        }

        return fulfillmentRepository.findAll();
    }
}