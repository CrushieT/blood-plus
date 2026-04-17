package com.hospital.blood_plus.controller;

import com.hospital.blood_plus.dto.request.BloodBankIntakeRequest;
import com.hospital.blood_plus.dto.request.DeferralRequest;
import com.hospital.blood_plus.dto.request.DiscardBagRequest;
import com.hospital.blood_plus.repository.UserRepository;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.service.BloodBagService;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final BloodBagService bloodBagService;
    private final UserRepository userRepository;

    
    public AdminController(
                        BloodBagService bloodBagService,
                        UserRepository userRepository) {
        this.bloodBagService  = bloodBagService;
        this.userRepository  = userRepository;
    }

    


    // Admin Dashboard
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        try {
            return ResponseEntity.ok(bloodBagService.getDashboardSummary());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Blood Bank ────────────────────────────────────────────────────

    @GetMapping("/blood-bank/bags")
    public ResponseEntity<?> getAllBags() {
        return ResponseEntity.ok(bloodBagService.getAllBags());
    }

    @GetMapping("/blood-bank/inventory")
    public ResponseEntity<?> getInventory() {
        return ResponseEntity.ok(bloodBagService.getInventorySummary());
    }

    @PostMapping("/blood-bank/intake")
    public ResponseEntity<?> receiveStock(
            @RequestBody BloodBankIntakeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(bloodBagService.receiveStock(request, user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/blood-bank/bags/{id}/discard")
    public ResponseEntity<?> discardBag(
            @PathVariable Long id,
            @RequestBody DiscardBagRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(bloodBagService.discardBag(id, request, user));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PatchMapping("/blood-bank/bags/{id}/convert-open-system")
    public ResponseEntity<?> convertOpenSystem(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(bloodBagService.convertToOpenSystem(id));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", e.getMessage()));
        }
    }


    
}
