package com.hospital.blood_plus.config;


import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.context.SecurityContextHolder;

import com.hospital.blood_plus.config.ratelimitter.LoginRateLimitFilter;
import com.hospital.blood_plus.config.ratelimitter.RegisterRateLimitFilter;

import jakarta.servlet.http.HttpServletResponse;


@EnableMethodSecurity  
@Configuration
public class SecurityConfig {

    private final LoginRateLimitFilter loginRateLimitFilter;
    private final RegisterRateLimitFilter registerRateLimitFilter;

    public SecurityConfig(LoginRateLimitFilter loginRateLimitFilter,
            RegisterRateLimitFilter registerRateLimitFilter) {
        this.loginRateLimitFilter = loginRateLimitFilter;
        this.registerRateLimitFilter = registerRateLimitFilter;
    }



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
            .addFilterBefore(loginRateLimitFilter, AuthorizationFilter.class)
            .addFilterBefore(registerRateLimitFilter, AuthorizationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/",
                    "/favicon.ico", 
                    "/blood-request.html",
                    "/blood-request-confirmation.html",
                    "/hospital-login.html",
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
                        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                            if (auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN")) ||
                                auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_STAFF"))) {
                                response.sendRedirect("/admin/admin_dashboard.html");
                            } else if (auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_HOSPITAL"))) {
                                response.sendRedirect("/hospital/hospital-dashboard.html");
                            } else {
                                response.sendRedirect("/blood-request.html");
                            }
                        } else {
                            response.sendRedirect("/blood-request.html");
                        }
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
