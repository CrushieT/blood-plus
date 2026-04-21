package com.hospital.blood_plus.controller;

import com.hospital.blood_plus.dto.request.AllocateRequestDTO;
import com.hospital.blood_plus.dto.request.BloodBankIntakeRequest;
import com.hospital.blood_plus.dto.request.DiscardBagRequest;
import com.hospital.blood_plus.dto.request.StaffDTOs.CreateStaffRequest;
import com.hospital.blood_plus.dto.request.StaffDTOs.StaffResponse;
import com.hospital.blood_plus.dto.request.StaffDTOs.UpdateStaffRequest;
import com.hospital.blood_plus.dto.response.BloodBagAvailableDTO;
import com.hospital.blood_plus.repository.UserRepository;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.service.BloodBagRequestService;
import com.hospital.blood_plus.service.BloodBagService;
import com.hospital.blood_plus.service.StaffService;

import java.util.List;
import java.util.Map;

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
    private final StaffService staffService;

    public AdminController(BloodBagService bloodBagService,
                           UserRepository userRepository,
                           BloodBagRequestService bloodBagRequestService,
                            StaffService staffService) {
        this.bloodBagService         = bloodBagService;
        this.userRepository          = userRepository;
        this.bloodBagRequestService  = bloodBagRequestService;
        this.staffService = staffService;
    }

    // ── Dashboard ─────────────────────────────────────────────

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard() {
        try {
            return ResponseEntity.ok(bloodBagService.getDashboardSummary());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
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
        return ResponseEntity.ok(
                status != null
                        ? bloodBagRequestService.getByStatus(status)
                        : bloodBagRequestService.getAllRequests());
    }

    // PENDING → APPROVED  (no body needed — bag selection happens at allocate)

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/approve")
    public ResponseEntity<?> approveRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.approveRequest(id, currentUser);
            return ResponseEntity.ok(Map.of(
                    "message",         "Request approved.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // PENDING → REJECTED

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/reject")
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
                    "message",         "Request rejected.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // APPROVED → ALLOCATED  (picks blood bags)

    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/allocate")
    public ResponseEntity<?> allocateRequest(
            @PathVariable Long id,
            @RequestBody AllocateRequestDTO dto,
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.allocateRequest(id, dto.getBagIds(), currentUser);
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
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.reallocateRequest(id, dto.getBagIds(), currentUser);
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
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.markReadyRequest(id, currentUser);
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
            @AuthenticationPrincipal AppUser currentUser) {
        try {
            BloodBagRequest req = bloodBagRequestService.releaseRequest(id, currentUser);
            return ResponseEntity.ok(Map.of(
                    "message",         "Request marked as released.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // Any non-RELEASED → CANCELLED
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
    @PutMapping("/blood-requests/{id}/cancel")
    public ResponseEntity<?> cancelRequest(@PathVariable Long id) {
        try {
            BloodBagRequest req = bloodBagRequestService.cancelRequest(id);
            return ResponseEntity.ok(Map.of(
                    "message",         "Request cancelled.",
                    "referenceNumber", req.getReferenceNumber(),
                    "status",          req.getStatus()
            ));
        } catch (IllegalStateException | IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
                req.getLastName()  == null || req.getLastName().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email, first name, and last name are required."));
            }
            StaffResponse created = staffService.createStaff(req);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
                req.getLastName()  == null || req.getLastName().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "First name and last name are required."));
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
}