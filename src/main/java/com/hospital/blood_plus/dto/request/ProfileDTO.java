package com.hospital.blood_plus.dto.request;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Profile-related DTOs for API requests and responses
 */
public class ProfileDTO {

    // ═════════════════════════════════════════════════════════════════
    // USER PROFILE DTO (for /api/auth/me)
    // ═════════════════════════════════════════════════════════════════

    public static class UserProfileDTO {
        public Long id;
        public String username;
        public String email;
        public String role;
        public LocalDateTime createdAt;

        public UserProfileDTO() {}

        public UserProfileDTO(Long id, String username, String email, String role, LocalDateTime createdAt) {
            this.id = id;
            this.username = username;
            this.email = email;
            this.role = role;
            this.createdAt = createdAt;
        }

        // Getters & Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    // ═════════════════════════════════════════════════════════════════
    // ADMIN PROFILE DTO
    // ═════════════════════════════════════════════════════════════════

    public static class AdminProfileDTO {
        public Long id;
        public String username;
        public String email;
        public String role;
        public LocalDateTime createdAt;

        public AdminProfileDTO() {}

        public AdminProfileDTO(Long id, String username, String email, String role, LocalDateTime createdAt) {
            this.id = id;
            this.username = username;
            this.email = email;
            this.role = role;
            this.createdAt = createdAt;
        }

        // Getters & Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }

    // ═════════════════════════════════════════════════════════════════
    // UPDATE ADMIN PROFILE REQUEST
    // ═════════════════════════════════════════════════════════════════

    public static class UpdateAdminProfileRequest {
        public String email;
        public String username;

        public UpdateAdminProfileRequest() {}

        public UpdateAdminProfileRequest(String email, String username) {
            this.email = email;
            this.username = username;
        }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
    }

    // ═════════════════════════════════════════════════════════════════
    // STAFF PROFILE DTO
    // ═════════════════════════════════════════════════════════════════

    public static class StaffProfileDTO {
        public Long id;
        public String staffId;
        public String firstName;
        public String lastName;
        public String department;
        public String position;
        public String phoneNumber;
        public LocalDate hireDate;
        public LocalDateTime createdAt;
        public UserProfileDTO user;

        public StaffProfileDTO() {}

        public StaffProfileDTO(Long id, String staffId, String firstName, String lastName,
                               String department, String position, String phoneNumber,
                               LocalDate hireDate, LocalDateTime createdAt, UserProfileDTO user) {
            this.id = id;
            this.staffId = staffId;
            this.firstName = firstName;
            this.lastName = lastName;
            this.department = department;
            this.position = position;
            this.phoneNumber = phoneNumber;
            this.hireDate = hireDate;
            this.createdAt = createdAt;
            this.user = user;
        }

        // Getters & Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getStaffId() { return staffId; }
        public void setStaffId(String staffId) { this.staffId = staffId; }

        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }

        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }

        public String getPosition() { return position; }
        public void setPosition(String position) { this.position = position; }

        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

        public LocalDate getHireDate() { return hireDate; }
        public void setHireDate(LocalDate hireDate) { this.hireDate = hireDate; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public UserProfileDTO getUser() { return user; }
        public void setUser(UserProfileDTO user) { this.user = user; }
    }

    // ═════════════════════════════════════════════════════════════════
    // UPDATE STAFF PROFILE REQUEST
    // ═════════════════════════════════════════════════════════════════

    public static class UpdateStaffProfileRequest {
        public String firstName;
        public String lastName;
        public String phoneNumber;

        public UpdateStaffProfileRequest() {}

        public UpdateStaffProfileRequest(String firstName, String lastName, String phoneNumber) {
            this.firstName = firstName;
            this.lastName = lastName;
            this.phoneNumber = phoneNumber;
        }

        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }

        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }

        public String getPhoneNumber() { return phoneNumber; }
        public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }
    }

    // ═════════════════════════════════════════════════════════════════
    // CHANGE PASSWORD REQUEST
    // ═════════════════════════════════════════════════════════════════

    public static class ChangePasswordRequest {
        public String currentPassword;
        public String newPassword;

        public ChangePasswordRequest() {}

        public ChangePasswordRequest(String currentPassword, String newPassword) {
            this.currentPassword = currentPassword;
            this.newPassword = newPassword;
        }

        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }

        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    // ═════════════════════════════════════════════════════════════════
    // MESSAGE RESPONSE
    // ═════════════════════════════════════════════════════════════════

    public static class MessageResponse {
        public String message;

        public MessageResponse() {}

        public MessageResponse(String message) {
            this.message = message;
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }
}