package com.hospital.blood_plus.config.ratelimitter;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletResponse;

@Component
public class LoginRateLimitFilter extends BaseRateLimitFilter {

    private static final String LOGIN_SCOPE = "login";
    private static final String LOGIN_PATH = "/api/auth/login";

    private final int maxAttempts;
    private final long windowMillis;

    public LoginRateLimitFilter(
            AttemptRateLimitService attemptRateLimitService,
            @Value("${app.rate-limit.login.max-attempts:5}") int maxAttempts,
            @Value("${app.rate-limit.login.window-seconds:60}") long windowSeconds) {
        super(attemptRateLimitService);
        this.maxAttempts = maxAttempts;
        this.windowMillis = Duration.ofSeconds(windowSeconds).toMillis();
    }

    @Override
    protected String rateLimitScope() {
        return LOGIN_SCOPE;
    }

    @Override
    protected String requestPath() {
        return LOGIN_PATH;
    }

    @Override
    protected String requestMethod() {
        return "POST";
    }

    @Override
    protected int maxAttempts() {
        return maxAttempts;
    }

    @Override
    protected long windowMillis() {
        return windowMillis;
    }

    @Override
    protected boolean shouldRecordAttempt(HttpServletResponse response) {
        return response.getStatus() == HttpStatus.UNAUTHORIZED.value()
                || response.getStatus() == HttpStatus.FORBIDDEN.value();
    }

    @Override
    protected boolean shouldResetAttempts(HttpServletResponse response) {
        return response.getStatus() == HttpStatus.OK.value();
    }

    @Override
    protected String blockedMessage(long retryAfterSeconds) {
        return "Too many failed login attempts, try again in " + retryAfterSeconds + " seconds.";
    }
}
