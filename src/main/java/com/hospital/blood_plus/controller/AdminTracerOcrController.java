package com.hospital.blood_plus.controller;

import com.hospital.blood_plus.dto.response.TracerOcrResponseDTO;
import com.hospital.blood_plus.service.DuplicateSerialException;
import com.hospital.blood_plus.service.TracerOcrService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/blood-bank")
public class AdminTracerOcrController {

    private final TracerOcrService tracerOcrService;

    public AdminTracerOcrController(TracerOcrService tracerOcrService) {
        this.tracerOcrService = tracerOcrService;
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PostMapping("/tracer-ocr")
    public ResponseEntity<?> scanTracerOcr(@RequestParam("file") MultipartFile file) {
        try {
            TracerOcrResponseDTO result = tracerOcrService.scanTracerForm(file);
            return ResponseEntity.ok(result);
        } catch (DuplicateSerialException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "error", "Some serial numbers already exist.",
                    "errorCode", "DUPLICATE_SERIALS",
                    "duplicateSerials", ex.getDuplicateSerials()
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("error", ex.getMessage()));
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("error", "Failed to process OCR request."));
        }
    }
}
