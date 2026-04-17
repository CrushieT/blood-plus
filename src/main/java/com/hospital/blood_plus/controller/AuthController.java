package com.hospital.blood_plus.controller;


import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.hospital.blood_plus.dto.request.RegisterRequest;
import com.hospital.blood_plus.dto.request.VerifyEmailRequest;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.repository.UserRepository;
import com.hospital.blood_plus.service.UserService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.security.core.AuthenticationException;


@RestController
@RequestMapping("/api/auth")
@Validated
public class AuthController {

    @Autowired
    private com.hospital.blood_plus.service.UserService userService;

    @Autowired
    private UserRepository userRepository;

    
    private final AuthenticationManager authenticationManager;

    public AuthController( AuthenticationManager authenticationManager) {
        
        this.authenticationManager = authenticationManager;
    }


   @PostMapping("/login")
    public ResponseEntity<String> login(HttpServletRequest request, @RequestBody AppUser user) {
        try {
            Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getEmail(), user.getPassword())
            );

            com.hospital.blood_plus.model.AppUser dbUser = userRepository.findByEmail(user.getEmail())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found"));

            // ✅ Store authentication in session
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
            request.getSession(true)
                .setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

            
            boolean isHospital = auth.getAuthorities().stream()
                    .anyMatch(r -> r.getAuthority().equals("ROLE_HOSPITAL"));
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(r -> r.getAuthority().equals("ROLE_ADMIN"));

            if (isHospital) {
                return ResponseEntity.ok("LOGIN_SUCCESS_HOSPITAL");
            } else if (isAdmin) {
                return ResponseEntity.ok("LOGIN_SUCCESS_ADMIN");
            } else {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("LOGIN_FAILED_NO_ROLE");
            }

        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("LOGIN_FAILED");
        }
    }


    // @GetMapping("/me")
    // public ResponseEntity<?> getCurrentUser() {
    //     Authentication auth = SecurityContextHolder.getContext().getAuthentication();

    //     if (auth == null || !auth.isAuthenticated() ||
    //         auth.getPrincipal().equals("anonymousUser")) {
    //         return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
    //                 .body(Map.of("error", "UNAUTHORIZED"));
    //     }

    //     // ✅ Wrap in try-catch — user might not exist in DB anymore
    //     try {
    //         AppUser dbUser = userRepository.findByEmail(auth.getName())
    //                 .orElseThrow(() -> new UsernameNotFoundException("User not found"));

    //         Map<String, Object> response = new HashMap<>();
    //         response.put("email", dbUser.getEmail());
    //         response.put("role", dbUser.getRole().name());

    //         if (dbUser.getRole() == AppUser.Role.DONOR) {
    //             boolean hasProfile = donorProfileRepository.existsByUser(dbUser);
    //             response.put("hasProfile", hasProfile);
    //         }

    //         return ResponseEntity.ok(response);

    //     } catch (UsernameNotFoundException e) {
    //         //  User deleted from DB — force logout
    //         SecurityContextHolder.clearContext();
    //         return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
    //                 .body(Map.of("error", "USER_NOT_FOUND"));
    //     }
    // }
  


    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        try {
            String message = userService.register(request); 
            return ResponseEntity.ok(Map.of(
                "message", message,       
                "verifyRequired", true      // front-end uses this to open the verify popup 
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "message", e.getMessage(),
                "verifyRequired", false
            ));
        }
    }
    @PostMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody VerifyEmailRequest request) {

        AppUser user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isEmailVerified()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Email already verified"));
        }

        if (user.getVerificationExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Verification code expired"));
        }

        if (!user.getVerificationCode().equals(request.getCode())) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid verification code"));
        }

        user.setEmailVerified(true);
        user.setVerificationCode(null);
        user.setVerificationExpiry(null);

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
    }


    // ── Admin Setup ────────────────────────────────────────────────────────────
    @PostMapping("/admin/setup")
    public ResponseEntity<?> setupAdmin(@RequestBody AppUser request) {
        return userService.setupAdmin(request);
    }

    @PostMapping("/admin/verify")
    public ResponseEntity<?> verifyAdmin(@RequestBody Map<String, String> request) {
        return userService.verifyAdmin(request);
    }

    @PostMapping("/admin/resend-verification")
    public ResponseEntity<?> resendVerification(@RequestBody Map<String, String> request) {
        return userService.resendAdminVerification(request);
    }


    @GetMapping("/system-status")
    public ResponseEntity<?> getSystemStatus() {
        boolean hasAdmin = userRepository.existsByRole(AppUser.Role.ADMIN);
        return ResponseEntity.ok(Map.of("initialized", hasAdmin));
    }



}