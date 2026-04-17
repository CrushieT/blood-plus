package com.hospital.blood_plus.config;

import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class AdminCheck implements ApplicationRunner {

    private final UserRepository userRepository;

    public AdminCheck(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.existsByRole(AppUser.Role.ADMIN)) {
            System.out.println("Admin already exists, skip setup.");
            return;
        }
        System.out.println("No admin found — redirecting to setup on first boot.");
    }
}