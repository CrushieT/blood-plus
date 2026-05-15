package com.hospital.blood_plus.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;


import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;


@EnableMethodSecurity  
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    



    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }


    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http   
            
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**")   
            )
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
            )
            .sessionManagement(session -> session
                .sessionFixation().newSession()
                .maximumSessions(1)
                .maxSessionsPreventsLogin(false)
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/",
                    "/favicon.ico", 
                    "/blood-request.html",
                    "/blood-request-confirmation.html",
                    "/admin-login.html",
                    "/admin-setup.html",
                    "/css/**",
                    "/js/**",
                    "/forms/**",
                    "/images/**",
                    "/assets/**"
                ).permitAll()                
                .requestMatchers("/api/auth/me").authenticated()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/req/**").permitAll()
                .requestMatchers("/api/blood-requests/confirm-remarks").permitAll()

                .requestMatchers("/hospital/**").hasRole("HOSPITAL")
                .requestMatchers("/api/hospital/**").hasAnyRole("HOSPITAL") 
                             
                .requestMatchers("/admin/**").hasAnyRole("ADMIN", "STAFF") 
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "STAFF")       

                .anyRequest().authenticated()
            )
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .invalidateHttpSession(true)
                .clearAuthentication(true)
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> {
                    response.setStatus(HttpServletResponse.SC_OK);
                    response.getWriter().write("Logged out successfully!");
                })
                .permitAll()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    String acceptHeader = request.getHeader("Accept");
                    if (acceptHeader != null && acceptHeader.contains("text/html")) {
                        response.sendRedirect("/blood-request.html");
                    } else {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"UNAUTHORIZED\"}");
                    }
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    String acceptHeader = request.getHeader("Accept");
                    if (acceptHeader != null && acceptHeader.contains("text/html")) {
                        response.sendRedirect("/blood-request.html");
                    } else {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"FORBIDDEN\"}");
                    }
                })
            );

        return http.build();
    }

}
