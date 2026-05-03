package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.RequestStatusLog;
import com.hospital.blood_plus.model.BloodBagRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RequestStatusLogRepository extends JpaRepository<RequestStatusLog, Long> {

    /**
     * Find status logs by request ID with pagination
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.id = :requestId")
    Page<RequestStatusLog> findByRequestId(@Param("requestId") Long requestId, Pageable pageable);

    /**
     * Find status logs by request ID without pagination
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.id = :requestId ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findByRequestIdNoPage(@Param("requestId") Long requestId);

    /**
     * Find status logs by request ID and new status with pagination
     * ✓ FIXED: Parameter must be enum type, not String
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.id = :requestId AND l.newStatus = :newStatus")
    Page<RequestStatusLog> findByRequestIdAndNewStatus(
            @Param("requestId") Long requestId,
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus,  // ✓ Enum type
            Pageable pageable
    );

    /**
     * Find status logs by request ID and new status without pagination
     * ✓ FIXED: Parameter must be enum type, not String
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.id = :requestId AND l.newStatus = :newStatus ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findByRequestIdAndNewStatusNoPage(
            @Param("requestId") Long requestId,
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus  // ✓ Enum type
    );

    /**
     * Find status logs by request reference number with pagination
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.referenceNumber LIKE :referenceNumber")
    Page<RequestStatusLog> findByRequestReferenceNumber(
            @Param("referenceNumber") String referenceNumber,
            Pageable pageable
    );

    /**
     * Find status logs by request reference number without pagination
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.referenceNumber LIKE :referenceNumber ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findByRequestReferenceNumberNoPage(
            @Param("referenceNumber") String referenceNumber
    );

    /**
     * Find status logs by request reference number and new status with pagination
     * ✓ FIXED: Parameter must be enum type, not String
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.referenceNumber LIKE :referenceNumber AND l.newStatus = :newStatus")
    Page<RequestStatusLog> findByRequestReferenceNumberAndNewStatus(
            @Param("referenceNumber") String referenceNumber,
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus,  // ✓ Enum type
            Pageable pageable
    );

    /**
     * Find status logs by request reference number and new status without pagination
     * ✓ FIXED: Parameter must be enum type, not String
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.referenceNumber LIKE :referenceNumber AND l.newStatus = :newStatus ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findByRequestReferenceNumberAndNewStatusNoPage(
            @Param("referenceNumber") String referenceNumber,
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus  // ✓ Enum type
    );

    /**
     * Find status logs by new status with pagination
     * ✓ FIXED: Parameter must be enum type, not String
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.newStatus = :newStatus")
    Page<RequestStatusLog> findByNewStatus(
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus,  // ✓ Enum type
            Pageable pageable
    );

    /**
     * Find status logs by new status without pagination
     * ✓ FIXED: Parameter must be enum type, not String
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.newStatus = :newStatus ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findByNewStatusNoPage(
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus  // ✓ Enum type
    );

    /**
     * Count logs by new status
     * ✓ FIXED: Parameter must be enum type, not String
     * 
     * WHY: The entity field is defined as @Enumerated(EnumType.STRING),
     * which means it's stored as STRING in the database, BUT the entity field
     * type is BloodBagRequest.RequestStatus (enum). Hibernate validates parameter
     * types against the entity field type, NOT the database storage type.
     * 
     * String parameters work for simple queries (=, !=, LIKE, comparisons) because
     * Hibernate implicitly converts them, but COUNT() is stricter and requires
     * exact type matching.
     */
    @Query("SELECT COUNT(l) FROM RequestStatusLog l WHERE l.newStatus = :newStatus")
    long countByNewStatus(@Param("newStatus") BloodBagRequest.RequestStatus newStatus);  // ✓ Enum type!

    /**
     * Find all logs for a request ordered by changed at descending
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.request.id = :requestId ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findByRequestIdOrderByChangedAtDesc(@Param("requestId") Long requestId);

    /**
     * Find all logs by changed by user ID ordered by changed at descending
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.changedBy.id = :userId ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findByChangedByIdOrderByChangedAtDesc(@Param("userId") Long userId);

    /**
     * Find all logs by new status ordered by changed at descending
     * ✓ FIXED: Parameter must be enum type, not String
     */
    @Query("SELECT l FROM RequestStatusLog l WHERE l.newStatus = :newStatus ORDER BY l.changedAt DESC")
    List<RequestStatusLog> findByNewStatusOrderByChangedAtDesc(
            @Param("newStatus") BloodBagRequest.RequestStatus newStatus  // ✓ Enum type
    );

    /**
     * Count logs by request ID
     */
    @Query("SELECT COUNT(l) FROM RequestStatusLog l WHERE l.request.id = :requestId")
    long countByRequestId(@Param("requestId") Long requestId);

    @Query("SELECT rsl FROM RequestStatusLog rsl ORDER BY rsl.changedAt DESC")
    List<RequestStatusLog> findRecentStatusLogs(Pageable pageable);
 
    @Query("SELECT rsl FROM RequestStatusLog rsl WHERE rsl.changedAt >= :since ORDER BY rsl.changedAt DESC")
    List<RequestStatusLog> findStatusLogsSince(LocalDateTime since, Pageable pageable);
 
    @Query("SELECT rsl FROM RequestStatusLog rsl WHERE rsl.request.id = :requestId ORDER BY rsl.changedAt DESC")
    List<RequestStatusLog> findByRequestId(Long requestId);
}