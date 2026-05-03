package com.hospital.blood_plus.dto.response;

/**
 * Response object for logs summary statistics
 */
public class LogsSummaryResponse {
    private long totalFulfillments;
    private long totalStatusChanges;
    private long pendingRequestsCount;
    private long releasedCount;

    public LogsSummaryResponse() {}

    public LogsSummaryResponse(long totalFulfillments, long totalStatusChanges, 
                             long pendingRequestsCount, long releasedCount) {
        this.totalFulfillments = totalFulfillments;
        this.totalStatusChanges = totalStatusChanges;
        this.pendingRequestsCount = pendingRequestsCount;
        this.releasedCount = releasedCount;
    }

    // Getters & Setters
    public long getTotalFulfillments() {
        return totalFulfillments;
    }

    public void setTotalFulfillments(long totalFulfillments) {
        this.totalFulfillments = totalFulfillments;
    }

    public long getTotalStatusChanges() {
        return totalStatusChanges;
    }

    public void setTotalStatusChanges(long totalStatusChanges) {
        this.totalStatusChanges = totalStatusChanges;
    }

    public long getPendingRequestsCount() {
        return pendingRequestsCount;
    }

    public void setPendingRequestsCount(long pendingRequestsCount) {
        this.pendingRequestsCount = pendingRequestsCount;
    }

    public long getReleasedCount() {
        return releasedCount;
    }

    public void setReleasedCount(long releasedCount) {
        this.releasedCount = releasedCount;
    }
}