package com.hospital.blood_plus.controller;

import com.hospital.blood_plus.dto.request.BloodBagRequestDTO;
import com.hospital.blood_plus.dto.request.ChangePasswordRequestDTO;
import com.hospital.blood_plus.dto.request.UpdateHospitalProfileDTO;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.HospitalProfile;
import com.hospital.blood_plus.model.RequestFulfillment;
import com.hospital.blood_plus.service.BloodBagRequestService;
import com.hospital.blood_plus.service.BloodBagService;
import com.hospital.blood_plus.service.HospitalProfileService;
import com.hospital.blood_plus.repository.HospitalProfileRepository;
import com.hospital.blood_plus.repository.UserRepository;

import org.apache.el.stream.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hospital")
public class HospitalController {

    private final BloodBagRequestService bloodBagRequestService;
    private final BloodBagService bloodBagService;
    private final HospitalProfileRepository hospitalProfileRepository;
    private final UserRepository userRepository;
    private final HospitalProfileService hospitalProfileService;
    private final PasswordEncoder passwordEncoder;

    public HospitalController(
            BloodBagRequestService bloodBagRequestService,
            BloodBagService bloodBagService,
            HospitalProfileRepository hospitalProfileRepository,
            UserRepository userRepository,
            HospitalProfileService hospitalProfileService,
            PasswordEncoder passwordEncoder) {
        this.bloodBagRequestService = bloodBagRequestService;
        this.bloodBagService = bloodBagService;
        this.hospitalProfileRepository = hospitalProfileRepository;
        this.userRepository = userRepository;
        this.hospitalProfileService = hospitalProfileService;
        this.passwordEncoder = passwordEncoder;
    }

    // ──────────────────────────────────────────────────────────────
    // HOSPITAL: Submit Authenticated Blood Request
    // ──────────────────────────────────────────────────────────────
 
    @PostMapping("/blood-requests")
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
 
    @GetMapping("/blood-requests")
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
    // BLOOD BANK AVAILABILITY ENDPOINTS
    // ──────────────────────────────────────────────────────────────
    // NOTE: These endpoints are now HOSPITAL ONLY (removed public access)
    // If you need public endpoints, create a separate PublicController

    /**
     * GET /api/hospital/blood-bank/availability
     * Returns complete blood bank status with blood types and component availability
     * HOSPITAL ROLE REQUIRED
     */
    @GetMapping("/blood-bank/availability")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> getBloodBankAvailability() {
        try {
            Map<String, Object> status = bloodBagService.getBloodBankStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to fetch blood bank availability."));
        }
    }

