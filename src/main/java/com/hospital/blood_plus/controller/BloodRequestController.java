package com.hospital.blood_plus.controller;

import com.hospital.blood_plus.dto.request.BloodBagRequestDTO;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.HospitalProfile;
import com.hospital.blood_plus.service.BloodBagRequestService;
import com.hospital.blood_plus.repository.HospitalProfileRepository;
import com.hospital.blood_plus.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BloodRequestController {

    private final BloodBagRequestService bloodBagRequestService;
    private final HospitalProfileRepository hospitalProfileRepository;
    private final UserRepository          userRepository;

    public BloodRequestController(BloodBagRequestService bloodBagRequestService, HospitalProfileRepository hospitalProfileRepository, UserRepository userRepository)  {
        this.bloodBagRequestService = bloodBagRequestService;
        this.hospitalProfileRepository = hospitalProfileRepository;
        this.userRepository = userRepository;
    }
    // ── PUBLIC: Submit anonymous blood request ─────────────────
    // Accepts multipart/form-data: "data" (JSON) + "doctorsNote" (file)

    @PostMapping("/req/blood-requests")
    public ResponseEntity<?> submitRequest(
            @RequestPart("data") BloodBagRequestDTO dto,
            @RequestPart(value = "doctorsNote", required = false) MultipartFile doctorsNote) {
        try {
            BloodBagRequest saved = bloodBagRequestService.submitAnonymousRequest(dto, doctorsNote);

            Map<String, Object> response = new HashMap<>();
            response.put("referenceNumber", saved.getReferenceNumber());
            response.put("status", saved.getStatus());
            response.put("message", "Request submitted successfully. A confirmation will be sent to " + saved.getRequesterEmail());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to submit request. Please try again."));
        }
    }

    // ── PUBLIC: Track request by reference number ──────────────

    @GetMapping("/req/blood-requests/track/{refNum}")
    public ResponseEntity<?> trackRequest(@PathVariable String refNum) {
        try {
            BloodBagRequest req = bloodBagRequestService.getByReferenceNumber(refNum);
            // return ResponseEntity.ok(buildTrackResponse(req));
            return ResponseEntity.ok(buildTrackResponse(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    // ──────────────────────────────────────────────────────────────
    // HOSPITAL: Submit Authenticated Blood Request
    // ──────────────────────────────────────────────────────────────
 
    @PostMapping("/hospital/blood-requests")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> submitHospitalRequest(
            @RequestPart("data") BloodBagRequestDTO dto,
            @RequestPart(value = "doctorsNote", required = false) MultipartFile doctorsNote,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            
            AppUser currentUser = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            HospitalProfile hospital = hospitalProfileRepository.findByUser(currentUser)
                    .orElseThrow(() -> new IllegalArgumentException("No hospital profile found for this user."));
            
            BloodBagRequest saved = bloodBagRequestService.submitHospitalRequest(
                    dto, doctorsNote, currentUser, hospital);
 
            Map<String, Object> response = new HashMap<>();
            response.put("id", saved.getId());
            response.put("referenceNumber", saved.getReferenceNumber());
            response.put("status", saved.getStatus());
            response.put("hospitalName", hospital.getHospitalName());
            response.put("message", "Blood request submitted successfully.");
 
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
 
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to submit hospital request. Please try again."));
        }
    }
 
    // ──────────────────────────────────────────────────────────────
    // HOSPITAL: Get Request History (Own Requests Only)
    // ──────────────────────────────────────────────────────────────
 
    @GetMapping("/hospital/blood-requests")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> getHospitalRequestHistory(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser currentUser = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            HospitalProfile hospital = hospitalProfileRepository.findByUser(currentUser)
                    .orElseThrow(() -> new IllegalArgumentException("No hospital profile found."));
 
            List<BloodBagRequest> requests = bloodBagRequestService.getByHospital(hospital);
 
            return ResponseEntity.ok(requests.stream()
                    .map(this::buildHospitalRequestResponse)
                    .toList());
 
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
 
    // ──────────────────────────────────────────────────────────────
    // HOSPITAL: Get Single Request (Must Own It)
    // ──────────────────────────────────────────────────────────────
 
    @GetMapping("/hospital/blood-requests/{id}")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> getHospitalRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser currentUser = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            HospitalProfile hospital = hospitalProfileRepository.findByUser(currentUser)
                    .orElseThrow(() -> new IllegalArgumentException("No hospital profile found."));
 
            BloodBagRequest req = bloodBagRequestService.findById(id);
 
            if (req.getHospitalProfile() == null || !req.getHospitalProfile().getId().equals(hospital.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You do not have access to this request."));
            }
 
            return ResponseEntity.ok(buildHospitalRequestResponse(req));
 
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    private Map<String, Object> buildTrackResponse(BloodBagRequest req) {
        Map<String, Object> res = new HashMap<>();

        res.put("refNum", req.getReferenceNumber());
        res.put("patientName", req.getPatientName());
        res.put("bloodType", req.getBloodType());
        res.put("bloodComponent", req.getBloodComponent());
        res.put("numberOfUnits", req.getNumberOfUnits());
        res.put("urgencyLevel", req.getUrgencyLevel());
        res.put("status", req.getStatus());
        res.put("submittedAt", req.getRequestedAt());
        res.put("reviewedAt", req.getReviewedAt());
        res.put("physician", req.getRequestingPhysician());
        res.put("requestCategory", req.getRequestCategory());
        res.put("rejectionReason", req.getRejectionReason());

        return res;
    }
    
    private Map<String, Object> buildHospitalRequestResponse(BloodBagRequest req) {
        Map<String, Object> res = new HashMap<>();
        res.put("id", req.getId());
        res.put("referenceNumber", req.getReferenceNumber());
        res.put("patientName", req.getPatientName());
        res.put("patientAge", req.getPatientAge());
        res.put("patientSex", req.getPatientSex());
        res.put("wardRoom", req.getWardRoom());
        res.put("requestingPhysician", req.getRequestingPhysician());
        res.put("bloodType", req.getBloodType());
        res.put("bloodComponent", req.getBloodComponent());
        res.put("numberOfUnits", req.getNumberOfUnits());
        res.put("urgencyLevel", req.getUrgencyLevel());
        res.put("requestCategory", req.getRequestCategory());
        res.put("ageGroup", req.getAgeGroup());
        res.put("status", req.getStatus());
        res.put("requestedAt", req.getRequestedAt());
        res.put("requiredBy", req.getRequiredBy());
        res.put("reviewedAt", req.getReviewedAt());
        res.put("rejectionReason", req.getRejectionReason());
        res.put("notes", req.getNotes());
        res.put("doctorsNoteUrl", req.getDoctorsNoteUrl());      // ← ADD THIS
        res.put("doctorsNoteKey", req.getDoctorsNoteKey());      // ← ADD THIS
        return res;
    }
 
}