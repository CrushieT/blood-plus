package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.RequestFulfillment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for RequestFulfillment entity
 * Handles all database queries for fulfillment records
 */
@Repository
public interface RequestFulfillmentRepository extends JpaRepository<RequestFulfillment, Long> {

    boolean existsByBloodBag_Id(Long bloodBagId);

    // ═══════════════════════════════════════════════════════════════
    // PAGINATION QUERIES (WITH PAGEABLE)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Find fulfillments by request ID with pagination
     */
    @Query("SELECT f FROM RequestFulfillment f WHERE f.request.id = :requestId")
    Page<RequestFulfillment> findByRequestId(@Param("requestId") Long requestId, Pageable pageable);

    /**
     * Find fulfillments by date range with pagination
     */
    @Query("SELECT f FROM RequestFulfillment f " +
           "WHERE (:dateFrom IS NULL OR CAST(f.fulfilledAt AS date) >= CAST(:dateFrom AS date)) " +
           "AND (:dateTo IS NULL OR CAST(f.fulfilledAt AS date) <= CAST(:dateTo AS date))")
    Page<RequestFulfillment> findByDateRange(
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            Pageable pageable
    );

    /**
     * Find fulfillments by request ID and date range with pagination
     */
    @Query("SELECT f FROM RequestFulfillment f WHERE f.request.id = :requestId " +
           "AND (:dateFrom IS NULL OR CAST(f.fulfilledAt AS date) >= CAST(:dateFrom AS date)) " +
           "AND (:dateTo IS NULL OR CAST(f.fulfilledAt AS date) <= CAST(:dateTo AS date))")
    Page<RequestFulfillment> findByRequestIdAndDateRange(
            @Param("requestId") Long requestId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            Pageable pageable
    );

    // ═══════════════════════════════════════════════════════════════
    // NON-PAGINATION QUERIES (WITHOUT PAGEABLE)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Find fulfillments by request ID without pagination
     */
    @Query("SELECT f FROM RequestFulfillment f WHERE f.request.id = :requestId ORDER BY f.fulfilledAt DESC")
    List<RequestFulfillment> findByRequestIdNoPage(@Param("requestId") Long requestId);

    /**
     * Find fulfillments by date range without pagination
     */
    @Query("SELECT f FROM RequestFulfillment f " +
           "WHERE (:dateFrom IS NULL OR CAST(f.fulfilledAt AS date) >= CAST(:dateFrom AS date)) " +
           "AND (:dateTo IS NULL OR CAST(f.fulfilledAt AS date) <= CAST(:dateTo AS date)) " +
           "ORDER BY f.fulfilledAt DESC")
    List<RequestFulfillment> findByDateRangeNoPage(
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo
    );

    /**
     * Find fulfillments by request ID and date range without pagination
     */
    @Query("SELECT f FROM RequestFulfillment f WHERE f.request.id = :requestId " +
           "AND (:dateFrom IS NULL OR CAST(f.fulfilledAt AS date) >= CAST(:dateFrom AS date)) " +
           "AND (:dateTo IS NULL OR CAST(f.fulfilledAt AS date) <= CAST(:dateTo AS date)) " +
           "ORDER BY f.fulfilledAt DESC")
    List<RequestFulfillment> findByRequestIdAndDateRangeNoPage(
            @Param("requestId") Long requestId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo
    );

    @Query("SELECT rf FROM RequestFulfillment rf ORDER BY rf.fulfilledAt DESC")
    List<RequestFulfillment> findRecentFulfillments(Pageable pageable);
 
    @Query("SELECT rf FROM RequestFulfillment rf WHERE rf.fulfilledAt >= :since ORDER BY rf.fulfilledAt DESC")
    List<RequestFulfillment> findFulfillmentsSince(LocalDateTime since, Pageable pageable);
 
    @Query("SELECT rf FROM RequestFulfillment rf WHERE rf.request.id = :requestId")
    List<RequestFulfillment> findByRequestId(Long requestId);

    @Query("""
        SELECT f
        FROM RequestFulfillment f
        LEFT JOIN FETCH f.bloodBag
        LEFT JOIN FETCH f.fulfilledBy
        WHERE f.request.id IN :requestIds
        ORDER BY f.request.id ASC, f.fulfilledAt DESC
    """)
    List<RequestFulfillment> findByRequestIdsForServedSummary(@Param("requestIds") List<Long> requestIds);

    @Query("""
        SELECT f
        FROM RequestFulfillment f
        JOIN FETCH f.request r
        JOIN FETCH f.bloodBag b
        LEFT JOIN FETCH f.fulfilledBy u
        WHERE (:dateFrom IS NULL OR f.fulfilledAt >= :dateFrom)
          AND (:dateTo IS NULL OR f.fulfilledAt <= :dateTo)
          AND (
                :search IS NULL
                OR TRIM(:search) = ''
                OR (:searchId IS NOT NULL AND r.id = :searchId)
                OR LOWER(COALESCE(r.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(b.serialNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.patientName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
        ORDER BY f.fulfilledAt DESC
    """)
    List<RequestFulfillment> findForExport(
            @Param("search") String search,
            @Param("searchId") Long searchId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo
    );
}
