package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagDispatch;
import com.hospital.blood_plus.model.BloodBagDispatch.DispatchType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BloodBagDispatchRepository extends JpaRepository<BloodBagDispatch, Long> {
    List<BloodBagDispatch> findByBloodBag(BloodBag bloodBag);
    List<BloodBagDispatch> findByBloodBag_Id(Long bloodBagId);

    Long countByDispatchType(DispatchType dispatchType);
 
    @Query("SELECT d FROM BloodBagDispatch d ORDER BY d.dispatchedAt DESC")
    List<BloodBagDispatch> findAllDispatches();
 
    @Query("SELECT d FROM BloodBagDispatch d WHERE d.dispatchedAt BETWEEN :startDate AND :endDate " +
           "ORDER BY d.dispatchedAt DESC")
    List<BloodBagDispatch> findDispatchesBetweenDates(LocalDateTime startDate, LocalDateTime endDate);
}