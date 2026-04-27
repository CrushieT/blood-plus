package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.StaffDTOs.*;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.AppUser.Role;
import com.hospital.blood_plus.model.StaffProfile;
import com.hospital.blood_plus.repository.StaffProfileRepository;
import com.hospital.blood_plus.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StaffService {

    private static final DateTimeFormatter DATE_FMT     = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final StaffProfileRepository staffRepo;
    private final UserRepository         userRepo;
    private final PasswordEncoder        passwordEncoder;
    private final EmailService           emailService;

    public StaffService(StaffProfileRepository staffRepo,
                        UserRepository userRepo,
                        PasswordEncoder passwordEncoder,
                        EmailService emailService) {
        this.staffRepo       = staffRepo;
        this.userRepo        = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.emailService    = emailService;
    }

    // ── List all staff ────────────────────────────────────────

    public List<StaffResponse> getAllStaff() {
        return staffRepo.findAllByOrderByLastNameAscFirstNameAsc()
                        .stream()
                        .map(this::toResponse)
                        .collect(Collectors.toList());
    }

    // ── Get single staff ──────────────────────────────────────

    public StaffResponse getStaff(Long profileId) {
        StaffProfile profile = findProfileOrThrow(profileId);
        return toResponse(profile);
    }

    // ── Create staff ──────────────────────────────────────────

    @Transactional
    public StaffResponse createStaff(CreateStaffRequest req) {
        String email = req.getEmail().trim().toLowerCase();

        if (userRepo.existsByEmail(email))
            throw new IllegalArgumentException("A user with this email already exists.");

        String resolvedStaffId = resolveStaffId(req.getStaffId(), null);

        if (staffRepo.existsByStaffId(resolvedStaffId))
            throw new IllegalArgumentException("Staff ID '" + resolvedStaffId + "' is already in use.");

        // Generate a readable default password: FirstLast@1234
        String rawPassword   = buildDefaultPassword(req.getFirstName(), req.getLastName());
        String hashedPassword = passwordEncoder.encode(rawPassword);

        // Build username from email prefix, ensure uniqueness
        String username = buildUniqueUsername(email);

        AppUser user = new AppUser();
        user.setEmail(email);
        user.setUsername(username);
        user.setPassword(hashedPassword);
        user.setRole(Role.STAFF);
        user.setEmailVerified(true);   // admin-created accounts are pre-verified
        userRepo.save(user);

        StaffProfile profile = new StaffProfile();
        profile.setUser(user);
        profile.setStaffId(resolvedStaffId);
        profile.setFirstName(req.getFirstName().trim());
        profile.setLastName(req.getLastName().trim());
        profile.setDepartment(req.getDepartment());
        profile.setPosition(req.getPosition());
        profile.setPhoneNumber(req.getPhoneNumber());
        profile.setHireDate(req.getHireDate());
        // Do not repurpose AppUser.emailVerified as a staff active/inactive flag.
        // Account status must be represented by a dedicated field (for example, enabled/active).
        // Until such a field exists, reject inactive creation requests here rather than corrupting
        // email verification state and potentially breaking verify-email flows.
        if ("inactive".equalsIgnoreCase(req.getStatus())) {
            throw new IllegalArgumentException(
                "Inactive staff status requires a dedicated account status field and cannot be stored in emailVerified."
            );
        }
        staffRepo.save(profile);

        // Send credentials email
        sendCredentialsEmail(email, req.getFirstName(), username, rawPassword);

        return toResponse(profile);
    }

    // ── Update staff ──────────────────────────────────────────

    @Transactional
    public StaffResponse updateStaff(Long profileId, UpdateStaffRequest req) {
        StaffProfile profile = findProfileOrThrow(profileId);
        AppUser user = profile.getUser();

        String newStaffId = resolveStaffId(req.getStaffId(), profile.getStaffId());
        if (!newStaffId.equals(profile.getStaffId()) &&
            staffRepo.existsByStaffIdAndIdNot(newStaffId, profileId))
            throw new IllegalArgumentException("Staff ID '" + newStaffId + "' is already used by another staff member.");

        profile.setFirstName(req.getFirstName().trim());
        profile.setLastName(req.getLastName().trim());
        profile.setStaffId(newStaffId);
        profile.setDepartment(req.getDepartment());
        profile.setPosition(req.getPosition());
        profile.setPhoneNumber(req.getPhoneNumber());
        profile.setHireDate(req.getHireDate());

        // Status maps to emailVerified on the AppUser
        if (req.getStatus() != null) {
            user.setEmailVerified(!"inactive".equalsIgnoreCase(req.getStatus()));
        }

        // Optional password reset
        String newPass = req.getNewPassword();
        if (newPass != null && !newPass.isBlank()) {
            if (newPass.length() < 6)
                throw new IllegalArgumentException("New password must be at least 6 characters.");
            user.setPassword(passwordEncoder.encode(newPass));
        }

        userRepo.save(user);
        staffRepo.save(profile);

        return toResponse(profile);
    }

    // ── Delete staff ──────────────────────────────────────────

    @Transactional
    public void deleteStaff(Long profileId) {
        StaffProfile profile = findProfileOrThrow(profileId);
        AppUser user = profile.getUser();
        staffRepo.delete(profile);
        userRepo.delete(user);
    }

    // ── Toggle active/inactive ────────────────────────────────

    @Transactional
    public StaffResponse toggleStatus(Long profileId) {
        StaffProfile profile = findProfileOrThrow(profileId);
        AppUser user = profile.getUser();
        user.setEmailVerified(!user.isEmailVerified());
        userRepo.save(user);
        return toResponse(profile);
    }

    // ── Helpers ───────────────────────────────────────────────

    private StaffProfile findProfileOrThrow(Long id) {
        return staffRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Staff profile not found: " + id));
    }

    /** 
     * Default password: FirstLast@1234
     * e.g. Juan Dela Cruz → JuanDelacruz@1234
     * Admin can see this on creation and share it with the staff member directly.
     */
    private String buildDefaultPassword(String firstName, String lastName) {
        String first = capitalize(firstName == null ? "Staff" : firstName.trim());
        String last  = capitalize(lastName  == null ? "User"  : lastName.trim());
        return first + last + "@1234";
    }

    private String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return Character.toUpperCase(s.charAt(0)) + s.substring(1).toLowerCase();
    }

    private String buildUniqueUsername(String email) {
        String base = email.split("@")[0].replaceAll("[^a-zA-Z0-9._]", "");
        if (!userRepo.existsByUsername(base)) return base;
        int i = 1;
        while (userRepo.existsByUsername(base + i)) i++;
        return base + i;
    }

    /**
     * If the caller didn't supply a staffId, auto-generate one.
     * Format: STF-001, STF-002, etc.
     */
    private synchronized String resolveStaffId(String provided, String existing) {
        if (provided != null && !provided.isBlank()) return provided.trim();
        if (existing  != null && !existing.isBlank())  return existing;

        int next = staffRepo.findAll().stream()
            .map(StaffProfile::getStaffId)
            .filter(staffId -> staffId != null && staffId.startsWith("STF-"))
            .map(staffId -> staffId.substring(4))
            .filter(suffix -> suffix.matches("\\d+"))
            .mapToInt(Integer::parseInt)
            .max()
            .orElse(0) + 1;

        return String.format("STF-%03d", next);
    }

    private void sendCredentialsEmail(String to, String firstName,
                                       String username, String rawPassword) {
        try {
            emailService.sendStaffCredentialsEmail(to, firstName, username, rawPassword);
        } catch (Exception e) {
            // Non-fatal — staff was still created
            System.err.println("[StaffService] Failed to send credentials email: " + e.getMessage());
        }
    }

    /** Map StaffProfile → StaffResponse (status derived from emailVerified) */
    private StaffResponse toResponse(StaffProfile p) {
        AppUser u = p.getUser();
        return new StaffResponse()
            .id(p.getId())
            .userId(u.getId())
            .staffId(p.getStaffId())
            .email(u.getEmail())
            .firstName(p.getFirstName())
            .lastName(p.getLastName())
            .department(p.getDepartment())
            .position(p.getPosition())
            .phoneNumber(p.getPhoneNumber())
            .hireDate(p.getHireDate() != null ? p.getHireDate().format(DATE_FMT) : null)
            .status(u.isEmailVerified() ? "active" : "inactive")
            .createdAt(p.getCreatedAt() != null ? p.getCreatedAt().format(DATETIME_FMT) : null);
    }



}