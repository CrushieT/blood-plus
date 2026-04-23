package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.HospitalProfile;
import com.hospital.blood_plus.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.Optional;
import java.util.List;

public interface HospitalProfileRepository extends JpaRepository<HospitalProfile, Long> {
    
    Optional<HospitalProfile> findByUser(AppUser user);
    
    Optional<HospitalProfile> findByHospitalName(String hospitalName);
    
    @Query("SELECT h FROM HospitalProfile h ORDER BY h.createdAt DESC")
    List<HospitalProfile> findAllOrderByCreatedDesc();
    
    @Query("SELECT h FROM HospitalProfile h WHERE LOWER(h.hospitalName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(h.city) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(h.user.email) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<HospitalProfile> searchByNameCityOrEmail(String query);
}