package com.hospital.blood_plus.config;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.webmvc.error.ErrorController;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class RoleBasedErrorController implements ErrorController {

    @RequestMapping("/error")
    public void handleError(HttpServletRequest request, HttpServletResponse response) throws Exception {
        Object statusObj = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        int status = statusObj == null ? 500 : Integer.parseInt(statusObj.toString());

        String accept = request.getHeader("Accept");
        boolean wantsHtml = accept != null && accept.contains("text/html");

        if (wantsHtml && status == 404) {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                boolean isAdmin = auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
                boolean isStaff = auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_STAFF".equals(a.getAuthority()));
                boolean isHospital = auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_HOSPITAL".equals(a.getAuthority()));

                if (isAdmin || isStaff) {
                    response.sendRedirect("/admin/admin_dashboard.html");
                    return;
                }
                if (isHospital) {
                    response.sendRedirect("/hospital/hospital-dashboard.html");
                    return;
                }
            }

            response.sendRedirect("/blood-request.html");
            return;
        }

        response.sendError(status);
    }
}
