package com.hospital.blood_plus.config.ratelimitter;

import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class RegisterRateLimitFilter extends BaseRateLimitFilter {

    private static final String REGISTER_SCOPE = "register";
    private static final String REGISTER_PATH = "/api/auth/register";

    private final int maxAttempts;
    private final long windowMillis;

    public RegisterRateLimitFilter(
            AttemptRateLimitService attemptRateLimitService,
            @Value("${app.rate-limit.register.max-attempts:3}") int maxAttempts,
            @Value("${app.rate-limit.register.window-seconds:300}") long windowSeconds) {
        super(attemptRateLimitService);
        this.maxAttempts = maxAttempts;
        this.windowMillis = Duration.ofSeconds(windowSeconds).toMillis();
    }

    @Override
    protected boolean countAttemptBeforeChain() {
        return true;
    }

    @Override
    protected String rateLimitScope() {
        return REGISTER_SCOPE;
    }

    @Override
    protected String requestPath() {
        return REGISTER_PATH;
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
    protected String blockedMessage(long retryAfterSeconds) {
        return "Too many registration attempts, try again in " + retryAfterSeconds + " seconds.";
    }
}