    /**
     * GET /api/hospital/blood-bank/availability/blood-types
     * Returns availability for all blood types only
     * HOSPITAL ROLE REQUIRED
     */
    @GetMapping("/blood-bank/availability/blood-types")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> getBloodTypeAvailability() {
        try {
            Map<String, Map<String, Object>> bloodTypes = 
                    bloodBagService.getAllBloodTypeAvailability();
            return ResponseEntity.ok(Map.of(
                    "bloodTypes", bloodTypes,
                    "timestamp", java.time.LocalDateTime.now()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to fetch blood type availability."));
        }
    }

    /**
     * GET /api/hospital/blood-bank/availability/blood-types/{bloodType}
     * Returns availability for a specific blood type
     * Example: /api/hospital/blood-bank/availability/blood-types/O_POS
     * HOSPITAL ROLE REQUIRED
     */
    @GetMapping("/blood-bank/availability/blood-types/{bloodType}")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> getSingleBloodTypeAvailability(@PathVariable String bloodType) {
        try {
            Map<String, Object> availability = 
                    bloodBagService.getBloodTypeAvailability(bloodType);
            
            if ("INVALID".equals(availability.get("status"))) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid blood type: " + bloodType));
            }
            
            return ResponseEntity.ok(availability);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to fetch blood type availability."));
        }
    }

    /**
     * GET /api/hospital/blood-bank/availability/components
     * Returns availability for all blood components
     * HOSPITAL ROLE REQUIRED
     */
    @GetMapping("/blood-bank/availability/components")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> getComponentAvailability() {
        try {
            Map<String, Map<String, Object>> components = 
                    bloodBagService.getAllComponentAvailability();
            return ResponseEntity.ok(Map.of(
                    "components", components,
                    "timestamp", java.time.LocalDateTime.now()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to fetch component availability."));
        }
    }

    /**
     * GET /api/hospital/blood-bank/availability/components/{componentType}
     * Returns availability for a specific component
     * Example: /api/hospital/blood-bank/availability/components/PRBC
     * HOSPITAL ROLE REQUIRED
     */
    @GetMapping("/blood-bank/availability/components/{componentType}")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> getSingleComponentAvailability(@PathVariable String componentType) {
        try {
            Map<String, Object> availability = 
                    bloodBagService.getComponentAvailability(componentType);
            
            if ("INVALID".equals(availability.get("status"))) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid component type: " + componentType));
            }
            
            return ResponseEntity.ok(availability);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to fetch component availability."));
        }
    }



    /////// PROFILE PANEL///////////

    // ──────────────────────────────────────────────────────────────
    // GET: Hospital Profile (Current User)
    // ──────────────────────────────────────────────────────────────
 
    @GetMapping("/profile")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> getHospitalProfile(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser currentUser = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            HospitalProfile profile = hospitalProfileService.getHospitalProfile(currentUser);
            
            return ResponseEntity.ok(buildProfileResponse(profile, currentUser));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to fetch hospital profile."));
        }
    }
 
    // ──────────────────────────────────────────────────────────────
    // PUT: Update Hospital Profile
    // ──────────────────────────────────────────────────────────────
 
    @PutMapping("/profile")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> updateHospitalProfile(
            @RequestBody UpdateHospitalProfileDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser currentUser = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            HospitalProfile profile = hospitalProfileService.getHospitalProfile(currentUser);
            
            // Validate required fields
            if (dto.getHospitalName() == null || dto.getHospitalName().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Hospital name is required"));
            }
            if (dto.getAddress() == null || dto.getAddress().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Address is required"));
            }
            if (dto.getCity() == null || dto.getCity().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "City is required"));
            }
            if (dto.getProvince() == null || dto.getProvince().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Province is required"));
            }
            
            HospitalProfile updated = hospitalProfileService.updateHospitalProfile(
                    profile.getId(),
                    dto.getHospitalName(),
                    dto.getAddress(),
                    dto.getCity(),
                    dto.getProvince(),
                    dto.getPhoneNumber(),
                    dto.getContactPersonName(),
                    dto.getContactPersonPhone(),
                    currentUser);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Hospital profile updated successfully");
            response.put("profile", buildProfileResponse(updated, currentUser));
            
