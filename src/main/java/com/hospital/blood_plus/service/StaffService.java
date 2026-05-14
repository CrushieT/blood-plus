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

import java.security.SecureRandom;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StaffService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final String BLOOD_BANK_DEPARTMENT = "Blood Bank";
    private static final String STAFF_CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final String TEMP_PASSWORD_CHARACTERS =
            "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final StaffProfileRepository staffRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public StaffService(StaffProfileRepository staffRepo,
                        UserRepository userRepo,
                        PasswordEncoder passwordEncoder,
                        EmailService emailService) {
        this.staffRepo = staffRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public List<StaffResponse> getAllStaff() {
        return staffRepo.findAllByOrderByLastNameAscFirstNameAsc()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public StaffResponse getStaff(Long profileId) {
        return toResponse(findProfileOrThrow(profileId));
    }

    @Transactional
    public StaffResponse createStaff(CreateStaffRequest req) {
        validateCreateRequest(req);

        String email = normalizeEmail(req.getEmail());
        String department = normalizeDepartment(req.getDepartment());
        boolean hasDashboardAccess = isBloodBankDepartment(department);

        if (staffRepo.existsByEmail(email)) {
            throw new IllegalArgumentException("A staff profile with this email already exists.");
        }
        if (hasDashboardAccess && userRepo.existsByEmail(email)) {
            throw new IllegalArgumentException("A user with this email already exists.");
        }
        if (hasDashboardAccess && "inactive".equalsIgnoreCase(req.getStatus())) {
            throw new IllegalArgumentException(
                    "Inactive staff status requires a dedicated account status field and cannot be stored in emailVerified."
            );
        }

        String resolvedStaffId = resolveStaffId(req.getStaffId(), null);
        if (staffRepo.existsByStaffId(resolvedStaffId)) {
            throw new IllegalArgumentException("Staff ID '" + resolvedStaffId + "' is already in use.");
        }

        String uniqueCode = generateUniqueStaffCode();
        AppUser user = null;
        String username = null;
        String rawPassword = null;

        if (hasDashboardAccess) {
            username = buildUniqueUsername(email);
            rawPassword = buildTemporaryPassword();

            user = new AppUser();
            user.setEmail(email);
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(rawPassword));
            user.setRole(Role.STAFF);
            user.setEmailVerified(true);
            userRepo.save(user);
        }

        StaffProfile profile = new StaffProfile();
        profile.setUser(user);
        profile.setEmail(email);
        profile.setUniqueCode(uniqueCode);
        profile.setStaffId(resolvedStaffId);
        profile.setFirstName(req.getFirstName().trim());
        profile.setLastName(req.getLastName().trim());
        profile.setDepartment(department);
        profile.setPosition(blankToNull(req.getPosition()));
        profile.setPhoneNumber(blankToNull(req.getPhoneNumber()));
        profile.setHireDate(req.getHireDate());
        staffRepo.save(profile);

        if (hasDashboardAccess) {
            sendCredentialsEmail(email, fullName(profile), username, rawPassword, uniqueCode);
        } else {
            sendAuthorizationCodeEmail(email, fullName(profile), department, uniqueCode);
        }

        return toResponse(profile);
    }

    @Transactional
    public StaffResponse updateStaff(Long profileId, UpdateStaffRequest req) {
        validateUpdateRequest(req);

        StaffProfile profile = findProfileOrThrow(profileId);
        AppUser user = profile.getUser();

        String newStaffId = resolveStaffId(req.getStaffId(), profile.getStaffId());
        if (!newStaffId.equals(profile.getStaffId()) &&
                staffRepo.existsByStaffIdAndIdNot(newStaffId, profileId)) {
            throw new IllegalArgumentException("Staff ID '" + newStaffId + "' is already used by another staff member.");
        }

        ensureProfileBasics(profile);

        profile.setFirstName(req.getFirstName().trim());
        profile.setLastName(req.getLastName().trim());
        profile.setStaffId(newStaffId);
        profile.setDepartment(normalizeDepartment(req.getDepartment()));
        profile.setPosition(blankToNull(req.getPosition()));
        profile.setPhoneNumber(blankToNull(req.getPhoneNumber()));
        profile.setHireDate(req.getHireDate());

        if (user != null && req.getStatus() != null) {
            user.setEmailVerified(!"inactive".equalsIgnoreCase(req.getStatus()));
        }

        String newPass = req.getNewPassword();
        if (newPass != null && !newPass.isBlank()) {
            if (user == null) {
                throw new IllegalArgumentException("This staff member does not have dashboard login access.");
            }
            if (newPass.length() < 6) {
                throw new IllegalArgumentException("New password must be at least 6 characters.");
            }
            user.setPassword(passwordEncoder.encode(newPass));
        }

        if (user != null) {
            userRepo.save(user);
        }
        staffRepo.save(profile);

        return toResponse(profile);
    }

    @Transactional
    public void deleteStaff(Long profileId) {
        StaffProfile profile = findProfileOrThrow(profileId);
        AppUser user = profile.getUser();
        staffRepo.delete(profile);
        if (user != null) {
            userRepo.delete(user);
        }
    }

    @Transactional
    public StaffResponse toggleStatus(Long profileId) {
        StaffProfile profile = findProfileOrThrow(profileId);
        AppUser user = profile.getUser();
        if (user == null) {
            throw new IllegalArgumentException("This staff member does not have dashboard login access.");
        }
        user.setEmailVerified(!user.isEmailVerified());
        userRepo.save(user);
        return toResponse(profile);
    }

    @Transactional
    public StaffResponse regenerateStaffCode(Long profileId) {
        StaffProfile profile = findProfileOrThrow(profileId);
        ensureProfileEmail(profile);

        String newCode = generateUniqueStaffCode();
        profile.setUniqueCode(newCode);
        staffRepo.save(profile);

        sendRegeneratedCodeEmail(
                profile.getEmail(),
                fullName(profile),
                newCode,
                profile.getUser() != null
        );

        return toResponse(profile);
    }

    public synchronized String generateUniqueStaffCode() {
        String code;
        do {
            code = buildRandomStaffCode();
        } while (staffRepo.existsByUniqueCode(code));
        return code;
    }

    private StaffProfile findProfileOrThrow(Long id) {
        return staffRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Staff profile not found: " + id));
    }

    private void validateCreateRequest(CreateStaffRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Staff details are required.");
        }
        if (req.getFirstName() == null || req.getFirstName().isBlank()) {
            throw new IllegalArgumentException("First name is required.");
        }
        if (req.getLastName() == null || req.getLastName().isBlank()) {
            throw new IllegalArgumentException("Last name is required.");
        }
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email is required.");
        }
        if (req.getDepartment() == null || req.getDepartment().isBlank()) {
            throw new IllegalArgumentException("Department is required.");
        }
    }

    private void validateUpdateRequest(UpdateStaffRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("Staff details are required.");
        }
        if (req.getFirstName() == null || req.getFirstName().isBlank()) {
            throw new IllegalArgumentException("First name is required.");
        }
        if (req.getLastName() == null || req.getLastName().isBlank()) {
            throw new IllegalArgumentException("Last name is required.");
        }
        if (req.getDepartment() == null || req.getDepartment().isBlank()) {
            throw new IllegalArgumentException("Department is required.");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String normalizeDepartment(String department) {
        String trimmed = department.trim();
        return isBloodBankDepartment(trimmed) ? BLOOD_BANK_DEPARTMENT : trimmed;
    }

    private boolean isBloodBankDepartment(String department) {
        return department != null && BLOOD_BANK_DEPARTMENT.equalsIgnoreCase(department.trim());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String buildRandomStaffCode() {
        StringBuilder raw = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            raw.append(STAFF_CODE_CHARACTERS.charAt(
                    SECURE_RANDOM.nextInt(STAFF_CODE_CHARACTERS.length())
            ));
        }
        return raw.substring(0, 4) + "-" + raw.substring(4);
    }

    private String buildTemporaryPassword() {
        StringBuilder password = new StringBuilder("Bp@");
        for (int i = 0; i < 9; i++) {
            password.append(TEMP_PASSWORD_CHARACTERS.charAt(
                    SECURE_RANDOM.nextInt(TEMP_PASSWORD_CHARACTERS.length())
            ));
        }
        return password.toString();
    }

    private String buildUniqueUsername(String email) {
        String base = email.split("@", 2)[0].replaceAll("[^a-zA-Z0-9._]", "");
        if (base.isBlank()) {
            base = "staff";
        }
        if (!userRepo.existsByUsername(base)) {
            return base;
        }
        int i = 1;
        while (userRepo.existsByUsername(base + i)) {
            i++;
        }
        return base + i;
    }

    private synchronized String resolveStaffId(String provided, String existing) {
        if (provided != null && !provided.isBlank()) {
            return provided.trim();
        }
        if (existing != null && !existing.isBlank()) {
            return existing;
        }

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

    private void ensureProfileBasics(StaffProfile profile) {
        ensureProfileEmail(profile);
        if (profile.getUniqueCode() == null || profile.getUniqueCode().isBlank()) {
            profile.setUniqueCode(generateUniqueStaffCode());
        }
    }

    private void ensureProfileEmail(StaffProfile profile) {
        if (profile.getEmail() != null && !profile.getEmail().isBlank()) {
            return;
        }
        if (profile.getUser() != null && profile.getUser().getEmail() != null) {
            profile.setEmail(profile.getUser().getEmail());
            return;
        }
        throw new IllegalArgumentException("Staff email is required.");
    }

    private void sendCredentialsEmail(String to, String staffName,
                                      String username, String rawPassword,
                                      String uniqueCode) {
        try {
            emailService.sendStaffCredentialsEmail(to, staffName, username, rawPassword, uniqueCode);
        } catch (Exception e) {
            System.err.println("[StaffService] Failed to send credentials email: " + e.getMessage());
        }
    }

    private void sendAuthorizationCodeEmail(String to, String staffName, String department, String uniqueCode) {
        try {
            emailService.sendStaffAuthorizationCodeEmail(to, staffName, department, uniqueCode);
        } catch (Exception e) {
            System.err.println("[StaffService] Failed to send authorization code email: " + e.getMessage());
        }
    }

    private void sendRegeneratedCodeEmail(String to, String staffName, String uniqueCode, boolean hasDashboardAccess) {
        try {
            emailService.sendStaffRegeneratedCodeEmail(to, staffName, uniqueCode, hasDashboardAccess);
        } catch (Exception e) {
            System.err.println("[StaffService] Failed to send regenerated code email: " + e.getMessage());
        }
    }

    private String fullName(StaffProfile profile) {
        return (profile.getFirstName() + " " + profile.getLastName()).trim();
    }

    private String maskUniqueCode(String uniqueCode) {
        if (uniqueCode == null || uniqueCode.isBlank()) {
            return null;
        }
        return uniqueCode.length() >= 5 ? uniqueCode.substring(0, 5) + "****" : "****";
    }

    private StaffResponse toResponse(StaffProfile profile) {
        AppUser user = profile.getUser();
        boolean hasDashboardAccess = user != null;
        String email = profile.getEmail();
        if ((email == null || email.isBlank()) && user != null) {
            email = user.getEmail();
        }

        return new StaffResponse()
                .id(profile.getId())
                .userId(hasDashboardAccess ? user.getId() : null)
                .staffId(profile.getStaffId())
                .email(email)
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .department(profile.getDepartment())
                .position(profile.getPosition())
                .phoneNumber(profile.getPhoneNumber())
                .hireDate(profile.getHireDate() != null ? profile.getHireDate().format(DATE_FMT) : null)
                .status(hasDashboardAccess && !user.isEmailVerified() ? "inactive" : "active")
                .hasDashboardAccess(hasDashboardAccess)
                .accountAccessStatus(hasDashboardAccess ? "Dashboard Access" : "Request Code Only")
                .codeStatus(profile.getUniqueCode() == null || profile.getUniqueCode().isBlank() ? "Missing" : "Active")
                .maskedUniqueCode(maskUniqueCode(profile.getUniqueCode()))
                .createdAt(profile.getCreatedAt() != null ? profile.getCreatedAt().format(DATETIME_FMT) : null);
    }
}
