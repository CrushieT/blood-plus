package com.hospital.blood_plus.scheduler;

import com.hospital.blood_plus.repository.BloodBagRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class BloodBagScheduler {

    private final BloodBagRepository bloodBagRepository;

    public BloodBagScheduler(BloodBagRepository bloodBagRepository) {
        this.bloodBagRepository = bloodBagRepository;
    }

    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void markExpiredBags() {
        int updated = bloodBagRepository.markExpiredBags(LocalDateTime.now());
        System.out.println("Expired blood bags updated: " + updated);
    }
}