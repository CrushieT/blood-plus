package com.hospital.blood_plus.repository;

import com.hospital.blood_plus.model.BloodTracer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BloodTracerRepository extends JpaRepository<BloodTracer, Long> {
    Optional<BloodTracer> findByRequest_Id(Long requestId);
}
