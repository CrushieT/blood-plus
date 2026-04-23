package com.hospital.blood_plus.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class RedirectIfLoggedInFilter extends OncePerRequestFilter {

    private static final List<String> BLOCKED_WHEN_LOGGED_IN = List.of(
        "/",
        "/admin_login.html"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String path = request.getRequestURI();

        // redirect root to landing page if not logged in
        if (path.equals("/") && (auth == null
                || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal()))) {
            response.sendRedirect("/index.html");
            return;
        }

        if (auth != null && auth.isAuthenticated()
                && !"anonymousUser".equals(auth.getPrincipal())
                && BLOCKED_WHEN_LOGGED_IN.contains(path)) {

            if (auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"))) {
                response.sendRedirect("/admin/admin_dashboard.html");
            } else if (auth.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_HOSPITAL"))) {
                response.sendRedirect("/hospital/hospital-dashboard.html");
            } else {
                response.sendRedirect("/blood-request.html");
            }
            return;
        }

        filterChain.doFilter(request, response);
    }
}