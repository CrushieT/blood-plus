package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.RequestStatusLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * JPA Repository for RequestStatusLog entity.
 * Provides database operations for status change logging.
 */
@Repository
public interface RequestStatusLogRepository extends JpaRepository<RequestStatusLog, Long> {

    /**
     * Find all logs for a specific request, ordered by most recent first.
     */
    List<RequestStatusLog> findByRequestIdOrderByChangedAtDesc(Long requestId);

    /**
     * Find all logs for a specific request, ordered by oldest first.
     */
    List<RequestStatusLog> findByRequestIdOrderByChangedAtAsc(Long requestId);

    /**
     * Find all logs created by a specific user, ordered by most recent first.
     */
    List<RequestStatusLog> findByChangedByIdOrderByChangedAtDesc(Long changedById);

    /**
     * Find all logs where the new status matches the given status.
     */
    List<RequestStatusLog> findByNewStatusOrderByChangedAtDesc(BloodBagRequest.RequestStatus newStatus);

    /**
     * Find all logs where the old status matches the given status.
     */
    List<RequestStatusLog> findByOldStatusOrderByChangedAtDesc(BloodBagRequest.RequestStatus oldStatus);

    /**
     * Count total logs for a specific request.
     */
    long countByRequestId(Long requestId);

    /**
     * Find the first (most recent) log for a request.
     */
    Optional<RequestStatusLog> findFirstByRequestIdOrderByChangedAtDesc(Long requestId);

    /**
     * Find logs for a request within a specific time range.
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.id = :requestId " +
           "AND l.changedAt BETWEEN :startDate AND :endDate " +
           "ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findLogsInDateRange(
            @Param("requestId") Long requestId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);

    /**
     * Find all transitions from one status to another for audit purposes.
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.oldStatus = :oldStatus " +
           "AND l.newStatus = :newStatus ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findStatusTransitions(
            @Param("oldStatus") BloodBagRequest.RequestStatus oldStatus,
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus);

    /**
     * Count transitions from one status to another.
     */
    @Query("SELECT COUNT(l) FROM RequestStatusLog l WHERE l.oldStatus = :oldStatus " +
           "AND l.newStatus = :newStatus")
    long countStatusTransitions(
            @Param("oldStatus") BloodBagRequest.RequestStatus oldStatus,
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus);

    /**
     * Find logs created within a specific time period.
     */
    List<RequestStatusLog> findByChangedAtBetweenOrderByChangedAtDesc(
            LocalDateTime startDate,
            LocalDateTime endDate);

    /**
     * Find all logs for a request after a specific date.
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.id = :requestId " +
           "AND l.changedAt >= :date ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findLogsAfterDate(
            @Param("requestId") Long requestId,
            @Param("date") LocalDateTime date);
}