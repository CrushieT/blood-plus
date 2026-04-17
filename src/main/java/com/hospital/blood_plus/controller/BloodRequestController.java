package com.hospital.blood_plus.controller;

import com.hospital.blood_plus.dto.request.BloodBagRequestDTO;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.service.BloodBagRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BloodRequestController {

    private final BloodBagRequestService bloodBagRequestService;

    public BloodRequestController(BloodBagRequestService bloodBagRequestService) {
        this.bloodBagRequestService = bloodBagRequestService;
    }
    // ── PUBLIC: Submit anonymous blood request ─────────────────
    // Accepts multipart/form-data: "data" (JSON) + "doctorsNote" (file)

    @PostMapping("/req/blood-requests")
    public ResponseEntity<?> submitRequest(
            @RequestPart("data") BloodBagRequestDTO dto,
            @RequestPart(value = "doctorsNote", required = false) MultipartFile doctorsNote) {
        try {
            BloodBagRequest saved = bloodBagRequestService.submitAnonymousRequest(dto, doctorsNote);

            Map<String, Object> response = new HashMap<>();
            response.put("referenceNumber", saved.getReferenceNumber());
            response.put("status", saved.getStatus());
            response.put("message", "Request submitted successfully. A confirmation will be sent to " + saved.getRequesterEmail());

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to submit request. Please try again."));
        }
    }

    // ── PUBLIC: Track request by reference number ──────────────

    @GetMapping("/req/blood-requests/track/{refNum}")
    public ResponseEntity<?> trackRequest(@PathVariable String refNum) {
        try {
            BloodBagRequest req = bloodBagRequestService.getByReferenceNumber(refNum);
            // return ResponseEntity.ok(buildTrackResponse(req));
            return ResponseEntity.ok(buildTrackResponse(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    // ── ADMIN: Get all requests ────────────────────────────────

    @GetMapping("/admin/blood-requests")
    public ResponseEntity<List<BloodBagRequest>> getAllRequests(
            @RequestParam(required = false) BloodBagRequest.RequestStatus status) {
        if (status != null) {
            return ResponseEntity.ok(bloodBagRequestService.getByStatus(status));
        }
        return ResponseEntity.ok(bloodBagRequestService.getAllRequests());
    }

    // ── ADMIN: Approve ─────────────────────────────────────────
    @PutMapping("/admin/blood-requests/{id}/approve")
    public ResponseEntity<?> approveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.approveRequest(id, currentUser);
            return ResponseEntity.ok(Map.of(
                    "message", "Request approved.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status", req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── ADMIN: Allocate ────────────────────────────────────────
    @PutMapping("/admin/blood-requests/{id}/allocate")
    public ResponseEntity<?> allocateRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.allocateRequest(id, currentUser);
            return ResponseEntity.ok(Map.of(
                    "message", "Request marked as allocated.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status", req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── ADMIN: Mark Ready for Release ──────────────────────────
    @PutMapping("/admin/blood-requests/{id}/ready")
    public ResponseEntity<?> markReadyRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.markReadyRequest(id, currentUser);
            return ResponseEntity.ok(Map.of(
                    "message", "Request marked as ready for release.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status", req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── ADMIN: Release ─────────────────────────────────────────
    @PutMapping("/admin/blood-requests/{id}/release")
    public ResponseEntity<?> releaseRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.releaseRequest(id, currentUser);
            return ResponseEntity.ok(Map.of(
                    "message", "Request marked as released.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status", req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── ADMIN: Reject ──────────────────────────────────────────
    @PutMapping("/admin/blood-requests/{id}/reject")
    public ResponseEntity<?> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            String reason = body.getOrDefault("rejectionReason", "").trim();
            if (reason.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Rejection reason is required."));

            BloodBagRequest req = bloodBagRequestService.rejectRequest(id, reason, currentUser);
            return ResponseEntity.ok(Map.of(
                    "message", "Request rejected.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status", req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── ADMIN: Cancel ──────────────────────────────────────────
    @PutMapping("/admin/blood-requests/{id}/cancel")
    public ResponseEntity<?> cancelRequest(@PathVariable Long id) {
        try {
            BloodBagRequest req = bloodBagRequestService.cancelRequest(id);
            return ResponseEntity.ok(Map.of(
                    "message", "Request cancelled.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status", req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
    private Map<String, Object> buildTrackResponse(BloodBagRequest req) {
        Map<String, Object> res = new HashMap<>();

        res.put("refNum", req.getReferenceNumber());
        res.put("patientName", req.getPatientName());
        res.put("bloodType", req.getBloodType());
        res.put("bloodComponent", req.getBloodComponent());
        res.put("numberOfUnits", req.getNumberOfUnits());
        res.put("urgencyLevel", req.getUrgencyLevel());
        res.put("status", req.getStatus());
        res.put("submittedAt", req.getRequestedAt());
        res.put("reviewedAt", req.getReviewedAt());
        res.put("physician", req.getRequestingPhysician());
        res.put("requestCategory", req.getRequestCategory());
        res.put("rejectionReason", req.getRejectionReason());

        return res;
    }
}