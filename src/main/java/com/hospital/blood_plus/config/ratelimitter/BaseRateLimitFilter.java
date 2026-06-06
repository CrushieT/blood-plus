package com.hospital.blood_plus.config.ratelimitter;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public abstract class BaseRateLimitFilter extends OncePerRequestFilter {

    private final AttemptRateLimitService attemptRateLimitService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    protected BaseRateLimitFilter(AttemptRateLimitService attemptRateLimitService) {
        this.attemptRateLimitService = attemptRateLimitService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !(matchesMethod(request) && matchesPath(request));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        long now = System.currentTimeMillis();
        String clientKey = resolveClientKey(request);

        AttemptRateLimitService.RateLimitStatus status = attemptRateLimitService.getStatus(
                rateLimitScope(), clientKey, maxAttempts(), windowMillis(), now);

        if (status.blocked()) {
            writeBlockedResponse(response, status.retryAfterSeconds());
            return;
        }

        if (countAttemptBeforeChain()) {
            attemptRateLimitService.recordAttempt(rateLimitScope(), clientKey, windowMillis(), now);
        }

        filterChain.doFilter(request, response);

        if (shouldResetAttempts(response)) {
            attemptRateLimitService.reset(rateLimitScope(), clientKey);
            return;
        }

        if (!countAttemptBeforeChain() && shouldRecordAttempt(response)) {
            attemptRateLimitService.recordAttempt(
                    rateLimitScope(), clientKey, windowMillis(), System.currentTimeMillis());
        }
    }

    protected boolean countAttemptBeforeChain() {
        return false;
    }

    protected boolean shouldRecordAttempt(HttpServletResponse response) {
        return false;
    }

    protected boolean shouldResetAttempts(HttpServletResponse response) {
        return false;
    }

    protected abstract String rateLimitScope();

    protected abstract String requestPath();

    protected abstract String requestMethod();

    protected abstract int maxAttempts();

    protected abstract long windowMillis();

    protected abstract String blockedMessage(long retryAfterSeconds);

    private boolean matchesMethod(HttpServletRequest request) {
        return requestMethod().equalsIgnoreCase(request.getMethod());
    }

    private boolean matchesPath(HttpServletRequest request) {
        return requestPath().equals(request.getRequestURI());
    }

    private void writeBlockedResponse(HttpServletResponse response, long retryAfterSeconds) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        objectMapper.writeValue(response.getWriter(), Map.of(
                "error", "TOO_MANY_REQUESTS",
                "message", blockedMessage(retryAfterSeconds),
                "retryAfterSeconds", retryAfterSeconds
        ));
    }

    private String resolveClientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
