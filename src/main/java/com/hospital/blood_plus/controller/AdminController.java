package com.hospital.blood_plus.controller;

import com.hospital.blood_plus.dto.request.AllocateRequestDTO;
import com.hospital.blood_plus.dto.request.AnalyticsDTO;
import com.hospital.blood_plus.dto.request.ApproveRequestDTO;
import com.hospital.blood_plus.dto.request.BloodTracerSaveDTO;
import com.hospital.blood_plus.dto.request.BloodBankIntakeRequest;
import com.hospital.blood_plus.dto.request.DiscardBagRequest;
import com.hospital.blood_plus.dto.request.HospitalDTOs.CreateHospitalRequest;
import com.hospital.blood_plus.dto.request.HospitalDTOs.UpdateHospitalRequest;
import com.hospital.blood_plus.dto.request.ProfileDTO.AdminProfileDTO;
import com.hospital.blood_plus.dto.request.ProfileDTO.ChangePasswordRequest;
import com.hospital.blood_plus.dto.request.ProfileDTO.MessageResponse;
import com.hospital.blood_plus.dto.request.ProfileDTO.StaffProfileDTO;
import com.hospital.blood_plus.dto.request.ProfileDTO.UpdateAdminProfileRequest;
import com.hospital.blood_plus.dto.request.ProfileDTO.UpdateStaffProfileRequest;
import com.hospital.blood_plus.dto.request.RequestStatusLogDTO;
import com.hospital.blood_plus.service.HospitalService;
import com.hospital.blood_plus.service.RequestLogsService;
import com.hospital.blood_plus.service.RequestStatusLogService;
import com.hospital.blood_plus.dto.request.StaffDTOs.CreateStaffRequest;
import com.hospital.blood_plus.dto.request.StaffDTOs.StaffResponse;
import com.hospital.blood_plus.dto.request.StaffDTOs.UpdateStaffRequest;
import com.hospital.blood_plus.dto.response.AdminDashboardDTO;
import com.hospital.blood_plus.dto.response.BloodBagAvailableDTO;
import com.hospital.blood_plus.dto.response.InsideServedSummaryRow;
import com.hospital.blood_plus.dto.response.LogsSummaryResponse;
import com.hospital.blood_plus.dto.response.OutsideServedSummaryRow;
import com.hospital.blood_plus.dto.response.PaginatedResponse;
import com.hospital.blood_plus.dto.response.ServedRequestSummaryResponse;
import com.hospital.blood_plus.repository.UserRepository;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.RequestFulfillment;
import com.hospital.blood_plus.model.RequestStatusLog;
import com.hospital.blood_plus.service.AdminProfileService;
import com.hospital.blood_plus.service.AnalyticsService;
import com.hospital.blood_plus.service.BloodBagRequestService;
import com.hospital.blood_plus.service.BloodBagService;
import com.hospital.blood_plus.service.BloodTracerService;
import com.hospital.blood_plus.service.DashboardService;
import com.hospital.blood_plus.service.StaffService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final BloodBagService         bloodBagService;
    private final UserRepository          userRepository;
    private final BloodBagRequestService  bloodBagRequestService;
    private final StaffService            staffService;
    private final HospitalService         hospitalService;
    private final DashboardService        dashboardService;
    private final AdminProfileService     adminProfileService;
    private final BloodTracerService      bloodTracerService;
    private AnalyticsService              analyticsService;
    private RequestStatusLogService requestStatusLogService;
    private RequestLogsService requestLogsService;

    public AdminController(BloodBagService bloodBagService,
                           UserRepository userRepository,
                           BloodBagRequestService bloodBagRequestService,
                           HospitalService hospitalService,
                           StaffService staffService,
                           DashboardService dashboardService,
                           AdminProfileService adminProfileService,
                           BloodTracerService bloodTracerService,
                           AnalyticsService analyticsService,
                           RequestStatusLogService requestStatusLogService,
                           RequestLogsService requestLogsService) {
        this.bloodBagService         = bloodBagService;
        this.userRepository          = userRepository;
        this.bloodBagRequestService  = bloodBagRequestService;
        this.staffService = staffService;
        this.hospitalService = hospitalService;
        this.dashboardService = dashboardService;
        this.adminProfileService = adminProfileService;
        this.bloodTracerService = bloodTracerService;
        this.analyticsService = analyticsService;
        this.requestStatusLogService = requestStatusLogService;
        this.requestLogsService = requestLogsService;
    }


    // ── Dashboard ─────────────────────────────────────────────

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/dashboard")
    public ResponseEntity<?> getAdminDashboard() {
        try {
            AdminDashboardDTO dashboard = dashboardService.getDashboardSummary();
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Failed to load dashboard",
                    "error", e.getMessage()
            ));
        }
    }

    // ── Blood Bank ────────────────────────────────────────────

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/blood-bank/bags")
    public ResponseEntity<?> getAllBags() {
        return ResponseEntity.ok(bloodBagService.getAllBags());
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/blood-bank/inventory")
    public ResponseEntity<?> getInventory() {
        return ResponseEntity.ok(bloodBagService.getInventorySummary());
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PostMapping("/blood-bank/intake")
    public ResponseEntity<?> receiveStock(
            @RequestBody BloodBankIntakeRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(bloodBagService.receiveStock(request, user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PatchMapping("/blood-bank/bags/{id}/discard")
    public ResponseEntity<?> discardBag(
            @PathVariable Long id,
            @RequestBody DiscardBagRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(bloodBagService.discardBag(id, request, user));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PatchMapping("/blood-bank/bags/{id}/convert-open-system")
    public ResponseEntity<?> convertOpenSystem(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(bloodBagService.convertToOpenSystem(id));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ── Available bags (for bag picker) ──────────────────────

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/available")
    public ResponseEntity<?> getAvailableBags(
            @RequestParam String bloodType,
            @RequestParam(required = false) String component,
            @RequestParam(required = false, defaultValue = "1") int units) {
        try {
            BloodBag.BloodType type = BloodBag.BloodType.valueOf(
                    bloodType.toUpperCase()
                             .replace("-", "_")
                             .replace("+", "_POS")
                             .replace(" ", "_"));

            BloodBag.ComponentType comp = null;
            if (component != null && !component.isBlank()) {
                try {
                    comp = BloodBag.ComponentType.valueOf(component.trim().toUpperCase());
                } catch (IllegalArgumentException ignored) { }
            }

            List<BloodBagAvailableDTO> bags = bloodBagService.getAvailableBags(type, comp);
            return ResponseEntity.ok(bags);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid blood type: " + bloodType));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to fetch available bags."));
        }
    }

    // ── Blood Requests ────────────────────────────────────────

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/blood-requests")
    public ResponseEntity<List<BloodBagRequest>> getAllRequests(
            @RequestParam(required = false) BloodBagRequest.RequestStatus status) {
        List<BloodBagRequest> requests = status != null
                ? bloodBagRequestService.getByStatus(status)
                : bloodBagRequestService.getAllRequests();
        return ResponseEntity.ok(bloodBagRequestService.populateReservedBags(requests));
    }

    // PENDING → APPROVED  (no body needed — bag selection happens at allocate)

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')") 
    @PutMapping("/blood-requests/{id}/approve")
    public ResponseEntity<?> approveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Extract user with consistent logic
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));
 
            BloodBagRequest req = bloodBagRequestService.approveRequest(id, user);
            
            // Log the status change
            requestStatusLogService.logStatusChange(
                    req,
                    BloodBagRequest.RequestStatus.PENDING,
                    BloodBagRequest.RequestStatus.APPROVED,
                    user,
                    "Request approved"
            );
 
            return ResponseEntity.ok(Map.of(
                    "message",         "Request approved.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // PENDING → REJECTED

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/approve-with-remarks")
    public ResponseEntity<?> approveRequestWithRemarks(
            @PathVariable Long id,
            @RequestBody ApproveRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));

            BloodBagRequest req = bloodBagRequestService.approveRequestWithRemarks(id, dto, user);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("message", "Confirmation email sent to requester.");
            response.put("referenceNumber", req.getReferenceNumber());
            response.put("status", req.getStatus());
            response.put("approvedUnits", req.getApprovedUnits());
            response.put("approvalRemarks", req.getApprovalRemarks());
            response.put("confirmationEmailSentAt", req.getConfirmationEmailSentAt());
            response.put("requesterEmail", req.getRequesterEmail());

            return ResponseEntity.ok(response);
        } catch (IllegalStateException | IllegalArgumentException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", (e.getMessage() == null || e.getMessage().isBlank())
                    ? "Unable to approve request with remarks."
                    : e.getMessage());
            return ResponseEntity.badRequest().body(error);
        } catch (RuntimeException e) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("error", (e.getMessage() == null || e.getMessage().isBlank())
                    ? "Unable to approve request with remarks."
                    : e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/reject")
    public ResponseEntity<?> rejectRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String reason = body.getOrDefault("rejectionReason", body.getOrDefault("notes", "")).trim();
            if (reason.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Rejection reason is required."));
 
            // Extract user with consistent logic
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));

            BloodBagRequest reqBefore = bloodBagRequestService.getRequestById(id);
            BloodBagRequest.RequestStatus statusBefore = reqBefore.getStatus();
 
            BloodBagRequest req = bloodBagRequestService.rejectRequest(id, reason, user);
            
            // Log the status change with rejection reason
            requestStatusLogService.logStatusChange(
                    req,
                    statusBefore,
                    BloodBagRequest.RequestStatus.REJECTED,
                    user,
                    "Request rejected. Reason: " + reason
            );
 
            return ResponseEntity.ok(Map.of(
                    "message",         "Request rejected.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // APPROVED → ALLOCATED  (picks blood bags)

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/allocate")
    public ResponseEntity<?> allocateRequest(
            @PathVariable Long id,
            @RequestBody AllocateRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Extract user with consistent logic
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));

            BloodBagRequest reqBefore = bloodBagRequestService.getRequestById(id);
            BloodBagRequest.RequestStatus statusBefore = reqBefore.getStatus();

            BloodBagRequest req = bloodBagRequestService.allocateRequest(id, dto.getBagIds(), user);
            
            // Fetch blood types for allocated bags
            String bloodTypes = dto.getBagIds().stream()
                    .map((Long bagId) -> bloodBagService.getBagById(bagId).getBloodType().getDisplayName())
                    .distinct()
                    .collect(Collectors.joining(", "));
            
            // Log the status change
            requestStatusLogService.logStatusChange(
                    req,
                    statusBefore,
                    BloodBagRequest.RequestStatus.ALLOCATED,
                    user,
                    "Blood bags allocated. Blood Types: " + bloodTypes
            );

            return ResponseEntity.ok(Map.of(
                    "message",         "Blood bag(s) allocated successfully.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus(),
                    "reservedBags",    dto.getBagIds()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to allocate. Please try again."));
        }
    }

    // ALLOCATED / READY_FOR_RELEASE → swap bags, keep status

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/reallocate")
    public ResponseEntity<?> reallocateRequest(
            @PathVariable Long id,
            @RequestBody AllocateRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Extract user with consistent logic
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));

            BloodBagRequest reqBefore = bloodBagRequestService.getRequestById(id);
            BloodBagRequest.RequestStatus statusBefore = reqBefore.getStatus();
            
            BloodBagRequest req = bloodBagRequestService.reallocateRequest(id, dto.getBagIds(), user);
            
            // Fetch blood types for reallocated bags
            String bloodTypes = dto.getBagIds().stream()
                    .map((Long bagId) -> bloodBagService.getBagById(bagId).getBloodType().getDisplayName())
                    .distinct()
                    .collect(Collectors.joining(", "));
            
            // Log the reallocation with status change (status remains the same)
            requestStatusLogService.logStatusChange(
                    req,
                    statusBefore,
                    statusBefore,  // Status doesn't change, but we log the action
                    user,
                    "Blood bag selection updated. Blood Types: " + bloodTypes
            );

            return ResponseEntity.ok(Map.of(
                    "message",         "Blood bag selection updated.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus(),
                    "reservedBags",    dto.getBagIds()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to re-allocate. Please try again."));
        }
    }

    // ALLOCATED → READY_FOR_RELEASE

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/ready")
    public ResponseEntity<?> markReadyRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Extract user with consistent logic
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));
 
            BloodBagRequest req = bloodBagRequestService.markReadyRequest(id, user);
            
            // Log the status change
            requestStatusLogService.logStatusChange(
                    req,
                    BloodBagRequest.RequestStatus.ALLOCATED,
                    BloodBagRequest.RequestStatus.READY_FOR_RELEASE,
                    user,
                    "Request marked as ready for release"
            );
 
            return ResponseEntity.ok(Map.of(
                    "message",         "Request marked as ready for release.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // READY_FOR_RELEASE → RELEASED
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/release")
    public ResponseEntity<?> releaseRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // Extract user with consistent logic
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));

            BloodBagRequest req = bloodBagRequestService.releaseRequest(id, user);
            
            // Log the status change
            requestStatusLogService.logStatusChange(
                    req,
                    BloodBagRequest.RequestStatus.READY_FOR_RELEASE,
                    BloodBagRequest.RequestStatus.RELEASED,
                    user,
                    "Request marked as released"
            );

            return ResponseEntity.ok(Map.of(
                    "message",         "Request marked as released.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/blood-requests/{id}/tracer")
    public ResponseEntity<?> getBloodTracer(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(bloodTracerService.getTracerData(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage()));
        }
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/tracer")
    public ResponseEntity<?> saveBloodTracer(@PathVariable Long id,
                                             @RequestBody BloodTracerSaveDTO dto,
                                             @AuthenticationPrincipal UserDetails userDetails) {
        try {
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));

            Map<String, Object> tracer = bloodTracerService.saveTracerData(id, dto, user);
            return ResponseEntity.ok(Map.of(
                    "message", "Blood tracer saved successfully.",
                    "tracer", tracer
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }


    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/cancel")
    public ResponseEntity<?> cancelRequest(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String reason = body.getOrDefault("cancellationReason", body.getOrDefault("notes", "")).trim();
            if (reason.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "Cancellation note is required."));

            // Extract user with consistent logic
            AppUser user = userRepository.findByEmail(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found: " + userDetails.getUsername()));
 
            BloodBagRequest reqBefore = bloodBagRequestService.getRequestById(id);
            BloodBagRequest.RequestStatus statusBefore = reqBefore.getStatus();
            
            BloodBagRequest req = bloodBagRequestService.cancelRequest(id, reason, user);
            
            // Log the status change
            requestStatusLogService.logStatusChange(
                    req,
                    statusBefore,
                    BloodBagRequest.RequestStatus.CANCELLED,
                    user,
                    "Request cancelled. Reason: " + reason
            );
 
            return ResponseEntity.ok(Map.of(
                    "message",         "Request cancelled.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    

    //// ANALYTICS //////
    /**
     * Get all dashboard metrics
     * 
     * @return AnalyticsDTO containing all dashboard metrics
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    public ResponseEntity<AnalyticsDTO> getDashboardMetrics() {
        try {
            AnalyticsDTO metrics = analyticsService.getDashboardMetrics();
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(null);
        }
    }
 
    /**
     * Health check endpoint for analytics service
     * 
     * @return Status message
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Analytics service is running");
    }
 
    /**
     * Refresh dashboard metrics (clears any caching if implemented)
     * 
     * @return Refreshed AnalyticsDTO
     */
    @PostMapping("/refresh")
    @PreAuthorize("hasRole('ADMIN', 'STAFF')")
    public ResponseEntity<AnalyticsDTO> refreshMetrics() {
        try {
            AnalyticsDTO metrics = analyticsService.getDashboardMetrics();
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(null);
        }
    }

    ///////// STAFF MANAGEMENT ////////

    // GET /api/admin/staff
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/staff")
    public ResponseEntity<?> listStaff() {
        try {
            return ResponseEntity.ok(staffService.getAllStaff());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to load staff."));
        }
    }

    // GET /api/admin/staff/{id}
    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/staff/{id}")
    public ResponseEntity<?> getStaff(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(staffService.getStaff(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/admin/staff
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/staff")
    public ResponseEntity<?> createStaff(@RequestBody CreateStaffRequest req) {
        try {
            if (req.getEmail()     == null || req.getEmail().isBlank() ||
                req.getFirstName() == null || req.getFirstName().isBlank() ||
                req.getLastName()  == null || req.getLastName().isBlank() ||
                req.getDepartment() == null || req.getDepartment().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email, first name, last name, and department are required."));
            }
            StaffResponse created = staffService.createStaff(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (DataIntegrityViolationException e) {
            String message = "Failed to create staff account due to a database constraint.";
            if (hasUserIdNullSchemaIssue(e)) {
                message = "Database schema update required: staff_profiles.user_id must allow NULL values for non-Blood Bank staff.";
            }
            return ResponseEntity.internalServerError().body(Map.of("error", message));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to create staff account."));
        }
    }

    // PUT /api/admin/staff/{id}
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/staff/{id}")
    public ResponseEntity<?> updateStaff(@PathVariable Long id,
                                        @RequestBody UpdateStaffRequest req) {
        try {
            if (req.getFirstName() == null || req.getFirstName().isBlank() ||
                req.getLastName()  == null || req.getLastName().isBlank() ||
                req.getDepartment() == null || req.getDepartment().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "First name, last name, and department are required."));
            }
            return ResponseEntity.ok(staffService.updateStaff(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to update staff profile."));
        }
    }

    // DELETE /api/admin/staff/{id}
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/staff/{id}")
    public ResponseEntity<?> deleteStaff(@PathVariable Long id) {
        try {
            staffService.deleteStaff(id);
            return ResponseEntity.ok(Map.of("message", "Staff account deleted."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to delete staff account."));
        }
    }

    // PATCH /api/admin/staff/{id}/toggle-status
    @PreAuthorize("hasRole('ADMIN')")
    @PatchMapping("/staff/{id}/toggle-status")
    public ResponseEntity<?> toggleStatus(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(staffService.toggleStatus(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/admin/staff/{id}/regenerate-code
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/staff/{id}/regenerate-code")
    public ResponseEntity<?> regenerateStaffCode(@PathVariable Long id) {
        try {
            staffService.regenerateStaffCode(id);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "New staff authorization code generated and emailed successfully.",
                "staffId", id
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to regenerate staff authorization code."));
        }
    }

    private boolean hasUserIdNullSchemaIssue(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null &&
                    message.contains("user_id") &&
                    message.contains("cannot be null")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    
    //////// HOSPITAL MANAGEMENT////////////////
    // GET /api/admin/hospitals
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/hospitals")
    public ResponseEntity<?> listHospitals() {
        try {
            return ResponseEntity.ok(hospitalService.getAllHospitals());
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to load hospitals."));
        }
    }
    
    // GET /api/admin/hospitals/search?q=query
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/hospitals/search")
    public ResponseEntity<?> searchHospitals(@RequestParam String q) {
        try {
            if (q == null || q.isBlank()) {
                return ResponseEntity.ok(hospitalService.getAllHospitals());
            }
            return ResponseEntity.ok(hospitalService.searchHospitals(q));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Search failed."));
        }
    }
    
    // GET /api/admin/hospitals/{id}
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/hospitals/{id}")
    public ResponseEntity<?> getHospital(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(hospitalService.getHospital(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    // POST /api/admin/hospitals
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PostMapping("/hospitals")
    public ResponseEntity<?> createHospital(@RequestBody CreateHospitalRequest req) {
        try {
            if (req.getEmail() == null || req.getEmail().isBlank() ||
                req.getHospitalName() == null || req.getHospitalName().isBlank() ||
                req.getCity() == null || req.getCity().isBlank() ||
                req.getProvince() == null || req.getProvince().isBlank() ||
                req.getAddress() == null || req.getAddress().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email, hospital name, city, province, and address are required."));
            }
            var created = hospitalService.createHospital(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to create hospital account."));
        }
    }
    
    // PUT /api/admin/hospitals/{id}
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/hospitals/{id}")
    public ResponseEntity<?> updateHospital(@PathVariable Long id,
                                            @RequestBody UpdateHospitalRequest req) {
        try {
            return ResponseEntity.ok(hospitalService.updateHospital(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to update hospital profile."));
        }
    }
    
    // DELETE /api/admin/hospitals/{id}
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @DeleteMapping("/hospitals/{id}")
    public ResponseEntity<?> deleteHospital(@PathVariable Long id) {
        try {
            hospitalService.deleteHospital(id);
            return ResponseEntity.ok(Map.of("message", "Hospital account deleted."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to delete hospital account."));
        }
    }
    
    ///////////// ADMIN PROFILE PANEL/////////////////
    /**
     * Get admin's own profile
     * GET /api/admin/profile
     */
    @GetMapping("/profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminProfileDTO> getAdminProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        AdminProfileDTO profile = adminProfileService.getAdminProfile(userDetails.getUsername());
        return ResponseEntity.ok(profile);
    }
    
    /**
     * Update admin's profile (email, username)
     * PUT /api/admin/profile
     */
    @PutMapping("/profile")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateAdminProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UpdateAdminProfileRequest request) {
        try {
            AdminProfileDTO updated = adminProfileService.updateAdminProfile(
                    userDetails.getUsername(),
                    request
            );
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
 
    /**
     * Change admin password
     * POST /api/admin/change-password
     */
    @PostMapping("/change-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> changeAdminPassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChangePasswordRequest request) {
        adminProfileService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(new MessageResponse("Password updated successfully"));
    }
 
    // ═════════════════════════════════════════════════════════════════
    // STAFF PROFILE ENDPOINTS
    // ═════════════════════════════════════════════════════════════════
 
    /**
     * Get staff member's profile
     * GET /api/staff/profile
     */
    @GetMapping("/staff/profile")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<StaffProfileDTO> getStaffProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        StaffProfileDTO profile = adminProfileService.getStaffProfile(userDetails.getUsername());
        return ResponseEntity.ok(profile);
    }
 
    /**
     * Update staff member's profile (first name, last name, phone)
     * PUT /api/staff/profile
     */
    @PutMapping("/staff/profile")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<?> updateStaffProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody UpdateStaffProfileRequest request) {
        try {
            StaffProfileDTO updated = adminProfileService.updateStaffProfile(
                    userDetails.getUsername(),
                    request
            );
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }
 
    /**
     * Change staff password
     * POST /api/staff/change-password
     */
    @PostMapping("/staff/change-password")
    @PreAuthorize("hasRole('STAFF')")
    public ResponseEntity<MessageResponse> changeStaffPassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChangePasswordRequest request) {
        adminProfileService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(new MessageResponse("Password updated successfully"));
    }
 
    /////////// LOGS API ///////////
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/summary")
    public ResponseEntity<LogsSummaryResponse> getSummary() {
        LogsSummaryResponse summary = requestLogsService.getSummary();
        return ResponseEntity.ok(summary);
    }
 
    /**
     * GET /api/logs/status-logs
     * Fetch status logs with pagination, filtering, and sorting
     * 
     * Query Parameters:
     * - search: Search by request ID or reference number (optional)
     * - status: Filter by status (PENDING, APPROVED, etc.) - "ALL" for all (optional)
     * - sort: Sorting option (date_desc, date_asc, request_id) (optional, default: date_desc)
     * - page: Page number (1-based) (default: 1)
     * - size: Items per page (default: 10)
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/status-logs")
    public ResponseEntity<PaginatedResponse<RequestStatusLog>> getStatusLogs(
            @RequestParam(required = false) String search,
            @RequestParam(name = "status", defaultValue = "ALL") String statusFilter,
            @RequestParam(defaultValue = "date_desc") String sort,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
 
        Page<RequestStatusLog> logsPage = requestLogsService.getStatusLogs(
                search,
                statusFilter,
                sort,
                page,
                size
        );
 
        PaginatedResponse<RequestStatusLog> response = new PaginatedResponse<>(
                logsPage.getContent(),
                logsPage.getNumber() + 1, // Convert to 1-based page number
                logsPage.getTotalPages(),
                logsPage.getTotalElements(),
                logsPage.getSize()
        );
 
        return ResponseEntity.ok(response);
    }
 
    /**
     * GET /api/logs/status-logs/{id}
     * Get details of a specific status log
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/status-logs/{id}")
    public ResponseEntity<RequestStatusLog> getStatusLogDetail(@PathVariable Long id) {
        RequestStatusLog log = requestLogsService.getStatusLogDetail(id);
        if (log == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(log);
    }
 
    /**
     * GET /api/logs/fulfillments
     * Fetch fulfillment logs with pagination, filtering, and sorting
     * 
     * Query Parameters:
     * - search: Search by request ID or blood bag number (optional)
     * - dateFrom: Filter from date (ISO format: 2024-01-10) (optional)
     * - dateTo: Filter to date (ISO format: 2024-01-10) (optional)
     * - sort: Sorting option (date_desc, date_asc, request_id) (optional, default: date_desc)
     * - page: Page number (1-based) (default: 1)
     * - size: Items per page (default: 10)
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/fulfillments")
    public ResponseEntity<PaginatedResponse<RequestFulfillment>> getFulfillments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDateTime dateTo,
            @RequestParam(defaultValue = "date_desc") String sort,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {
 
        Page<RequestFulfillment> fulfillmentsPage = requestLogsService.getFulfillments(
                search,
                dateFrom,
                dateTo,
                sort,
                page,
                size
        );
 
        PaginatedResponse<RequestFulfillment> response = new PaginatedResponse<>(
                fulfillmentsPage.getContent(),
                fulfillmentsPage.getNumber() + 1, // Convert to 1-based page number
                fulfillmentsPage.getTotalPages(),
                fulfillmentsPage.getTotalElements(),
                fulfillmentsPage.getSize()
        );
 
        return ResponseEntity.ok(response);
    }
 
    /**
     * GET /api/logs/fulfillments/{id}
     * Get details of a specific fulfillment
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/fulfillments/{id}")
    public ResponseEntity<RequestFulfillment> getFulfillmentDetail(@PathVariable Long id) {
        RequestFulfillment fulfillment = requestLogsService.getFulfillmentDetail(id);
        if (fulfillment == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(fulfillment);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/served")
    public ResponseEntity<PaginatedResponse<ServedRequestSummaryResponse>> getServedLogs(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "ALL") String requestGroup,
            @RequestParam(defaultValue = "date_desc") String sort,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size) {

        PaginatedResponse<ServedRequestSummaryResponse> servedPage = requestLogsService.getServedRequests(
                search,
                startDate,
                endDate,
                requestGroup,
                sort,
                page,
                size
        );
        return ResponseEntity.ok(servedPage);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/served/{requestId}")
    public ResponseEntity<ServedRequestSummaryResponse> getServedLogDetail(@PathVariable Long requestId) {
        ServedRequestSummaryResponse detail = requestLogsService.getServedRequestDetail(requestId);
        if (detail == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(detail);
    }
 
    /**
     * GET /api/logs/export/status-logs
     * Export status logs as JSON (for Excel export on frontend)
     * 
     * Query Parameters:
     * - search: Search filter (optional)
     * - status: Status filter (optional)
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/export/status-logs")
    public ResponseEntity<List<RequestStatusLog>> exportStatusLogs(
            @RequestParam(required = false) String search,
            @RequestParam(name = "status", defaultValue = "ALL") String statusFilter,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
 
        List<RequestStatusLog> logs = requestLogsService.exportStatusLogs(search, statusFilter, startDate, endDate);
        return ResponseEntity.ok(logs);
    }
 
    /**
     * GET /api/logs/export/fulfillments
     * Export fulfillments as JSON (for Excel export on frontend)
     * 
     * Query Parameters:
     * - search: Search filter (optional)
     * - dateFrom: Date from filter (optional)
     * - dateTo: Date to filter (optional)
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/export/fulfillments")
    public ResponseEntity<List<RequestFulfillment>> exportFulfillments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDateTime dateTo) {
 
        List<RequestFulfillment> fulfillments = requestLogsService.exportFulfillments(search, dateFrom, dateTo);
        return ResponseEntity.ok(fulfillments);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/export/served/details")
    public ResponseEntity<List<ServedRequestSummaryResponse>> exportServedDetails(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "ALL") String requestGroup,
            @RequestParam(defaultValue = "date_desc") String sort) {
        return ResponseEntity.ok(requestLogsService.exportServedDetails(search, startDate, endDate, requestGroup, sort));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/export/served/inside-summary")
    public ResponseEntity<List<InsideServedSummaryRow>> exportInsideServedSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(requestLogsService.exportInsideServedSummary(startDate, endDate));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/logs/export/served/outside-summary")
    public ResponseEntity<List<OutsideServedSummaryRow>> exportOutsideServedSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(requestLogsService.exportOutsideServedSummary(startDate, endDate));
    }


    // ═════════════════════════════════════════════════════════════════
    // UNIVERSAL ENDPOINT (for /api/auth/change-password)
    // ═════════════════════════════════════════════════════════════════
 
    /**
     * Change password for any authenticated user
     * POST /api/auth/change-password
     */
    @PostMapping("/auth/change-password")
    public ResponseEntity<MessageResponse> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ChangePasswordRequest request) {
        adminProfileService.changePassword(userDetails.getUsername(), request);
        return ResponseEntity.ok(new MessageResponse("Password updated successfully"));
    }


    // ─────────────────────────────────────
    // Helper Methods
    // ─────────────────────────────────────
 
    /**
     * Maps a RequestStatusLog entity to RequestStatusLogDTO.
     */
    private RequestStatusLogDTO mapToDTO(RequestStatusLog log) {
        RequestStatusLogDTO dto = new RequestStatusLogDTO();
        dto.setId(log.getId());
        dto.setRequestId(log.getRequest().getId());
        dto.setReferenceNumber(log.getRequest().getReferenceNumber());
        dto.setOldStatus(log.getOldStatus());
        dto.setNewStatus(log.getNewStatus());
        dto.setChangedByEmail(log.getChangedBy() != null ? log.getChangedBy().getEmail() : null);
        dto.setChangedByFullName(log.getChangedBy() != null ? log.getChangedBy().getUsername() : "System");
        dto.setChangedAt(log.getChangedAt());
        dto.setNotes(log.getNotes());
        return dto;
    }
}