            return ResponseEntity.ok(response);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to update hospital profile."));
        }
    }
 
    // ──────────────────────────────────────────────────────────────
    // POST: Change Password
    // ──────────────────────────────────────────────────────────────
 
    @PostMapping("/profile/change-password")
    @PreAuthorize("hasRole('HOSPITAL')")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser currentUser = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Validate current password
            if (!passwordEncoder.matches(dto.getCurrentPassword(), currentUser.getPassword())) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Current password is incorrect"));
            }
            
            // Validate new password
            if (dto.getNewPassword() == null || dto.getNewPassword().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "New password is required"));
            }
            if (dto.getNewPassword().length() < 6) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "New password must be at least 6 characters"));
            }
            
            // Validate confirmation
            if (!dto.getNewPassword().equals(dto.getConfirmPassword())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Passwords do not match"));
            }
            
            // Update password with encoded value
            currentUser.setPassword(passwordEncoder.encode(dto.getNewPassword()));
            userRepository.save(currentUser);
            
            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to change password."));
        }
    }
 
    // ──────────────────────────────────────────────────────────────
    // Response Builders
    // ──────────────────────────────────────────────────────────────
 
    private Map<String, Object> buildProfileResponse(HospitalProfile profile, AppUser user) {
        Map<String, Object> response = new HashMap<>();
        
        // Profile info
        response.put("id", profile.getId());
        response.put("hospitalName", profile.getHospitalName());
        response.put("address", profile.getAddress());
        response.put("city", profile.getCity());
        response.put("province", profile.getProvince());
        response.put("phoneNumber", profile.getPhoneNumber() != null ? profile.getPhoneNumber() : "");
        response.put("contactPersonName", profile.getContactPersonName() != null ? profile.getContactPersonName() : "");
        response.put("contactPersonPhone", profile.getContactPersonPhone() != null ? profile.getContactPersonPhone() : "");
        
        // User info
        response.put("email", user.getEmail());
        response.put("accountType", user.getRole().toString());
        response.put("emailVerified", user.isEmailVerified());
        response.put("createdAt", profile.getCreatedAt());
        response.put("updatedAt", profile.getUpdatedAt());
        
        return response;
    }


    public Map<String, Object> buildHospitalRequestResponse(BloodBagRequest req) {
        Map<String, Object> res = new HashMap<>();
 
        // ─────────────────────────────────────────────
        // CORE REQUEST FIELDS
        // ─────────────────────────────────────────────
        res.put("id", req.getId());
        res.put("referenceNumber", req.getReferenceNumber());
        res.put("status", req.getStatus());
        res.put("requestType", req.getRequestType());
        res.put("urgencyLevel", req.getUrgencyLevel());
 
        // ─────────────────────────────────────────────
        // PATIENT INFORMATION
        // ─────────────────────────────────────────────
        res.put("patientName", req.getPatientName());
        res.put("patientAge", req.getPatientAge());
        res.put("patientSex", req.getPatientSex());
        res.put("wardRoom", req.getWardRoom());
        res.put("ageGroup", req.getAgeGroup());
        res.put("requestCategory", req.getRequestCategory());
        res.put("requestingPhysician", req.getRequestingPhysician());
 
        // ─────────────────────────────────────────────
        // BLOOD REQUIREMENTS
        // ─────────────────────────────────────────────
        res.put("bloodType", req.getBloodType());
        res.put("bloodComponent", req.getBloodComponent());
        res.put("numberOfUnits", req.getNumberOfUnits());
        res.put("volumeMl", req.getVolumeMl());
 
        // ─────────────────────────────────────────────
        // REQUEST DATES & DEADLINES
        // ─────────────────────────────────────────────
        res.put("requestedAt", req.getRequestedAt());
        res.put("requiredBy", req.getRequiredBy());
        res.put("reviewedAt", req.getReviewedAt());
 
        // ─────────────────────────────────────────────
        // CLINICAL INFORMATION
        // ─────────────────────────────────────────────
        res.put("clinicalImpression", req.getClinicalImpression());
        res.put("attendingPhysician", req.getAttendingPhysician());
        res.put("contactNumber", req.getContactNumber());
        res.put("hemoglobin", req.getHemoglobin());
        res.put("hematocrit", req.getHematocrit());
 
        // ─────────────────────────────────────────────
        // TRANSFUSION HISTORY
        // ─────────────────────────────────────────────
        res.put("hadPreviousTransfusion", req.getHadPreviousTransfusion());
        res.put("previousTransfusionDate", req.getPreviousTransfusionDate());
        res.put("previousTransfusionUnits", req.getPreviousTransfusionUnits());
        res.put("previousTransfusionHistory", req.getPreviousTransfusionHistory());
 
        // ─────────────────────────────────────────────
        // REACTION HISTORY
        // ─────────────────────────────────────────────
        res.put("hadPreviousReaction", req.getHadPreviousReaction());
        res.put("previousReactionDate", req.getPreviousReactionDate());
        res.put("previousReactionDetails", req.getPreviousReactionDetails());
        res.put("previousReactionHistory", req.getPreviousReactionHistory());
 
        // ─────────────────────────────────────────────
        // INDICATIONS FOR TRANSFUSION
        // ─────────────────────────────────────────────
        res.put("indication", req.getIndication());
 
        // ─────────────────────────────────────────────
        // REQUESTER INFORMATION
        // ─────────────────────────────────────────────
        res.put("requesterName", req.getRequesterName());
        res.put("requesterRelationship", req.getRequesterRelationship());
        res.put("requesterContact", req.getRequesterContact());
        res.put("requesterEmail", req.getRequesterEmail());
        res.put("requesterType", req.getRequesterType());
 
        // ─────────────────────────────────────────────
        // REQUEST DOCUMENTS
        // ─────────────────────────────────────────────
        res.put("notes", req.getNotes());
        res.put("doctorsNoteUrl", req.getDoctorsNoteUrl());
        res.put("doctorsNoteKey", req.getDoctorsNoteKey());
 
        // ─────────────────────────────────────────────
        // STATUS & RESOLUTION
        // ─────────────────────────────────────────────
        res.put("rejectionReason", req.getRejectionReason());
 
        return res;
    }
 
}