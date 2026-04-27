package com.hospital.blood_plus.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

import com.hospital.blood_plus.model.AppUser;

public interface UserRepository extends JpaRepository<AppUser, Long> {

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    Optional<AppUser> findByUsername(String username); 
    Optional<AppUser> findByEmail(String email);

    boolean existsByRole(AppUser.Role role);

}