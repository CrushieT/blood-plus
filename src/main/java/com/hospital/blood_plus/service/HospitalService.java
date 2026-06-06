package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.HospitalDTOs.CreateHospitalRequest;
import com.hospital.blood_plus.dto.request.HospitalDTOs.UpdateHospitalRequest;
import com.hospital.blood_plus.dto.request.HospitalDTOs.HospitalResponse;
import com.hospital.blood_plus.model.HospitalProfile;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.repository.HospitalProfileRepository;
import com.hospital.blood_plus.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class HospitalService {

    @Autowired
    private HospitalProfileRepository hospitalRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EmailService emailService;

    // ─────────────────────────────────────────────
    // GET ALL HOSPITALS
    // ─────────────────────────────────────────────
    public List<HospitalResponse> getAllHospitals() {
        return hospitalRepository.findAllOrderByCreatedDesc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────
    // GET SINGLE HOSPITAL
    // ─────────────────────────────────────────────
    public HospitalResponse getHospital(Long id) {
        HospitalProfile hosp = hospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found"));
        return toResponse(hosp);
    }

    // ─────────────────────────────────────────────
    // SEARCH HOSPITALS
    // ─────────────────────────────────────────────
    public List<HospitalResponse> searchHospitals(String query) {
        return hospitalRepository.searchByNameCityOrEmail(query)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────
    // CREATE HOSPITAL
    // ─────────────────────────────────────────────
    public HospitalResponse createHospital(CreateHospitalRequest req) {
        // Validate required fields
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (req.getHospitalName() == null || req.getHospitalName().isBlank()) {
            throw new IllegalArgumentException("Hospital name is required");
        }
        if (req.getCity() == null || req.getCity().isBlank()) {
            throw new IllegalArgumentException("City is required");
        }
        if (req.getProvince() == null || req.getProvince().isBlank()) {
            throw new IllegalArgumentException("Province is required");
        }
        if (req.getAddress() == null || req.getAddress().isBlank()) {
            throw new IllegalArgumentException("Address is required");
        }

        // Check if email already exists
        if (userRepository.findByEmail(req.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Check if hospital name already exists
        if (hospitalRepository.findByHospitalName(req.getHospitalName()).isPresent()) {
            throw new IllegalArgumentException("Hospital name already exists");
        }

        // Generate auto password (HospitalName@1234)
        String autoPassword = generateHospitalPassword(req.getHospitalName());

        // Create AppUser
        AppUser user = new AppUser();
        user.setEmail(req.getEmail());
        user.setUsername(req.getEmail());
        user.setPassword(passwordEncoder.encode(autoPassword));
        user.setRole(AppUser.Role.HOSPITAL);
        user.setEmailVerified(true);
        user = userRepository.save(user);

        // Create HospitalProfile
        HospitalProfile hosp = new HospitalProfile();
        hosp.setUser(user);
        hosp.setHospitalName(req.getHospitalName());
        hosp.setAddress(req.getAddress());
        hosp.setCity(req.getCity());
        hosp.setProvince(req.getProvince());
        hosp.setPhoneNumber(req.getPhoneNumber());
        hosp.setContactPersonName(req.getContactPersonName());
        hosp.setContactPersonPhone(req.getContactPersonPhone());
        hosp = hospitalRepository.save(hosp);

        // Send email with credentials
        try {
            emailService.sendHospitalCredentialsEmail(
                    req.getEmail(),
                    req.getHospitalName(),
                    autoPassword
            );
        } catch (Exception e) {
            // Log but don't fail the operation
            System.err.println("Failed to send email: " + e.getMessage());
        }

        return toResponse(hosp);
    }

    // ─────────────────────────────────────────────
    // UPDATE HOSPITAL
    // ─────────────────────────────────────────────
    public HospitalResponse updateHospital(Long id, UpdateHospitalRequest req) {
        HospitalProfile hosp = hospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found"));
        AppUser user = hosp.getUser();

        if (req.getHospitalName() != null && !req.getHospitalName().isBlank()) {
            hosp.setHospitalName(req.getHospitalName());
        }
        if (req.getAddress() != null && !req.getAddress().isBlank()) {
            hosp.setAddress(req.getAddress());
        }
        if (req.getCity() != null && !req.getCity().isBlank()) {
            hosp.setCity(req.getCity());
        }
        if (req.getProvince() != null && !req.getProvince().isBlank()) {
            hosp.setProvince(req.getProvince());
        }
        if (req.getPhoneNumber() != null) {
            hosp.setPhoneNumber(req.getPhoneNumber());
        }
        if (req.getContactPersonName() != null) {
            hosp.setContactPersonName(req.getContactPersonName());
        }
        if (req.getContactPersonPhone() != null) {
            hosp.setContactPersonPhone(req.getContactPersonPhone());
        }

        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            String normalizedEmail = req.getEmail().trim().toLowerCase();
            AppUser existing = userRepository.findByEmail(normalizedEmail).orElse(null);
            if (existing != null && !existing.getId().equals(user.getId())) {
                throw new IllegalArgumentException("Email already registered");
            }
            user.setEmail(normalizedEmail);
            user.setUsername(normalizedEmail);
        }

        if (req.getNewPassword() != null && !req.getNewPassword().isBlank()) {
            String newPassword = req.getNewPassword().trim();
            if (newPassword.length() < 8) {
                throw new IllegalArgumentException("New password must be at least 8 characters");
            }
            user.setPassword(passwordEncoder.encode(newPassword));
        }

        if (req.getStatus() != null && !req.getStatus().isBlank()) {
            String normalizedStatus = req.getStatus().trim().toLowerCase();
            if (!"active".equals(normalizedStatus) && !"inactive".equals(normalizedStatus)) {
                throw new IllegalArgumentException("Invalid status value. Use active or inactive.");
            }
            user.setEmailVerified("active".equals(normalizedStatus));
        }

        userRepository.save(user);
        hosp = hospitalRepository.save(hosp);
        return toResponse(hosp);
    }

    // ─────────────────────────────────────────────
    // DELETE HOSPITAL
    // ─────────────────────────────────────────────
    public void deleteHospital(Long id) {
        HospitalProfile hosp = hospitalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found"));

        // Delete associated AppUser
        AppUser user = hosp.getUser();
        hospitalRepository.delete(hosp);
        userRepository.delete(user);
    }

    // ─────────────────────────────────────────────
    // HELPER: Convert to Response DTO
    // ─────────────────────────────────────────────
    private HospitalResponse toResponse(HospitalProfile hosp) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        return new HospitalResponse(
                hosp.getId(),
                hosp.getUser().getId(),
                hosp.getHospitalName(),
                hosp.getAddress(),
                hosp.getCity(),
                hosp.getProvince(),
                hosp.getPhoneNumber(),
                hosp.getContactPersonName(),
                hosp.getContactPersonPhone(),
                hosp.getUser().getEmail(),
                hosp.getUser().isEmailVerified() ? "active" : "inactive",
                hosp.getRequests().size(),
                hosp.getCreatedAt().format(fmt)
        );
    }

    // ─────────────────────────────────────────────
    // HELPER: Generate Auto Password
    // ─────────────────────────────────────────────
    private String generateHospitalPassword(String hospitalName) {
        // Format: FirstWord@1234 from hospital name
        String[] parts = hospitalName.trim().split("\\s+");
        String base = parts[0]; // First word
        if (base.length() > 1) {
            base = base.substring(0, 1).toUpperCase() + base.substring(1).toLowerCase();
        } else {
            base = base.toUpperCase();
        }
        return base + "@1234";
    }


    ////// Hospital Account /////////////////
    

    
}
