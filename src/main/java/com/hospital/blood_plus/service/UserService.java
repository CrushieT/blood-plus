package com.hospital.blood_plus.service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.hospital.blood_plus.dto.request.RegisterRequest;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.AppUser.Role;
import com.hospital.blood_plus.repository.UserRepository;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final EmailService emailService;

    public UserService(EmailService emailService) {
        this.emailService = emailService;
    }
    public String register(RegisterRequest request) {

        // ✅ Throw exceptions so controller catches them and returns verifyRequired: false
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("Username already taken!");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already in use!");
        }
        

        String code = generateVerificationCode();

        AppUser user = new AppUser();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.ADMIN);

        // Save user
        user.setVerificationCode(code);
        user.setVerificationExpiry(LocalDateTime.now().plusMinutes(5));
        user.setEmailVerified(false);


        try {
            userRepository.save(user);
            emailService.sendVerificationEmail(user.getEmail(), code);
            return "Please verify your email";
        } catch (Exception e) {
            return "Registration failed: " + e.getMessage();
        }
    }

    public ResponseEntity<?> setupAdmin(AppUser request) {

        // ✅ Block if admin already exists
        if (userRepository.existsByRole(AppUser.Role.ADMIN)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "System already initialized."));
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Username already in use."));
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email already in use."));
        }

        String code = generateVerificationCode(); // ✅ reuse your existing method

        AppUser admin = new AppUser();
        admin.setUsername(request.getUsername());
        admin.setEmail(request.getEmail());
        admin.setPassword(passwordEncoder.encode(request.getPassword()));
        admin.setRole(AppUser.Role.ADMIN);
        admin.setEmailVerified(false);
        admin.setVerificationCode(code);
        admin.setVerificationExpiry(LocalDateTime.now().plusMinutes(10));

        try {
            userRepository.save(admin);
            emailService.sendVerificationEmail(admin.getEmail(), code);
            return ResponseEntity.ok(Map.of("message", "Admin created. Verification code sent."));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Setup failed: " + e.getMessage()));
        }
    }

    public ResponseEntity<?> verifyAdmin(Map<String, String> request) {
        String email = request.get("email");
        String code  = request.get("verificationCode");

        AppUser admin = userRepository.findByEmail(email).orElse(null);

        if (admin == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Account not found."));
        }

        if (admin.getVerificationExpiry() == null ||
            LocalDateTime.now().isAfter(admin.getVerificationExpiry())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Verification code has expired. Please request a new one."));
        }

        if (!code.equals(admin.getVerificationCode())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid verification code."));
        }

        admin.setEmailVerified(true);
        admin.setVerificationCode(null);
        admin.setVerificationExpiry(null);
        userRepository.save(admin);

        return ResponseEntity.ok(Map.of("message", "Email verified successfully."));
    }

    public ResponseEntity<?> resendAdminVerification(Map<String, String> request) {
        String email = request.get("email");

        AppUser admin = userRepository.findByEmail(email).orElse(null);

        if (admin == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Account not found."));
        }

        if (admin.isEmailVerified()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Email already verified."));
        }

        String code = generateVerificationCode(); // ✅ reuse existing method
        admin.setVerificationCode(code);
        admin.setVerificationExpiry(LocalDateTime.now().plusMinutes(10));
        userRepository.save(admin);

        try {
            emailService.sendVerificationEmail(email, code);
            return ResponseEntity.ok(Map.of("message", "New verification code sent."));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to send email."));
        }
    }

    private String generateVerificationCode() {
        return String.valueOf(1000 + new Random().nextInt(9000));
    }
}

