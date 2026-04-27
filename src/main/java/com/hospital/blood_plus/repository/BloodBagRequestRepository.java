package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBag.ComponentType;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.BloodBagRequest.RequestCategory;
import com.hospital.blood_plus.model.BloodBagRequest.RequestStatus;
import com.hospital.blood_plus.model.BloodBagRequest.RequesterType;
import com.hospital.blood_plus.model.BloodBagRequest.UrgencyLevel;
import com.hospital.blood_plus.model.HospitalProfile;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface BloodBagRequestRepository extends JpaRepository<BloodBagRequest, Long> {

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

    List<BloodBagRequest> findAllByOrderByRequestedAtDesc();

    List<BloodBagRequest> findByStatus(BloodBagRequest.RequestStatus status);

    List<BloodBagRequest> findByRequesterEmail(String email);
    // NEW: Get all requests for a specific hospital
    List<BloodBagRequest> findByHospitalProfile(HospitalProfile hospital);
    
    // Optional: Get by hospital and status (for filtering)
    List<BloodBagRequest> findByHospitalProfileAndStatusOrderByRequestedAtDesc(
            HospitalProfile hospital, BloodBagRequest.RequestStatus status);
    long countByStatus(BloodBagRequest.RequestStatus status);
    
 
    Long countByUrgencyLevel(UrgencyLevel urgencyLevel);
 
    Long countByRequestCategory(RequestCategory requestCategory);
 
    Long countByRequesterType(RequesterType requesterType);
 
    Long countByBloodComponent(ComponentType bloodComponent);
 
    @Query("SELECT r FROM BloodBagRequest r WHERE r.status = 'RELEASED' ORDER BY r.requestedAt")
    List<BloodBagRequest> findAllReleasedRequests();
 
    @Query(value = """
        SELECT hp.hospital_name, COUNT(bbr.id) as total_requests,
               SUM(CASE WHEN bbr.status = 'RELEASED' THEN 1 ELSE 0 END) as fulfilled
        FROM blood_bag_requests bbr
        LEFT JOIN hospital_profiles hp ON bbr.hospital_profile_id = hp.id
        WHERE bbr.requester_type = 'HOSPITAL'
        GROUP BY hp.id, hp.hospital_name
        ORDER BY total_requests DESC
        LIMIT 5
        """, nativeQuery = true)
    List<Object[]> getTopRequestingHospitals();
 
    @Query(value = """
        SELECT requester_type, COUNT(*) as count
        FROM blood_bag_requests
        GROUP BY requester_type
        """, nativeQuery = true)
    List<Object[]> countByRequesterTypeGrouped();
}