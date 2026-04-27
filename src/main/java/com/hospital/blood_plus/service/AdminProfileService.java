package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.ProfileDTO.*;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.StaffProfile;
import com.hospital.blood_plus.repository.UserRepository;
import com.hospital.blood_plus.repository.StaffProfileRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@Transactional
public class AdminProfileService {

    private final UserRepository userRepository;
    private final StaffProfileRepository staffProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminProfileService(UserRepository userRepository,
                          StaffProfileRepository staffProfileRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.staffProfileRepository = staffProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ═════════════════════════════════════════════════════════════════
    // GET CURRENT USER PROFILE
    // ═════════════════════════════════════════════════════════════════

    /**
     * Get current authenticated user's profile information
     * Used for /api/auth/me endpoint
     */
    public UserProfileDTO getCurrentUserProfile(String username) {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        return new UserProfileDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().toString(),
                getCurrentUserCreatedAt(user)
        );
    }

    /**
     * Helper to get user creation date
     */
    private LocalDateTime getCurrentUserCreatedAt(AppUser user) {
        // If AppUser doesn't have createdAt, create a default or fetch from StaffProfile
        if (user.getRole() == AppUser.Role.STAFF) {
            StaffProfile staff = staffProfileRepository.findByUser(user).orElse(null);
            if (staff != null && staff.getCreatedAt() != null) {
                return staff.getCreatedAt();
            }
        }
        return LocalDateTime.now();
    }

    // ═════════════════════════════════════════════════════════════════
    // ADMIN PROFILE METHODS
    // ═════════════════════════════════════════════════════════════════

    /**
     * Get admin profile information
     */
    public AdminProfileDTO getAdminProfile(String email) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Admin user not found: " + email));

        if (user.getRole() != AppUser.Role.ADMIN) {
            throw new RuntimeException("User is not an admin");
        }

        return new AdminProfileDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().toString(),
                LocalDateTime.now() // You can add createdAt to AppUser if needed
        );
    }

    /**
     * Update admin profile (email and username)
     */
    public AdminProfileDTO updateAdminProfile(String email, UpdateAdminProfileRequest request) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Admin user not found: " + email));

        if (user.getRole() != AppUser.Role.ADMIN) {
            throw new RuntimeException("User is not an admin");
        }

        // Validate email uniqueness
        if (!user.getEmail().equals(request.getEmail())) {
            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                throw new RuntimeException("Email already in use");
            }
        }

        // Validate username uniqueness
        if (!user.getUsername().equals(request.getUsername())) {
            if (userRepository.findByUsername(request.getUsername()).isPresent()) {
                throw new RuntimeException("Username already in use");
            }
        }

        user.setEmail(request.getEmail());
        user.setUsername(request.getUsername());
        userRepository.save(user);

        return new AdminProfileDTO(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().toString(),
                LocalDateTime.now()
        );
    }

    // ═════════════════════════════════════════════════════════════════
    // STAFF PROFILE METHODS
    // ═════════════════════════════════════════════════════════════════

    /**
     * Get staff profile information (includes linked AppUser)
     */
    public StaffProfileDTO getStaffProfile(String email) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Staff user not found: " + email));

        if (user.getRole() != AppUser.Role.STAFF) {
            throw new RuntimeException("User is not a staff member");
        }

        StaffProfile staff = staffProfileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Staff profile not found for user: " + email));

        return staffProfileToDTO(staff);
    }

    /**
     * Update staff profile (first name, last name, phone number)
     */
    public StaffProfileDTO updateStaffProfile(String email, UpdateStaffProfileRequest request) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Staff user not found: " + email));

        if (user.getRole() != AppUser.Role.STAFF) {
            throw new RuntimeException("User is not a staff member");
        }

        StaffProfile staff = staffProfileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Staff profile not found for user: " + email));

        // Update fields
        staff.setFirstName(request.getFirstName());
        staff.setLastName(request.getLastName());
        staff.setPhoneNumber(request.getPhoneNumber());

        staffProfileRepository.save(staff);

        return staffProfileToDTO(staff);
    }

    // ═════════════════════════════════════════════════════════════════
    // PASSWORD CHANGE
    // ═════════════════════════════════════════════════════════════════

    /**
     * Change password for any user (admin or staff)
     */
    public void changePassword(String email, ChangePasswordRequest request) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found: " + email));

        // Validate current password
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        // Validate new password is different
        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new RuntimeException("New password must be different from current password");
        }

        // Validate new password length
        if (request.getNewPassword().length() < 8) {
            throw new RuntimeException("New password must be at least 8 characters long");
        }

        // Encode and save new password
        String encodedPassword = passwordEncoder.encode(request.getNewPassword());
        user.setPassword(encodedPassword);
        userRepository.save(user);
    }

    // ═════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═════════════════════════════════════════════════════════════════

    /**
     * Convert StaffProfile entity to DTO
     */
    private StaffProfileDTO staffProfileToDTO(StaffProfile staff) {
        UserProfileDTO userDTO = new UserProfileDTO(
                staff.getUser().getId(),
                staff.getUser().getUsername(),
                staff.getUser().getEmail(),
                staff.getUser().getRole().toString(),
                staff.getCreatedAt()
        );

        return new StaffProfileDTO(
                staff.getId(),
                staff.getStaffId(),
                staff.getFirstName(),
                staff.getLastName(),
                staff.getDepartment(),
                staff.getPosition(),
                staff.getPhoneNumber(),
                staff.getHireDate(),
                staff.getCreatedAt(),
                userDTO
        );
    }
}