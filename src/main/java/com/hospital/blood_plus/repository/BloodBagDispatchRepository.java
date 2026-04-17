package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagDispatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BloodBagDispatchRepository extends JpaRepository<BloodBagDispatch, Long> {
    List<BloodBagDispatch> findByBloodBag(BloodBag bloodBag);
    List<BloodBagDispatch> findByBloodBag_Id(Long bloodBagId);
}