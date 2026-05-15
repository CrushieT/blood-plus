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
    Optional<StaffProfile> findByEmail(String email);
    Optional<StaffProfile> findByUniqueCode(String uniqueCode);
    boolean existsByStaffId(String staffId);
    boolean existsByEmail(String email);
    boolean existsByUniqueCode(String uniqueCode);
    // Exclude a specific profile when checking for staffId uniqueness on edit
    boolean existsByStaffIdAndIdNot(String staffId, Long id);
    boolean existsByEmailAndIdNot(String email, Long id);
    List<StaffProfile> findAllByOrderByLastNameAscFirstNameAsc();
}
