package com.hospital.blood_plus.service;

import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.RequestStatusLog;
import com.hospital.blood_plus.repository.RequestStatusLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

/**
 * Service to handle status logging for blood bag requests.
 * Automatically logs every status change with user information and notes.
 * 
 * SIMPLIFIED VERSION - Assumes user is always passed from controller
 * (Controller extracts user with: userRepository.findByEmail(userDetails.getUsername()))
 */
@Service
public class RequestStatusLogService {

    private static final Logger logger = LoggerFactory.getLogger(RequestStatusLogService.class);

    @Autowired
    private RequestStatusLogRepository requestStatusLogRepository;

    /**
     * Logs a status change for a blood bag request.
     * 
     * @param request The blood bag request (must not be null)
     * @param oldStatus The previous status (must not be null)
     * @param newStatus The new status (must not be null)
     * @param changedBy The user who made the change (must not be null)
     * @param notes Additional notes about the status change
     * @return The saved RequestStatusLog entity
     * @throws IllegalArgumentException if any required parameter is null
     */
    @Transactional
    public RequestStatusLog logStatusChange(
            BloodBagRequest request,
            BloodBagRequest.RequestStatus oldStatus,
            BloodBagRequest.RequestStatus newStatus,
            AppUser changedBy,
            String notes) {
        
        try {
            // Validate that all required fields are not null
            if (request == null) {
                throw new IllegalArgumentException("Request cannot be null");
            }
            if (oldStatus == null) {
                throw new IllegalArgumentException("Old status cannot be null");
            }
            if (newStatus == null) {
                throw new IllegalArgumentException("New status cannot be null");
            }
            if (changedBy == null) {
                throw new IllegalArgumentException("User (changedBy) cannot be null. Extract user in controller with: userRepository.findByEmail(userDetails.getUsername())");
            }

            // Create and populate log entity
            RequestStatusLog log = new RequestStatusLog();
            log.setRequest(request);
            log.setOldStatus(oldStatus);
            log.setNewStatus(newStatus);
            log.setChangedBy(changedBy);
            log.setNotes(notes != null && !notes.isBlank() ? notes : "No notes provided");

            // Save to database
            RequestStatusLog savedLog = requestStatusLogRepository.save(log);
            
            // Log success
            logger.info("✓ Status change logged for Request ID {}: {} → {} by user {}",
                    request.getId(),
                    oldStatus,
                    newStatus,
                    changedBy.getEmail());

            return savedLog;
            
        } catch (IllegalArgumentException e) {
            logger.error("✗ Validation error logging status change: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            logger.error("✗ Database error logging status change for Request ID {}: {}", 
                    request != null ? request.getId() : "unknown",
                    e.getMessage(), e);
            throw new RuntimeException("Failed to log status change: " + e.getMessage(), e);
        }
    }

    /**
     * Logs a status change without explicit notes parameter.
     * Auto-generates a default note from the status transition.
     * 
     * @param request The blood bag request (must not be null)
     * @param oldStatus The previous status (must not be null)
     * @param newStatus The new status (must not be null)
     * @param changedBy The user who made the change (must not be null)
     * @return The saved RequestStatusLog entity
     */
    @Transactional
    public RequestStatusLog logStatusChange(
            BloodBagRequest request,
            BloodBagRequest.RequestStatus oldStatus,
            BloodBagRequest.RequestStatus newStatus,
            AppUser changedBy) {
        
        String defaultNotes = String.format("Status changed from %s to %s", oldStatus, newStatus);
        return logStatusChange(request, oldStatus, newStatus, changedBy, defaultNotes);
    }

    /**
     * Retrieves all status logs for a specific request.
     * Returns logs in reverse chronological order (most recent first).
     * 
     * @param requestId The blood bag request ID
     * @return List of RequestStatusLog entities, empty list if none found
     */
    @Transactional(readOnly = true)
    public List<RequestStatusLog> getLogsForRequest(Long requestId) {
        try {
            if (requestId == null || requestId <= 0) {
                throw new IllegalArgumentException("Request ID must be a valid positive number");
            }
            return requestStatusLogRepository.findByRequestIdOrderByChangedAtDesc(requestId);
        } catch (Exception e) {
            logger.error("✗ Error retrieving logs for Request ID {}: {}", requestId, e.getMessage());
            throw new RuntimeException("Failed to retrieve status logs", e);
        }
    }

    /**
     * Retrieves status logs for a request from the BloodBagRequest entity.
     * 
     * @param request The blood bag request
     * @return List of RequestStatusLog entities, empty list if none found
     */
    @Transactional(readOnly = true)
    public List<RequestStatusLog> getLogsForRequest(BloodBagRequest request) {
        if (request == null || request.getId() == null) {
            throw new IllegalArgumentException("Request and request ID cannot be null");
        }
        return getLogsForRequest(request.getId());
    }

    /**
     * Retrieves all status changes made by a specific user.
     * Useful for auditing user activities.
     * 
     * @param userId The user ID
     * @return List of all RequestStatusLog entities created by this user
     */
    @Transactional(readOnly = true)
    public List<RequestStatusLog> getLogsByUser(Long userId) {
        try {
            if (userId == null || userId <= 0) {
                throw new IllegalArgumentException("User ID must be a valid positive number");
            }
            return requestStatusLogRepository.findByChangedByIdOrderByChangedAtDesc(userId);
        } catch (Exception e) {
            logger.error("✗ Error retrieving logs for User ID {}: {}", userId, e.getMessage());
            throw new RuntimeException("Failed to retrieve status logs by user", e);
        }
    }

    /**
     * Retrieves all logs where the new status matches the given status.
     * 
     * @param status The request status to filter by
     * @return List of all RequestStatusLog entities with this new status
     */
    @Transactional(readOnly = true)
    public List<RequestStatusLog> getLogsByNewStatus(BloodBagRequest.RequestStatus status) {
        try {
            if (status == null) {
                throw new IllegalArgumentException("Status cannot be null");
            }
            return requestStatusLogRepository.findByNewStatusOrderByChangedAtDesc(status);
        } catch (Exception e) {
            logger.error("✗ Error retrieving logs by status {}: {}", status, e.getMessage());
            throw new RuntimeException("Failed to retrieve status logs by status", e);
        }
    }

    /**
     * Gets the total count of status changes for a request.
     * 
     * @param requestId The blood bag request ID
     * @return Number of status changes
     */
    @Transactional(readOnly = true)
    public long getStatusChangeCount(Long requestId) {
        try {
            if (requestId == null || requestId <= 0) {
                throw new IllegalArgumentException("Request ID must be a valid positive number");
            }
            return requestStatusLogRepository.countByRequestId(requestId);
        } catch (Exception e) {
            logger.error("✗ Error counting logs for Request ID {}: {}", requestId, e.getMessage());
            throw new RuntimeException("Failed to count status logs", e);
        }
    }

    /**
     * Retrieves the most recent status change for a request.
     * 
     * @param requestId The blood bag request ID
     * @return The most recent RequestStatusLog, or null if no logs exist
     */
    @Transactional(readOnly = true)
    public RequestStatusLog getLatestLogForRequest(Long requestId) {
        try {
            if (requestId == null || requestId <= 0) {
                throw new IllegalArgumentException("Request ID must be a valid positive number");
            }
            List<RequestStatusLog> logs = getLogsForRequest(requestId);
            return logs.isEmpty() ? null : logs.get(0);
        } catch (Exception e) {
            logger.error("✗ Error retrieving latest log for Request ID {}: {}", requestId, e.getMessage());
            throw new RuntimeException("Failed to retrieve latest status log", e);
        }
    }
}