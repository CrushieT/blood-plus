package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.HospitalProfile;

import org.springframework.data.jpa.repository.JpaRepository;

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
}