package com.hospital.blood_plus.service;

import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.repository.BloodBagRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BloodBagExpiryService {

    private final BloodBagRepository bloodBagRepository;

    public BloodBagExpiryService(BloodBagRepository bloodBagRepository) {
        this.bloodBagRepository = bloodBagRepository;
    }

    /**
     * Automatically mark blood bags as EXPIRED if their expiry date has passed
     * Runs every hour (adjust cron as needed)
     * 
     * Cron expression: "0 0 * * * *" = every hour
     *                  "0 0/15 * * * *" = every 15 minutes
     *                  "0 0 0 * * *" = daily at midnight
     */
    @Scheduled(cron = "0 0/5 * * * *")  // Every 5 minutes
    @Transactional
    public void markExpiredBags() {
        LocalDateTime now = LocalDateTime.now();
        
        // Find all AVAILABLE bags that have expired
        List<BloodBag> expiredBags = bloodBagRepository.findByStatusAndExpiresAtBefore(
            BloodBag.BagStatus.AVAILABLE,
            now
        );

        if (expiredBags.isEmpty()) {
            return;  // No expired bags
        }

        // Update all expired bags to EXPIRED status
        for (BloodBag bag : expiredBags) {
            bag.setStatus(BloodBag.BagStatus.EXPIRED);
        }

        bloodBagRepository.saveAll(expiredBags);
        
        System.out.println("[BloodBagExpiryService] Marked " + expiredBags.size() + " bags as EXPIRED");
    }

    /**
     * Optional: Also mark OPEN_SYSTEM bags as expired 24 hours after opening
     * Open system bags expire quickly (24 hours)
     */
    @Scheduled(cron = "0 0/5 * * * *")  // Every 5 minutes
    @Transactional
    public void markExpiredOpenSystemBags() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime twentyFourHoursAgo = now.minusHours(24);

        // Find AVAILABLE bags that are OPEN_SYSTEM and were opened > 24 hours ago
        List<BloodBag> expiredOpenBags = bloodBagRepository.findByStatusAndOpenSystemAndOpenSystemAtBefore(
            BloodBag.BagStatus.AVAILABLE,
            true,
            twentyFourHoursAgo
        );

        if (expiredOpenBags.isEmpty()) {
            return;
        }

        for (BloodBag bag : expiredOpenBags) {
            bag.setStatus(BloodBag.BagStatus.EXPIRED);
        }

        bloodBagRepository.saveAll(expiredOpenBags);
        
        System.out.println("[BloodBagExpiryService] Marked " + expiredOpenBags.size() + " open system bags as EXPIRED");
    }
}