package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.StaffProfile;
import com.hospital.blood_plus.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StaffProfileRepository extends JpaRepository<StaffProfile, Long> {
    Optional<StaffProfile> findByUser(AppUser user);
    Optional<StaffProfile> findByStaffId(String staffId);
    boolean existsByStaffId(String staffId);
    // Exclude a specific profile when checking for staffId uniqueness on edit
    boolean existsByStaffIdAndIdNot(String staffId, Long id);
    List<StaffProfile> findAllByOrderByLastNameAscFirstNameAsc();
}