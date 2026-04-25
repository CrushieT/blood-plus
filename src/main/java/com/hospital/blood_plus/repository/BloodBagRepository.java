package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBag.BagStatus;
import com.hospital.blood_plus.model.BloodBag.RhType;
import com.hospital.blood_plus.model.BloodBag.BloodType;
import com.hospital.blood_plus.model.BloodBag.ComponentType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BloodBagRepository extends JpaRepository<BloodBag, Long> {

    Optional<BloodBag> findBySerialNumber(String serialNumber);

    List<BloodBag> findByStatus(BagStatus status);

    List<BloodBag> findByBloodTypeAndStatus(BloodType bloodType, BagStatus status);

    // bags expiring before a given date that are still available
    @Query("SELECT b FROM BloodBag b WHERE b.status = 'AVAILABLE' AND b.expiresAt < :cutoff")
    List<BloodBag> findExpiredBags(@Param("cutoff") LocalDateTime cutoff);

    // bags expiring within next N days (for alerts)
    @Query("SELECT b FROM BloodBag b WHERE b.status = 'AVAILABLE' AND b.expiresAt BETWEEN :now AND :soon")
    List<BloodBag> findExpiringSoon(@Param("now") LocalDateTime now, @Param("soon") LocalDateTime soon);

    boolean existsBySerialNumber(String serialNumber);

    List<BloodBag> findByBloodTypeAndRhTypeAndStatus(
            BloodType bloodType, RhType rhType, BagStatus status);

    List<BloodBag> findByStatusAndExpiresAtBefore(
            BagStatus status, LocalDateTime cutoff);

    List<BloodBag> findByStatusAndExpiresAtBetween(
            BagStatus status, LocalDateTime from, LocalDateTime to);

    List<BloodBag> findByOpenSystemTrueAndStatus(BagStatus status);

    List<BloodBag> findByComponentTypeAndStatus(
            ComponentType componentType, BagStatus status);

    @Query("""
        SELECT b FROM BloodBag b
        WHERE b.status = 'AVAILABLE'
          AND b.expiresAt IS NOT NULL
          AND b.expiresAt BETWEEN :now AND :deadline
        ORDER BY b.expiresAt ASC
    """)
    List<BloodBag> findExpiringBefore(
            @Param("now")      LocalDateTime now,
            @Param("deadline") LocalDateTime deadline);
        
      // Multiple compatible types — used by getAvailableBags()
    List<BloodBag> findByBloodTypeInAndStatus(
            List<BloodType> bloodTypes,
            BloodBag.BagStatus status);
 
    // Optional: by component too
    List<BloodBag> findByBloodTypeAndComponentTypeAndStatus(
            BloodBag.BloodType bloodType,
            BloodBag.ComponentType componentType,
            BloodBag.BagStatus status);

    List<BloodBag> findByBloodType(BloodBag.BloodType bloodType);
 
   
    @Query("SELECT b FROM BloodBag b WHERE b.bloodType = :bloodType " +
           "AND b.status = 'AVAILABLE' AND b.expiresAt > :now")
    List<BloodBag> findAvailableByBloodType(
            @Param("bloodType") BloodBag.BloodType bloodType,
            @Param("now") LocalDateTime now);
 
  
    List<BloodBag> findByComponentType(BloodBag.ComponentType componentType);
 
    @Query("SELECT b FROM BloodBag b WHERE b.componentType = :componentType " +
           "AND b.status = 'AVAILABLE' AND b.expiresAt > :now")
    List<BloodBag> findAvailableByComponentType(
            @Param("componentType") BloodBag.ComponentType componentType,
            @Param("now") LocalDateTime now);
 
    @Query("SELECT b FROM BloodBag b WHERE b.status = 'AVAILABLE' AND b.expiresAt > :now")
    List<BloodBag> findAllAvailable(@Param("now") LocalDateTime now);
 
    long countByStatus(BloodBag.BagStatus status);
 
    @Query("SELECT COUNT(b) FROM BloodBag b WHERE b.bloodType = :bloodType " +
           "AND b.status = 'AVAILABLE' AND b.expiresAt > :now")
    int countAvailableByBloodType(
            @Param("bloodType") BloodBag.BloodType bloodType,
            @Param("now") LocalDateTime now);
 
    @Query("SELECT COUNT(b) FROM BloodBag b WHERE b.componentType = :componentType " +
           "AND b.status = 'AVAILABLE' AND b.expiresAt > :now")
    int countAvailableByComponentType(
            @Param("componentType") BloodBag.ComponentType componentType,
            @Param("now") LocalDateTime now);
}