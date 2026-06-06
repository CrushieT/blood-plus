package com.hospital.blood_plus.config.ratelimitter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public class AttemptRateLimitService {

    private final Map<String, AttemptWindow> attemptsByClient = new ConcurrentHashMap<>();

    public RateLimitStatus getStatus(String scope, String clientKey, int maxAttempts, long windowMillis, long now) {
        String storageKey = buildStorageKey(scope, clientKey);
        AttemptWindow currentWindow = attemptsByClient.get(storageKey);

        if (currentWindow != null && now - currentWindow.windowStartedAt() >= windowMillis) {
            attemptsByClient.remove(storageKey, currentWindow);
            currentWindow = null;
        }

        if (currentWindow == null) {
            return new RateLimitStatus(false, 0, 0);
        }

        boolean blocked = currentWindow.attemptCount() >= maxAttempts;
        long retryAfterSeconds = blocked
                ? Math.max(1, (windowMillis - (now - currentWindow.windowStartedAt()) + 999) / 1000)
                : 0;

        return new RateLimitStatus(blocked, currentWindow.attemptCount(), retryAfterSeconds);
    }

    public void recordAttempt(String scope, String clientKey, long windowMillis, long now) {
        String storageKey = buildStorageKey(scope, clientKey);
        attemptsByClient.compute(storageKey, (key, currentWindow) -> {
            if (currentWindow == null || now - currentWindow.windowStartedAt() >= windowMillis) {
                return new AttemptWindow(1, now);
            }
            return new AttemptWindow(currentWindow.attemptCount() + 1, currentWindow.windowStartedAt());
        });
    }

    public void reset(String scope, String clientKey) {
        attemptsByClient.remove(buildStorageKey(scope, clientKey));
    }

    private String buildStorageKey(String scope, String clientKey) {
        return scope + "::" + clientKey;
    }

    private record AttemptWindow(int attemptCount, long windowStartedAt) {
    }

    public record RateLimitStatus(boolean blocked, int attemptCount, long retryAfterSeconds) {
    }
}
