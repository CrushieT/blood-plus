package com.hospital.blood_plus.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hospital.blood_plus.dto.response.ExportJobStatusDTO;
import jakarta.annotation.PreDestroy;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Supplier;

@Service
public class ExportJobService {
    private static final Duration JOB_TTL = Duration.ofHours(24);
    private final Map<String, ExportJobRecord> jobs = new ConcurrentHashMap<>();
    private final ExecutorService executor = Executors.newFixedThreadPool(2);
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ExportJobStatusDTO submitJsonJob(String type, String fileName, Supplier<Object> payloadSupplier) {
        cleanupExpiredJobs();

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

    public ExportJobStatusDTO getJobStatus(String jobId) {
        cleanupExpiredJobs();
        ExportJobRecord record = jobs.get(jobId);
        return record == null ? null : toStatusDto(record);
    }

    public ExportJobDownload getDownload(String jobId) {
        cleanupExpiredJobs();
        ExportJobRecord record = jobs.get(jobId);
        if (record == null) return null;
        if (record.status != JobStatus.COMPLETED || record.data == null) return null;

        ExportJobDownload download = new ExportJobDownload();
        download.fileName = record.fileName;
        download.contentType = "application/json";
        download.data = record.data;
        return download;
    }

    private void runJob(ExportJobRecord record, Supplier<Object> payloadSupplier) {
        record.status = JobStatus.PROCESSING;
        try {
            Object payload = payloadSupplier.get();
            byte[] jsonBytes = objectMapper.writeValueAsBytes(payload);
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

    private void cleanupExpiredJobs() {
        LocalDateTime now = LocalDateTime.now();
        jobs.entrySet().removeIf(entry -> {
            ExportJobRecord r = entry.getValue();
            LocalDateTime basis = r.completedAt != null ? r.completedAt : r.createdAt;
            return basis != null && basis.plus(JOB_TTL).isBefore(now);
        });
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
        private JobStatus status;
        private LocalDateTime createdAt;
        private LocalDateTime completedAt;
        private String error;
        private String fileName;
        private byte[] data;
    }

    private enum JobStatus {
        QUEUED,
        PROCESSING,
        COMPLETED,
        FAILED
    }
}
