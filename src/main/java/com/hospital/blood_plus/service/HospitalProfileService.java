package com.hospital.blood_plus.service;

import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.HospitalProfile;
import com.hospital.blood_plus.repository.HospitalProfileRepository;
import com.hospital.blood_plus.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class HospitalProfileService {

    private final HospitalProfileRepository hospitalProfileRepository;
    private final UserRepository userRepository;

    public HospitalProfileService(
            HospitalProfileRepository hospitalProfileRepository,
            UserRepository userRepository) {
        this.hospitalProfileRepository = hospitalProfileRepository;
        this.userRepository = userRepository;
    }

    /**
     * Get hospital profile for authenticated user
     */
    public HospitalProfile getHospitalProfile(AppUser user) {
        return hospitalProfileRepository.findByUser(user)
                .orElseThrow(() -> new IllegalArgumentException("Hospital profile not found for this user"));
    }

    /**
     * Get hospital profile by ID (with ownership check)
     */
    public HospitalProfile getHospitalProfileById(Long profileId, AppUser user) {
        HospitalProfile profile = hospitalProfileRepository.findById(profileId)
                .orElseThrow(() -> new IllegalArgumentException("Hospital profile not found"));
        
        // Verify ownership
        if (!profile.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You do not have permission to access this profile");
        }
        
        return profile;
    }

    /**
     * Update hospital profile
     */
    @Transactional
    public HospitalProfile updateHospitalProfile(
            Long profileId,
            String hospitalName,
            String address,
            String city,
            String province,
            String phoneNumber,
            String contactPersonName,
            String contactPersonPhone,
            AppUser user) {
        
        HospitalProfile profile = getHospitalProfileById(profileId, user);
        
        // Update fields
        if (hospitalName != null && !hospitalName.trim().isEmpty()) {
            profile.setHospitalName(hospitalName.trim());
        }
        if (address != null && !address.trim().isEmpty()) {
            profile.setAddress(address.trim());
        }
        if (city != null && !city.trim().isEmpty()) {
            profile.setCity(city.trim());
        }
        if (province != null && !province.trim().isEmpty()) {
            profile.setProvince(province.trim());
        }
        if (phoneNumber != null && !phoneNumber.trim().isEmpty()) {
            profile.setPhoneNumber(phoneNumber.trim());
        }
        if (contactPersonName != null && !contactPersonName.trim().isEmpty()) {
            profile.setContactPersonName(contactPersonName.trim());
        }
        if (contactPersonPhone != null && !contactPersonPhone.trim().isEmpty()) {
            profile.setContactPersonPhone(contactPersonPhone.trim());
        }
        
        return hospitalProfileRepository.save(profile);
    }

    /**
     * Change password for hospital user
     */
    @Transactional
    public void changePassword(
            AppUser user,
            String currentPassword,
            String newPassword) {
        
        // Validation would be done in controller with PasswordEncoder
        if (currentPassword == null || currentPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("Current password is required");
        }
        if (newPassword == null || newPassword.trim().isEmpty()) {
            throw new IllegalArgumentException("New password is required");
        }
        if (newPassword.length() < 6) {
            throw new IllegalArgumentException("New password must be at least 6 characters");
        }
        
        user.setPassword(newPassword);
        userRepository.save(user);
    }
}