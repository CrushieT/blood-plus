package com.hospital.blood_plus.controller;

import com.hospital.blood_plus.dto.request.BloodBagRequestDTO;
import com.hospital.blood_plus.dto.request.EmailConfirmationRequest;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.service.BloodBagRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class BloodRequestController {

    private final BloodBagRequestService bloodBagRequestService;

    public BloodRequestController(BloodBagRequestService bloodBagRequestService)  {
        this.bloodBagRequestService = bloodBagRequestService;
        
    }
    // ── PUBLIC: Submit anonymous blood request ─────────────────
    // Accepts multipart/form-data: "data" (JSON) + "doctorsNote" (file)

    @PostMapping("/req/blood-requests")
    public ResponseEntity<?> submitRequest(
            @RequestPart("data") BloodBagRequestDTO dto,
            @RequestPart(value = "doctorsNote", required = false) MultipartFile doctorsNote) {
        try {
            // Validate and save the request (service handles mapping and file upload)
            BloodBagRequest saved = bloodBagRequestService.submitAnonymousRequest(dto, doctorsNote);
 
            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("referenceNumber", saved.getReferenceNumber());
            response.put("status", saved.getStatus());
            response.put("requestedAt", saved.getRequestedAt());
            response.put(
                "message",
                saved.getRequesterEmail() != null && !saved.getRequesterEmail().isBlank()
                    ? "Request submitted successfully. A confirmation will be sent to " + saved.getRequesterEmail()
                    : "Request submitted successfully."
            );
 
            return ResponseEntity.ok(response);
 
        } catch (IllegalArgumentException e) {
            // Validation errors
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            // Server errors
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
            return ResponseEntity.ok(buildTrackResponse(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/blood-requests/confirm-remarks")
    public ResponseEntity<?> confirmApprovalRemarks(@RequestBody EmailConfirmationRequest dto) {
        try {
            BloodBagRequest request = bloodBagRequestService.confirmApprovalRemarksByToken(dto);
            boolean accepted = Boolean.TRUE.equals(dto.getAccepted());

            return ResponseEntity.ok(Map.of(
                "message",
                accepted
                    ? "Thank you. You accepted the updated blood request terms. The blood bank may now proceed."
                    : "You rejected the updated blood request terms. The request has been marked as rejected.",
                "status", request.getStatus(),
                "referenceNumber", request.getReferenceNumber()
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of(
                "error", "Failed to process the confirmation request. Please contact the blood bank."
            ));
        }
    }


    private Map<String, Object> buildTrackResponse(BloodBagRequest req) {
        Map<String, Object> res = new HashMap<>();

        res.put("referenceNumber", req.getReferenceNumber());
        res.put("refNum", req.getReferenceNumber());
        res.put("patientName", req.getPatientName());
        res.put("bloodType", req.getBloodType());
        res.put("bloodComponent", req.getBloodComponent());
        res.put("numberOfUnits", req.getNumberOfUnits());
        res.put("approvedUnits", req.getApprovedUnits());
        res.put("plateletCount", req.getPlateletCount());
        res.put("urgencyLevel", req.getUrgencyLevel());
        res.put("status", req.getStatus());
        res.put("submittedAt", req.getRequestedAt());
        res.put("requestedAt", req.getRequestedAt());
        res.put("reviewedAt", req.getReviewedAt());
        res.put("requestingPhysician", req.getRequestingPhysician());
        res.put("physician", req.getRequestingPhysician());
        res.put("patientPurok", req.getPatientPurok());
        res.put("patientBarangay", req.getPatientBarangay());
        res.put("patientMunicipality", req.getPatientMunicipality());
        res.put("patientProvince", req.getPatientProvince());
        res.put("requestCategory", req.getRequestCategory());
        res.put("notes", req.getNotes());
        res.put("approvalRemarks", req.getApprovalRemarks());
        res.put("alternativeComponentSuggestion", req.getAlternativeComponentSuggestion());
        res.put("patientAcceptedRemarks", req.getPatientAcceptedRemarks());
        res.put("patientRespondedAt", req.getPatientRespondedAt());
        res.put("confirmationEmailSentAt", req.getConfirmationEmailSentAt());
        res.put("rejectionReason", req.getRejectionReason());

        return res;
    }
    
 
}
