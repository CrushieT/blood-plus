package com.hospital.blood_plus.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.blood_plus.dto.response.ExportJobStatusDTO;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

@Service
public class ExportJobService {
    private final Map<String, ExportJobRecord> jobs = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Object jobLock = new Object();

    @Value("${export.jobs.max-jobs:50}")
    private int maxJobs;

    @Value("${export.jobs.max-cache-age:PT1H}")
    private Duration jobTtl;

    @Value("${export.jobs.max-payload-bytes:5242880}")
    private long maxPayloadBytes;

    public ExportJobStatusDTO submitJsonJob(String type, String fileName, Supplier<Object> payloadSupplier) {
        synchronized (jobLock) {
            cleanupExpiredJobsLocked();
            trimToMaxJobsLocked();

            if (jobs.size() >= maxJobs) {
                throw new IllegalStateException("Too many export jobs in memory. Please retry after a few minutes.");
            }

            String jobId = UUID.randomUUID().toString();
            ExportJobRecord record = new ExportJobRecord();
            record.jobId = jobId;
            record.type = type;
            record.status = JobStatus.QUEUED;
            record.createdAt = LocalDateTime.now();
            record.fileName = fileName;
            jobs.put(jobId, record);

            CompletableFuture.runAsync(() -> runJob(record, payloadSupplier), executor);
            return toStatusDto(record);
        }
    }

    public ExportJobStatusDTO getJobStatus(String jobId) {
        synchronized (jobLock) {
            cleanupExpiredJobsLocked();
            ExportJobRecord record = jobs.get(jobId);
            return record == null ? null : toStatusDto(record);
        }
    }

    public ExportJobDownload getDownload(String jobId) {
        synchronized (jobLock) {
            cleanupExpiredJobsLocked();
            ExportJobRecord record = jobs.get(jobId);
            if (record == null) return null;
            if (record.status != JobStatus.COMPLETED || record.data == null) return null;

            ExportJobDownload download = new ExportJobDownload();
            download.fileName = record.fileName;
            download.contentType = "application/json";
            download.data = record.data;
            return download;
        }
    }

    private void runJob(ExportJobRecord record, Supplier<Object> payloadSupplier) {
        record.status = JobStatus.PROCESSING;
        try {
            Object payload = payloadSupplier.get();
            byte[] jsonBytes = objectMapper.writeValueAsBytes(payload);

            if (jsonBytes.length > maxPayloadBytes) {
                throw new IllegalStateException(
                        "Export payload exceeds configured size limit of " + maxPayloadBytes + " bytes."
                );
            }

            record.data = jsonBytes;
            record.status = JobStatus.COMPLETED;
            record.completedAt = LocalDateTime.now();
            record.error = null;
        } catch (Exception ex) {
            record.status = JobStatus.FAILED;
            record.completedAt = LocalDateTime.now();
            record.error = ex.getMessage();
            record.data = null;
        }
    }

    @Scheduled(fixedDelayString = "${export.jobs.cleanup-interval:PT10M}")
    public void scheduledCleanup() {
        synchronized (jobLock) {
            cleanupExpiredJobsLocked();
            trimToMaxJobsLocked();
        }
    }

    private ExportJobStatusDTO toStatusDto(ExportJobRecord record) {
        ExportJobStatusDTO dto = new ExportJobStatusDTO();
        dto.setJobId(record.jobId);
        dto.setType(record.type);
        dto.setStatus(record.status.name());
        dto.setCreatedAt(record.createdAt);
        dto.setCompletedAt(record.completedAt);
        dto.setError(record.error);
        dto.setFileName(record.fileName);
        if (record.status == JobStatus.COMPLETED) {
            dto.setMessage("Export file is ready for download.");
        } else if (record.status == JobStatus.FAILED) {
            dto.setMessage("Export failed.");
        } else {
            dto.setMessage("Export is being processed.");
        }
        return dto;
    }

    private void cleanupExpiredJobsLocked() {
        LocalDateTime now = LocalDateTime.now();
        jobs.entrySet().removeIf(entry -> {
            ExportJobRecord r = entry.getValue();
            LocalDateTime basis = r.completedAt != null ? r.completedAt : r.createdAt;
            return basis != null && basis.plus(jobTtl).isBefore(now);
        });
    }

    private void trimToMaxJobsLocked() {
        if (jobs.size() <= maxJobs) {
            return;
        }

        List<Map.Entry<String, ExportJobRecord>> terminalJobs = new ArrayList<>();
        for (Map.Entry<String, ExportJobRecord> entry : jobs.entrySet()) {
            JobStatus status = entry.getValue().status;
            if (status == JobStatus.COMPLETED || status == JobStatus.FAILED) {
                terminalJobs.add(entry);
            }
        }

        terminalJobs.sort(Comparator.comparing(entry -> {
            ExportJobRecord record = entry.getValue();
            LocalDateTime basis = record.completedAt != null ? record.completedAt : record.createdAt;
            return basis != null ? basis : LocalDateTime.MIN;
        }));

        int idx = 0;
        while (jobs.size() > maxJobs && idx < terminalJobs.size()) {
            jobs.remove(terminalJobs.get(idx).getKey());
            idx++;
        }
    }

    @PreDestroy
    public void shutdown() {
        executor.shutdownNow();
    }

    public static class ExportJobDownload {
        private String fileName;
        private String contentType;
        private byte[] data;

        public String getFileName() {
            return fileName;
        }

        public String getContentType() {
            return contentType;
        }

        public byte[] getData() {
            return data;
        }
    }

    private static class ExportJobRecord {
        private String jobId;
        private String type;
        private volatile JobStatus status;
        private LocalDateTime createdAt;
        private volatile LocalDateTime completedAt;
        private volatile String error;
        private String fileName;
        private volatile byte[] data;
    }

    private enum JobStatus {
        QUEUED,
        PROCESSING,
        COMPLETED,
        FAILED
    }
}
