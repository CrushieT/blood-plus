package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBag.ComponentType;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.BloodBagRequest.RequestCategory;
import com.hospital.blood_plus.model.BloodBagRequest.RequestStatus;
import com.hospital.blood_plus.model.BloodBagRequest.RequesterType;
import com.hospital.blood_plus.model.BloodBagRequest.UrgencyLevel;
import com.hospital.blood_plus.model.HospitalProfile;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Page;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BloodBagRequestRepository extends JpaRepository<BloodBagRequest, Long> {
    interface StatusCountRow {
        RequestStatus getStatus();
        long getTotal();
    }

    // Fetch all requests made by a specific AppUser
    List<BloodBagRequest> findByRequestedByOrderByRequestedAtDesc(AppUser user);

    // Fetch all DONOR-type requests (for admin)
    List<BloodBagRequest> findByRequesterTypeOrderByRequestedAtDesc(
        BloodBagRequest.RequesterType type
    );

    // Fetch all requests with a specific status
    List<BloodBagRequest> findByStatusOrderByRequestedAtDesc(
        BloodBagRequest.RequestStatus status
    );

    // Blood Bag request Anonymous user
    Optional<BloodBagRequest> findByReferenceNumber(String referenceNumber);

    Optional<BloodBagRequest> findByConfirmationToken(String confirmationToken);

    List<BloodBagRequest> findAllByOrderByRequestedAtDesc();

    List<BloodBagRequest> findByStatus(BloodBagRequest.RequestStatus status);

    @Query("""
        SELECT r
        FROM BloodBagRequest r
        LEFT JOIN r.hospitalProfile hp
        WHERE (:status IS NULL OR r.status = :status)
          AND (:bloodType IS NULL OR r.bloodType = :bloodType)
          AND (:componentType IS NULL OR r.bloodComponent = :componentType)
          AND (:from IS NULL OR r.requestedAt >= :from)
          AND (:to IS NULL OR r.requestedAt <= :to)
          AND (
                :search IS NULL
                OR TRIM(:search) = ''
                OR LOWER(COALESCE(r.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.patientName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.requesterName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(hp.hospitalName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
    """)
    Page<BloodBagRequest> findForAdminList(
            @Param("status") BloodBagRequest.RequestStatus status,
            @Param("bloodType") BloodBag.BloodType bloodType,
            @Param("componentType") ComponentType componentType,
            @Param("search") String search,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable
    );

    @Query("""
        SELECT r.status AS status, COUNT(r) AS total
        FROM BloodBagRequest r
        LEFT JOIN r.hospitalProfile hp
        WHERE (:bloodType IS NULL OR r.bloodType = :bloodType)
          AND (:componentType IS NULL OR r.bloodComponent = :componentType)
          AND (:from IS NULL OR r.requestedAt >= :from)
          AND (:to IS NULL OR r.requestedAt <= :to)
          AND (
                :search IS NULL
                OR TRIM(:search) = ''
                OR LOWER(COALESCE(r.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.patientName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.requesterName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(hp.hospitalName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
        GROUP BY r.status
    """)
    List<StatusCountRow> countForAdminStatusSummary(
            @Param("search") String search,
            @Param("bloodType") BloodBag.BloodType bloodType,
            @Param("componentType") ComponentType componentType,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    @Query("""
        SELECT r
        FROM BloodBagRequest r
        WHERE r.hospitalProfile = :hospital
          AND (:status IS NULL OR r.status = :status)
          AND (:bloodType IS NULL OR r.bloodType = :bloodType)
          AND (:componentType IS NULL OR r.bloodComponent = :componentType)
          AND (:urgencyLevel IS NULL OR r.urgencyLevel = :urgencyLevel)
          AND (:from IS NULL OR r.requestedAt >= :from)
          AND (:to IS NULL OR r.requestedAt <= :to)
          AND (
                :search IS NULL
                OR TRIM(:search) = ''
                OR LOWER(COALESCE(r.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.patientName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.requesterName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
    """)
    Page<BloodBagRequest> findForHospitalList(
            @Param("hospital") HospitalProfile hospital,
            @Param("status") BloodBagRequest.RequestStatus status,
            @Param("bloodType") BloodBag.BloodType bloodType,
            @Param("componentType") ComponentType componentType,
            @Param("urgencyLevel") UrgencyLevel urgencyLevel,
            @Param("search") String search,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable
    );

    @Query("""
        SELECT r.status AS status, COUNT(r) AS total
        FROM BloodBagRequest r
        WHERE r.hospitalProfile = :hospital
          AND (:bloodType IS NULL OR r.bloodType = :bloodType)
          AND (:componentType IS NULL OR r.bloodComponent = :componentType)
          AND (:urgencyLevel IS NULL OR r.urgencyLevel = :urgencyLevel)
          AND (:from IS NULL OR r.requestedAt >= :from)
          AND (:to IS NULL OR r.requestedAt <= :to)
          AND (
                :search IS NULL
                OR TRIM(:search) = ''
                OR LOWER(COALESCE(r.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.patientName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                OR LOWER(COALESCE(r.requesterName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
              )
        GROUP BY r.status
    """)
    List<StatusCountRow> countForHospitalStatusSummary(
            @Param("hospital") HospitalProfile hospital,
            @Param("search") String search,
            @Param("bloodType") BloodBag.BloodType bloodType,
            @Param("componentType") ComponentType componentType,
            @Param("urgencyLevel") UrgencyLevel urgencyLevel,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    @Query("""
        SELECT r
        FROM BloodBagRequest r
        LEFT JOIN r.hospitalProfile hp
        WHERE (
            EXISTS (SELECT 1 FROM RequestFulfillment f WHERE f.request = r)
            OR r.status = :releasedStatus
            OR (r.unservedReason IS NOT NULL AND TRIM(r.unservedReason) <> '')
        )
        AND (
            :search IS NULL
            OR TRIM(:search) = ''
            OR (:searchId IS NOT NULL AND r.id = :searchId)
            OR LOWER(COALESCE(r.referenceNumber, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(r.patientName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(r.requesterName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(hp.hospitalName, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(r.wardRoom, '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(CONCAT('', r.bloodType), '')) LIKE LOWER(CONCAT('%', :search, '%'))
            OR LOWER(COALESCE(CONCAT('', r.bloodComponent), '')) LIKE LOWER(CONCAT('%', :search, '%'))
        )
        AND (
            :requestGroup = 'ALL'
            OR (:requestGroup = 'HOSPITAL_OUTPATIENT'
                AND (r.requesterType = :hospitalRequesterType OR r.requestCategory = :outpatientCategory))
            OR (:requestGroup = 'INHOUSE' AND r.requestCategory = :inpatientCategory)
            OR (:requestGroup = 'OPD' AND r.requestCategory = :outpatientCategory)
            OR (:requestGroup = 'HOSPITAL'
                AND (r.requesterType = :hospitalRequesterType OR r.requestCategory = :hospitalCategory))
        )
        AND (
            :basisFrom IS NULL
            OR COALESCE(
                (SELECT MAX(f2.fulfilledAt) FROM RequestFulfillment f2 WHERE f2.request = r),
                r.reviewedAt,
                r.requestedAt
            ) >= :basisFrom
        )
        AND (
            :basisTo IS NULL
            OR COALESCE(
                (SELECT MAX(f2.fulfilledAt) FROM RequestFulfillment f2 WHERE f2.request = r),
                r.reviewedAt,
                r.requestedAt
            ) <= :basisTo
        )
    """)
    Page<BloodBagRequest> findServedRequestsForLogs(
            @Param("search") String search,
            @Param("searchId") Long searchId,
            @Param("requestGroup") String requestGroup,
            @Param("hospitalRequesterType") RequesterType hospitalRequesterType,
            @Param("outpatientCategory") RequestCategory outpatientCategory,
            @Param("inpatientCategory") RequestCategory inpatientCategory,
            @Param("hospitalCategory") RequestCategory hospitalCategory,
            @Param("basisFrom") LocalDateTime basisFrom,
            @Param("basisTo") LocalDateTime basisTo,
            @Param("releasedStatus") RequestStatus releasedStatus,
            Pageable pageable
    );

    List<BloodBagRequest> findByRequesterEmail(String email);
    // NEW: Get all requests for a specific hospital
    List<BloodBagRequest> findByHospitalProfile(HospitalProfile hospital);
    
    // Optional: Get by hospital and status (for filtering)
    List<BloodBagRequest> findByHospitalProfileAndStatusOrderByRequestedAtDesc(
            HospitalProfile hospital, BloodBagRequest.RequestStatus status);
    long countByStatus(BloodBagRequest.RequestStatus status);
    long countByStatusAndRequestedAtBetween(BloodBagRequest.RequestStatus status, LocalDateTime start, LocalDateTime end);
    
 
    Long countByUrgencyLevel(UrgencyLevel urgencyLevel);
    Long countByUrgencyLevelAndRequestedAtBetween(UrgencyLevel urgencyLevel, LocalDateTime start, LocalDateTime end);
 
    Long countByRequestCategory(RequestCategory requestCategory);
    Long countByRequestCategoryAndRequestedAtBetween(RequestCategory requestCategory, LocalDateTime start, LocalDateTime end);
 
    Long countByRequesterType(RequesterType requesterType);
    Long countByRequesterTypeAndRequestedAtBetween(RequesterType requesterType, LocalDateTime start, LocalDateTime end);
 
    Long countByBloodComponent(ComponentType bloodComponent);
    Long countByBloodComponentAndRequestedAtBetween(ComponentType bloodComponent, LocalDateTime start, LocalDateTime end);
 
    @Query("SELECT r FROM BloodBagRequest r WHERE r.status = 'RELEASED' ORDER BY r.requestedAt")
    List<BloodBagRequest> findAllReleasedRequests();

    @Query("""
        SELECT r
        FROM BloodBagRequest r
        WHERE r.status = 'RELEASED'
          AND r.requestedAt >= :startDate
          AND r.requestedAt <= :endDate
        ORDER BY r.requestedAt
    """)
    List<BloodBagRequest> findReleasedRequestsInRequestedAtRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
 
    @Query(value = """
        SELECT hp.hospital_name, COUNT(bbr.id) as total_requests,
               SUM(CASE WHEN bbr.status = 'RELEASED' THEN 1 ELSE 0 END) as fulfilled
        FROM blood_bag_requests bbr
        LEFT JOIN hospital_profiles hp ON bbr.hospital_profile_id = hp.id
        WHERE bbr.requester_type = 'HOSPITAL'
        GROUP BY hp.id, hp.hospital_name
        ORDER BY total_requests DESC
        """, nativeQuery = true)
    List<Object[]> getTopRequestingHospitals();

    @Query(value = """
        SELECT hp.hospital_name, COUNT(bbr.id) as total_requests,
               SUM(CASE WHEN bbr.status = 'RELEASED' THEN 1 ELSE 0 END) as fulfilled
        FROM blood_bag_requests bbr
        LEFT JOIN hospital_profiles hp ON bbr.hospital_profile_id = hp.id
        WHERE bbr.requester_type = 'HOSPITAL'
          AND bbr.requested_at >= :startDate
          AND bbr.requested_at <= :endDate
        GROUP BY hp.id, hp.hospital_name
        ORDER BY total_requests DESC
        """, nativeQuery = true)
    List<Object[]> getTopRequestingHospitalsInRange(
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
 
    @Query(value = """
        SELECT requester_type, COUNT(*) as count
        FROM blood_bag_requests
        GROUP BY requester_type
        """, nativeQuery = true)
    List<Object[]> countByRequesterTypeGrouped();

    @Query("SELECT bbr FROM BloodBagRequest bbr ORDER BY bbr.requestedAt DESC")
    List<BloodBagRequest> findRecentRequests(Pageable pageable);
 
    @Query("SELECT bbr FROM BloodBagRequest bbr WHERE bbr.requestedAt >= :since ORDER BY bbr.requestedAt DESC")
    List<BloodBagRequest> findRequestsSince(LocalDateTime since, Pageable pageable);
 
    @Query("SELECT bbr FROM BloodBagRequest bbr WHERE bbr.status = :status AND bbr.requestedAt >= :since ORDER BY bbr.requestedAt DESC")
    List<BloodBagRequest> findRequestsByStatusSince(RequestStatus status, LocalDateTime since, Pageable pageable);
}
