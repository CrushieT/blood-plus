package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.ApproveRequestDTO;
import com.hospital.blood_plus.dto.request.BloodBagRequestDTO;
import com.hospital.blood_plus.dto.request.EmailConfirmationRequest;
import com.hospital.blood_plus.dto.response.AdminBloodRequestListItemDTO;
import com.hospital.blood_plus.dto.response.BloodBagAvailableDTO;
import com.hospital.blood_plus.dto.response.PaginatedResponse;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.BloodBagRequest.RequestStatus;
import com.hospital.blood_plus.model.HospitalProfile;
import com.hospital.blood_plus.model.RequestFulfillment;
import com.hospital.blood_plus.model.StaffProfile;
import com.hospital.blood_plus.repository.BloodBagRepository;
import com.hospital.blood_plus.repository.BloodBagRequestRepository;
import com.hospital.blood_plus.repository.RequestFulfillmentRepository;
import com.hospital.blood_plus.repository.StaffProfileRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class BloodBagRequestService {

    private final BloodBagRequestRepository     repository;
    private final CloudinaryService             cloudinaryService;
    private final BloodBagRepository            bloodBagRepository;
    private final BloodBagService               bloodBagService;
    private final RequestFulfillmentRepository        requestFulfillmentRepository;
    private final EmailService                  emailService;
    private final RequestStatusLogService       requestStatusLogService;
    private final StaffProfileRepository        staffProfileRepository;

    public BloodBagRequestService(BloodBagRequestRepository repository,
                                  CloudinaryService cloudinaryService,
                                  BloodBagRepository bloodBagRepository,
                                  BloodBagService bloodBagService,
                                  RequestFulfillmentRepository requestFulfillmentRepository,
                                  EmailService emailService,
                                  RequestStatusLogService requestStatusLogService,
                                  StaffProfileRepository staffProfileRepository) {
        this.repository          = repository;
        this.cloudinaryService   = cloudinaryService;
        this.bloodBagRepository  = bloodBagRepository;
        this.bloodBagService     = bloodBagService;
        this.requestFulfillmentRepository  = requestFulfillmentRepository;
        this.emailService  = emailService;
        this.requestStatusLogService = requestStatusLogService;
        this.staffProfileRepository = staffProfileRepository;
    }

    // ─────────────────────────────────────────────
    // SUBMIT ANONYMOUS REQUEST
    // ─────────────────────────────────────────────

    public BloodBagRequest submitAnonymousRequest(BloodBagRequestDTO dto,
                                                  MultipartFile doctorsNote) throws IOException {
        StaffProfile authorizedStaff = validate(dto, doctorsNote);
 
        BloodBagRequest request = new BloodBagRequest();
 
        // ─────────────────────────────────────────────
        // UPLOAD DOCTOR'S NOTE
        // ─────────────────────────────────────────────
        if (doctorsNote != null && !doctorsNote.isEmpty()) {
            String[] cloudResult = cloudinaryService.uploadDoctorsNote(doctorsNote);
            request.setDoctorsNoteUrl(cloudResult[0]);
            request.setDoctorsNoteKey(cloudResult[1]);
        }
 
        // ─────────────────────────────────────────────
        // PATIENT INFORMATION (EXISTING)
        // ─────────────────────────────────────────────
        request.setPatientName(dto.getPatientName().trim());
        request.setPatientMiddle(dto.getPatientMiddle().trim());
        request.setPatientLast(dto.getPatientLast().trim());
        request.setPatientSuffix(dto.getPatientSuffix().trim());
        request.setPatientBirthdate(dto.getPatientBirthdate());
        request.setPatientAge(dto.getPatientAge()); 
        request.setPatientSex(dto.getPatientSex());
        request.setWardRoom(resolveRequiredStaffDepartment(authorizedStaff));
        request.setRoomNo(normalizeOptionalText(dto.getRoomNo()));
        request.setPatientPurok(normalizeOptionalText(dto.getPatientPurok()));
        request.setPatientBarangay(normalizeOptionalText(dto.getPatientBarangay()));
        request.setPatientMunicipality(normalizeOptionalText(dto.getPatientMunicipality()));
        request.setPatientProvince(normalizeOptionalText(dto.getPatientProvince()));
        request.setRequestingPhysician(dto.getRequestingPhysician().trim());
 
        request.setAgeGroup(dto.getAgeGroup() != null
                ? dto.getAgeGroup()
                : BloodBagRequest.AgeGroup.ADULT);
        request.setRequestCategory(dto.getRequestCategory() != null
                ? dto.getRequestCategory()
                : BloodBagRequest.RequestCategory.INPATIENT);
 
        // ─────────────────────────────────────────────
        // BLOOD DETAILS (EXISTING)
        // ─────────────────────────────────────────────
        request.setBloodType(dto.getBloodType());
        request.setBloodComponent(dto.getBloodComponent());
        request.setNumberOfUnits(dto.getNumberOfUnits());
        request.setPlateletCount(dto.getBloodComponent() == BloodBag.ComponentType.PLATELET_CONCENTRATE
                ? dto.getPlateletCount()
                : null);
 
        // ─────────────────────────────────────────────
        // URGENCY & DATES (EXISTING)
        // ─────────────────────────────────────────────
        request.setUrgencyLevel(dto.getUrgencyLevel());
        request.setRequiredBy(dto.getRequiredBy());
 
        // ─────────────────────────────────────────────
        // CONTACT / REQUESTER (EXISTING)
        // ─────────────────────────────────────────────
        request.setRequesterName(dto.getRequesterName().trim());
        request.setRequesterRelationship(dto.getRequesterRelationship());
        request.setRequesterContact(dto.getRequesterContact().trim());
        request.setRequesterEmail(normalizeOptionalEmail(dto.getRequesterEmail()));
 
        // ─────────────────────────────────────────────
        // NOTES (EXISTING)
        // ─────────────────────────────────────────────
        request.setNotes(dto.getNotes());
 
        // ═════════════════════════════════════════════════════════════
        // NEW FIELDS — FROM PDF FORMS
        // ═════════════════════════════════════════════════════════════
 
        // ─────────────────────────────────────────────
        // CLINICAL INFORMATION
        // ─────────────────────────────────────────────
        request.setClinicalImpression(dto.getClinicalImpression());
        request.setAttendingPhysician(dto.getAttendingPhysician());
        request.setContactNumber(dto.getContactNumber());
        request.setHemoglobin(dto.getHemoglobin());
        request.setHematocrit(dto.getHematocrit());
        request.setRequestType(dto.getRequestType() != null 
                ? dto.getRequestType()
                : BloodBagRequest.RequestType.ROUTINE);
 
        // ─────────────────────────────────────────────
        // TRANSFUSION HISTORY (STRUCTURED)
        // ─────────────────────────────────────────────
        request.setHadPreviousTransfusion(dto.getHadPreviousTransfusion());
        request.setPreviousTransfusionDate(dto.getPreviousTransfusionDate());
        request.setPreviousTransfusionUnits(dto.getPreviousTransfusionUnits());
 
        // ─────────────────────────────────────────────
        // REACTION HISTORY (STRUCTURED)
        // ─────────────────────────────────────────────
        request.setHadPreviousReaction(dto.getHadPreviousReaction());
        request.setPreviousReactionDate(dto.getPreviousReactionDate());
 
        // ─────────────────────────────────────────────
        // INDICATIONS FOR TRANSFUSION
        // ─────────────────────────────────────────────
        request.setIndication(dto.getIndication());
        request.setIndicationOtherSpecify(dto.getIndicationOtherSpecify());
 
        // ─────────────────────────────────────────────
        // REQUEST LIFECYCLE
        // ─────────────────────────────────────────────
        request.setRequesterType(BloodBagRequest.RequesterType.ANONYMOUS);
        request.setStatus(RequestStatus.PENDING);
        request.setReferenceNumber(generateReferenceNumber(request.getRequestCategory()));
 
        BloodBagRequest savedRequest = repository.save(request);

        // Send confirmation email only when an email address is present
        if (hasRequesterEmail(savedRequest)) {
            try {
                emailService.sendRequestConfirmationEmail(
                    savedRequest.getRequesterEmail(),
                    savedRequest.getRequesterName(),
                    savedRequest.getReferenceNumber(),
                    savedRequest.getBloodType().getDisplayName(),
                    savedRequest.getNumberOfUnits()
                );
            } catch (Exception e) {
                System.err.println("[BloodBagRequest] Failed to send confirmation email: " + e.getMessage());
                // Don't fail the request if email fails
            }
        }

        return savedRequest;
    }

    // ─────────────────────────────────────────────
    // FETCH
    // ─────────────────────────────────────────────

    public List<BloodBagRequest> getAllRequests() {
        return repository.findAllByOrderByRequestedAtDesc();
    }

    public PaginatedResponse<AdminBloodRequestListItemDTO> getAdminRequestList(
            int page,
            int size,
            BloodBagRequest.RequestStatus status,
            BloodBag.BloodType bloodType,
            BloodBag.ComponentType componentType,
            BloodBagRequest.RequestCategory requestCategory,
            String search,
            LocalDateTime dateFrom,
            LocalDateTime dateTo
    ) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 200);
        String normalizedSearch = (search == null || search.trim().isEmpty()) ? null : search.trim();

        Pageable pageable = PageRequest.of(
                safePage - 1,
                safeSize,
                Sort.by(Sort.Direction.DESC, "requestedAt")
        );

        Page<BloodBagRequest> pageData = repository.findForAdminList(
                status,
                bloodType,
                componentType,
                requestCategory,
                normalizedSearch,
                dateFrom,
                dateTo,
                pageable
        );

        List<AdminBloodRequestListItemDTO> rows = pageData.getContent().stream()
                .map(this::toAdminListItem)
                .toList();

        return new PaginatedResponse<>(
                rows,
                pageData.getNumber() + 1,
                Math.max(pageData.getTotalPages(), 1),
                pageData.getTotalElements(),
                pageData.getSize()
        );
    }

    public Map<String, Long> getAdminRequestStatusCounts(
            String search,
            BloodBag.BloodType bloodType,
            BloodBag.ComponentType componentType,
            BloodBagRequest.RequestCategory requestCategory,
            LocalDateTime dateFrom,
            LocalDateTime dateTo
    ) {
        String normalizedSearch = (search == null || search.trim().isEmpty()) ? null : search.trim();
        EnumMap<RequestStatus, Long> statusCounts = new EnumMap<>(RequestStatus.class);
        for (RequestStatus status : RequestStatus.values()) {
            statusCounts.put(status, 0L);
        }

        long allCount = 0L;
        List<BloodBagRequestRepository.StatusCountRow> rows =
                repository.countForAdminStatusSummary(normalizedSearch, bloodType, componentType, requestCategory, dateFrom, dateTo);
        for (BloodBagRequestRepository.StatusCountRow row : rows) {
            if (row == null || row.getStatus() == null) continue;
            long count = row.getTotal();
            statusCounts.put(row.getStatus(), count);
            allCount += count;
        }

        Map<String, Long> response = new LinkedHashMap<>();
        response.put("ALL", allCount);
        response.put("PENDING", statusCounts.getOrDefault(RequestStatus.PENDING, 0L));
        response.put("NEEDS_CONFIRMATION", statusCounts.getOrDefault(RequestStatus.NEEDS_CONFIRMATION, 0L));
        response.put("APPROVED", statusCounts.getOrDefault(RequestStatus.APPROVED, 0L));
        response.put("ALLOCATED", statusCounts.getOrDefault(RequestStatus.ALLOCATED, 0L));
        response.put("READY_FOR_RELEASE", statusCounts.getOrDefault(RequestStatus.READY_FOR_RELEASE, 0L));
        response.put("RELEASED", statusCounts.getOrDefault(RequestStatus.RELEASED, 0L));
        response.put("REJECTED", statusCounts.getOrDefault(RequestStatus.REJECTED, 0L));
        response.put("CANCELLED", statusCounts.getOrDefault(RequestStatus.CANCELLED, 0L));
        return response;
    }

    public List<BloodBagRequest> getByStatus(BloodBagRequest.RequestStatus status) {
        return repository.findByStatus(status);
    }

    public BloodBagRequest getByReferenceNumber(String refNum) {
        return repository.findByReferenceNumber(refNum)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No request found for reference number: " + refNum));
    }

    

    // ─────────────────────────────────────────────
    // WORKFLOW ACTIONS
    // ─────────────────────────────────────────────

    /** PENDING → APPROVED  (simple approval, no bag selection here) */
    public BloodBagRequest approveRequest(Long id, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.PENDING);
        int requestedUnits = getRequestedUnits(req);
        int availableCompatibleBags = countCompatibleAvailableBags(req);
        if (availableCompatibleBags < requestedUnits) {
            throw new IllegalStateException(
                "Not enough available bags for full approval. Available compatible bags: "
                    + availableCompatibleBags
                    + ". Use Approve with Remarks to offer partial fulfillment."
            );
        }
        req.setStatus(BloodBagRequest.RequestStatus.APPROVED);
        applyReview(req, reviewer);
        BloodBagRequest savedReq = repository.save(req);
        
        // Send approval email only when an email address is present
        if (hasRequesterEmail(savedReq)) {
            try {
                emailService.sendRequestApprovalEmail(
                    savedReq.getRequesterEmail(),
                    savedReq.getRequesterName(),
                    savedReq.getReferenceNumber(),
                    savedReq.getBloodType().getDisplayName(),
                    requestedUnits
                );
            } catch (Exception e) {
                System.err.println("[BloodBagRequest] Failed to send approval email: " + e.getMessage());
            }
        }
        
        return savedReq;
    }

    /** PENDING → REJECTED */
    @Transactional
    public BloodBagRequest approveRequestWithRemarks(Long id, ApproveRequestDTO dto, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.PENDING);

        String requesterEmail = normalizeOptionalEmail(req.getRequesterEmail());
        if (requesterEmail == null) {
            throw new IllegalArgumentException("Requester email is required before approval confirmation can be sent.");
        }
        if (dto == null) {
            throw new IllegalArgumentException("Approval details are required.");
        }

        String approvalRemarks = normalizeRequiredText(dto.getApprovalRemarks(), "Approval remarks are required.");
        Integer approvedUnits = dto.getApprovedUnits();
        if (approvedUnits == null || approvedUnits <= 0) {
            throw new IllegalArgumentException("Approved units must be greater than 0.");
        }
        if (req.getNumberOfUnits() == null || approvedUnits > req.getNumberOfUnits()) {
            throw new IllegalArgumentException("Approved units cannot be greater than the originally requested units.");
        }

        BloodBagRequest.RequestStatus oldStatus = req.getStatus();
        req.setRequesterEmail(requesterEmail);
        req.setApprovedUnits(approvedUnits);
        req.setApprovalRemarks(approvalRemarks);
        req.setAlternativeComponentSuggestion(normalizeOptionalText(dto.getAlternativeComponentSuggestion()));
        req.setPatientAcceptedRemarks(null);
        req.setPatientRespondedAt(null);
        req.setConfirmationToken(generateConfirmationToken());
        req.setConfirmationTokenExpiresAt(LocalDateTime.now().plusHours(24));
        req.setConfirmationEmailSentAt(LocalDateTime.now());
        req.setStatus(BloodBagRequest.RequestStatus.NEEDS_CONFIRMATION);
        applyReview(req, reviewer);

        BloodBagRequest savedReq = repository.save(req);
        requestStatusLogService.logStatusChange(
            savedReq,
            oldStatus,
            BloodBagRequest.RequestStatus.NEEDS_CONFIRMATION,
            reviewer,
            approvalRemarks
        );
        emailService.sendApprovalRemarksConfirmationEmail(savedReq);
        return savedReq;
    }

    @Transactional
    public BloodBagRequest confirmApprovalRemarksByToken(EmailConfirmationRequest dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Confirmation payload is required.");
        }

        String token = normalizeRequiredText(dto.getToken(), "Confirmation token is required.");
        if (dto.getAccepted() == null) {
            throw new IllegalArgumentException("Accepted flag is required.");
        }

        BloodBagRequest req = repository.findByConfirmationToken(token)
            .orElseThrow(() -> new IllegalArgumentException(
                "This confirmation link is invalid or has already been used."
            ));

        if (req.getStatus() != BloodBagRequest.RequestStatus.NEEDS_CONFIRMATION) {
            throw new IllegalStateException("This confirmation link is no longer active.");
        }
        if (req.getConfirmationTokenExpiresAt() == null
                || LocalDateTime.now().isAfter(req.getConfirmationTokenExpiresAt())) {
            throw new IllegalStateException(
                "This confirmation link is invalid or expired. Please contact the blood bank."
            );
        }

        BloodBagRequest.RequestStatus oldStatus = req.getStatus();
        req.setPatientRespondedAt(LocalDateTime.now());

        if (Boolean.TRUE.equals(dto.getAccepted())) {
            req.setPatientAcceptedRemarks(true);
            req.setStatus(BloodBagRequest.RequestStatus.APPROVED);
            clearConfirmationToken(req);

            BloodBagRequest savedReq = repository.save(req);
            requestStatusLogService.logStatusChange(
                savedReq,
                oldStatus,
                BloodBagRequest.RequestStatus.APPROVED,
                null,
                "Requester accepted approval remarks via email."
            );
            return savedReq;
        }

        req.setPatientAcceptedRemarks(false);
        req.setStatus(BloodBagRequest.RequestStatus.REJECTED);
        clearConfirmationToken(req);

        BloodBagRequest savedReq = repository.save(req);
        requestStatusLogService.logStatusChange(
            savedReq,
            oldStatus,
            BloodBagRequest.RequestStatus.REJECTED,
            null,
            "Requester rejected approval remarks via email."
        );
        return savedReq;
    }

    public BloodBagRequest rejectRequest(Long id, String reason, AppUser reviewer) {
        BloodBagRequest req = findById(id);
        if (req.getStatus() == BloodBagRequest.RequestStatus.RELEASED) {
            throw new IllegalStateException("Released requests cannot be rejected.");
        }
        if (req.getStatus() == BloodBagRequest.RequestStatus.REJECTED
                || req.getStatus() == BloodBagRequest.RequestStatus.CANCELLED) {
            throw new IllegalStateException("Request is already closed with status " + req.getStatus() + ".");
        }
        if (req.getStatus() == BloodBagRequest.RequestStatus.ALLOCATED
                || req.getStatus() == BloodBagRequest.RequestStatus.READY_FOR_RELEASE) {
            releaseAllocatedBags(req);
        }
        req.setStatus(BloodBagRequest.RequestStatus.REJECTED);
        req.setRejectionReason(reason);
        clearConfirmationToken(req);
        clearAllocatedBagSelection(req);
        applyReview(req, reviewer);
        BloodBagRequest savedReq = repository.save(req);
        String notificationEmail = getRequesterNotificationEmail(savedReq);
        if (notificationEmail != null) {
            try {
                emailService.sendRequestClosedEmail(
                        notificationEmail,
                        savedReq.getRequesterName(),
                        savedReq.getReferenceNumber(),
                        "REJECTED",
                        reason
                );
            } catch (Exception e) {
                System.err.println("[BloodBagRequest] Failed to send rejected email: " + e.getMessage());
            }
        }
        return populateReservedBags(savedReq);
    }

    /** APPROVED → ALLOCATED  (selects blood bags) */
    public BloodBagRequest allocateRequest(Long id, List<Long> bagIds, AppUser reviewer) {
        BloodBagRequest req = findById(id);
        if (req.getStatus() == BloodBagRequest.RequestStatus.NEEDS_CONFIRMATION) {
            throw new IllegalStateException(
                "Request is still waiting for requester confirmation."
            );
        }
        if (req.getStatus() != BloodBagRequest.RequestStatus.APPROVED) {
            throw new IllegalStateException(
                "Request is not approved for allocation. Current status: " + req.getStatus() + "."
            );
        }
        return reserveBags(req, bagIds, reviewer);
    }

    /** ALLOCATED / READY_FOR_RELEASE → swap bags, keep ALLOCATED status */
    public BloodBagRequest reallocateRequest(Long id, List<Long> bagIds, AppUser reviewer) {
        BloodBagRequest req = findById(id);
        if (req.getStatus() != BloodBagRequest.RequestStatus.ALLOCATED
                && req.getStatus() != BloodBagRequest.RequestStatus.READY_FOR_RELEASE) {
            throw new IllegalStateException(
                    "Can only change bag selection on ALLOCATED or READY_FOR_RELEASE requests.");
        }

        releaseAllocatedBags(req);

        return reserveBags(req, bagIds, reviewer);
    }

    /** ALLOCATED → READY_FOR_RELEASE */
    public BloodBagRequest markReadyRequest(Long id, AppUser reviewer) {
        BloodBagRequest req = updateStatus(id,
                BloodBagRequest.RequestStatus.ALLOCATED,
                BloodBagRequest.RequestStatus.READY_FOR_RELEASE,
                reviewer);
        
        // Send ready notification email only when an email address is present
        if (hasRequesterEmail(req)) {
            try {
                emailService.sendRequestReadyEmail(
                    req.getRequesterEmail(),
                    req.getRequesterName(),
                    req.getReferenceNumber(),
                    req.getBloodType().getDisplayName(),
                    getEffectiveUnits(req)
                );
            } catch (Exception e) {
                System.err.println("[BloodBagRequest] Failed to send ready email: " + e.getMessage());
            }
        }
        
        return req;
    }

    /** READY_FOR_RELEASE → RELEASED  (marks bag as DISPENSED) */
    @Transactional
    public BloodBagRequest releaseRequest(Long id, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.READY_FOR_RELEASE);
        req.setStatus(BloodBagRequest.RequestStatus.RELEASED);
        applyReview(req, reviewer);

        List<BloodBag> allocatedBags = loadAllocatedBags(req);
        if (!allocatedBags.isEmpty()) {
            for (BloodBag bag : allocatedBags) {
                bag.setStatus(BloodBag.BagStatus.DISPENSED);

                String notes = String.format(
                    "Blood request released. Bag Serial Number: %s, Blood Type: %s, Component: %s, Units: %d",
                    bag.getSerialNumber(),
                    bag.getBloodType().getDisplayName(),
                    bag.getComponentType(),
                    getEffectiveUnits(req)
                );

                RequestFulfillment fulfillment = new RequestFulfillment();
                fulfillment.setRequest(req);
                fulfillment.setBloodBag(bag);
                fulfillment.setFulfilledBy(reviewer);
                fulfillment.setNotes(notes);
                requestFulfillmentRepository.save(fulfillment);
            }

            bloodBagRepository.saveAll(allocatedBags);
            req.setReservedBags(allocatedBags);
        }

        BloodBagRequest savedReq = repository.save(req);
        return populateReservedBags(savedReq);
    }

    /** Any non-RELEASED → CANCELLED */
    public BloodBagRequest cancelRequest(Long id, String reason, AppUser reviewer) {
        BloodBagRequest req = findById(id);
        if (req.getStatus() == BloodBagRequest.RequestStatus.RELEASED) {
            throw new IllegalStateException("Released requests cannot be cancelled.");
        }
        if (req.getStatus() == BloodBagRequest.RequestStatus.REJECTED
                || req.getStatus() == BloodBagRequest.RequestStatus.CANCELLED) {
            throw new IllegalStateException("Request is already closed with status " + req.getStatus() + ".");
        }
        if (req.getStatus() == BloodBagRequest.RequestStatus.ALLOCATED
                || req.getStatus() == BloodBagRequest.RequestStatus.READY_FOR_RELEASE) {
            releaseAllocatedBags(req);
        }
        req.setStatus(BloodBagRequest.RequestStatus.CANCELLED);
        req.setRejectionReason(reason);
        clearConfirmationToken(req);
        clearAllocatedBagSelection(req);
        applyReview(req, reviewer);
        BloodBagRequest savedReq = repository.save(req);
        String notificationEmail = getRequesterNotificationEmail(savedReq);
        if (notificationEmail != null) {
            try {
                emailService.sendRequestClosedEmail(
                        notificationEmail,
                        savedReq.getRequesterName(),
                        savedReq.getReferenceNumber(),
                        "CANCELLED",
                        reason
                );
            } catch (Exception e) {
                System.err.println("[BloodBagRequest] Failed to send cancelled email: " + e.getMessage());
            }
        }
        return populateReservedBags(savedReq);
    }

    // ─────────────────────────────────────────────
    // INTERNAL
    // ─────────────────────────────────────────────

    /** Validate bags, mark CROSSMATCHED, link to request, set ALLOCATED */
    private BloodBagRequest reserveBags(BloodBagRequest req, List<Long> bagIds, AppUser reviewer) {
        if (bagIds == null || bagIds.isEmpty()) {
            throw new IllegalArgumentException("At least one blood bag must be selected.");
        }
        int requiredUnits = getRequiredUnitsForAllocation(req);
        if (bagIds.size() != requiredUnits) {
            throw new IllegalArgumentException(
                    "Expected " + requiredUnits + " bag(s), got " + bagIds.size() + ".");
        }

        List<BloodBag> bags = bloodBagRepository.findAllById(bagIds);
        if (bags.size() != bagIds.size()) {
            throw new IllegalArgumentException("One or more selected bags were not found.");
        }
        for (BloodBag bag : bags) {
            if (bag.getStatus() != BloodBag.BagStatus.AVAILABLE) {
                throw new IllegalStateException(
                        "Bag " + bag.getSerialNumber() + " is no longer available (status: " + bag.getStatus() + ").");
            }
            bag.setStatus(BloodBag.BagStatus.CROSSMATCHED);
        }
        bloodBagRepository.saveAll(bags);

        req.setStatus(BloodBagRequest.RequestStatus.ALLOCATED);
        req.setFulfilledByBag(bags.get(0));
        req.setAllocatedBagIds(serializeAllocatedBagIds(bags));
        req.setReservedBags(new ArrayList<>(bags));
        applyReview(req, reviewer);
        BloodBagRequest savedReq = repository.save(req);
        savedReq.setReservedBags(new ArrayList<>(bags));
        return savedReq;
    }

    private BloodBagRequest updateStatus(Long id,
                                         BloodBagRequest.RequestStatus expected,
                                         BloodBagRequest.RequestStatus next,
                                         AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, expected);
        req.setStatus(next);
        applyReview(req, reviewer);
        return repository.save(req);
    }

    private BloodBagRequest ensureStatus(Long id, BloodBagRequest.RequestStatus expected) {
        BloodBagRequest req = findById(id);
        if (req.getStatus() != expected) {
            throw new IllegalStateException(
                    "Expected status " + expected + " but was " + req.getStatus() + ".");
        }
        return req;
    }

    private void applyReview(BloodBagRequest req, AppUser reviewer) {
        req.setReviewedBy(reviewer);
        req.setReviewedAt(LocalDateTime.now());
    }

    public BloodBagRequest findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Request not found: " + id));
    }



    public BloodBagRequest submitHospitalRequest(BloodBagRequestDTO dto,
                                                MultipartFile doctorsNote,
                                                AppUser requestingUser,
                                                HospitalProfile hospital) throws IOException {
        
        validateHospitalRequest(dto, doctorsNote);
    
        BloodBagRequest request = new BloodBagRequest();
    
        // ─────────────────────────────────────────────────────────────
        // UPLOAD DOCTORS NOTE (If provided)
        // ─────────────────────────────────────────────────────────────
        
        if (doctorsNote != null && !doctorsNote.isEmpty()) {
            String[] cloudResult = cloudinaryService.uploadDoctorsNote(doctorsNote);
            request.setDoctorsNoteUrl(cloudResult[0]);
            request.setDoctorsNoteKey(cloudResult[1]);
        }
    
        // ─────────────────────────────────────────────────────────────
        // CORE PATIENT INFORMATION
        // ─────────────────────────────────────────────────────────────
        
        request.setPatientName(dto.getPatientName().trim());
        request.setPatientMiddle(dto.getPatientMiddle().trim());
        request.setPatientLast(dto.getPatientLast().trim());
        request.setPatientSuffix(dto.getPatientSuffix().trim());
        request.setPatientAge(dto.getPatientAge());
        request.setPatientBirthdate(dto.getPatientBirthdate());
        request.setPatientSex(dto.getPatientSex());
        request.setWardRoom(normalizeOptionalText(dto.getWardRoom()));
        request.setRoomNo(normalizeOptionalText(dto.getRoomNo()));
        request.setPatientPurok(normalizeOptionalText(dto.getPatientPurok()));
        request.setPatientBarangay(normalizeOptionalText(dto.getPatientBarangay()));
        request.setPatientMunicipality(normalizeOptionalText(dto.getPatientMunicipality()));
        request.setPatientProvince(normalizeOptionalText(dto.getPatientProvince()));
        request.setRequestingPhysician(dto.getRequestingPhysician().trim());
    
        // ─────────────────────────────────────────────────────────────
        // PATIENT TYPE & CATEGORY
        // ─────────────────────────────────────────────────────────────
        
        request.setAgeGroup(dto.getAgeGroup() != null
                ? dto.getAgeGroup()
                : BloodBagRequest.AgeGroup.ADULT);
        request.setRequestCategory(dto.getRequestCategory() != null
                ? dto.getRequestCategory()
                : BloodBagRequest.RequestCategory.INPATIENT);
    
        // ─────────────────────────────────────────────────────────────
        // BLOOD REQUEST DETAILS
        // ─────────────────────────────────────────────────────────────
        
        request.setBloodType(dto.getBloodType());
        request.setBloodComponent(dto.getBloodComponent());
        request.setNumberOfUnits(dto.getNumberOfUnits());
        request.setPlateletCount(dto.getBloodComponent() == BloodBag.ComponentType.PLATELET_CONCENTRATE
                ? dto.getPlateletCount()
                : null);
        request.setUrgencyLevel(dto.getUrgencyLevel());
        request.setRequiredBy(dto.getRequiredBy());
        request.setNotes(dto.getNotes() != null ? dto.getNotes() : "");
    
        // ─────────────────────────────────────────────────────────────
        // NEW CLINICAL DATA FIELDS (Step 3 - Optional)
        // ─────────────────────────────────────────────────────────────
        
        if (dto.getClinicalImpression() != null) {
            request.setClinicalImpression(dto.getClinicalImpression().trim());
        }
        if (dto.getAttendingPhysician() != null) {
            request.setAttendingPhysician(dto.getAttendingPhysician().trim());
        }
        if (dto.getContactNumber() != null) {
            request.setContactNumber(dto.getContactNumber().trim());
        }
        if (dto.getHemoglobin() != null) {
            request.setHemoglobin(dto.getHemoglobin());
        }
        if (dto.getHematocrit() != null) {
            request.setHematocrit(dto.getHematocrit());
        }
        if (dto.getRequestType() != null) {
            request.setRequestType(dto.getRequestType());
        }
    
        // ─────────────────────────────────────────────────────────────
        // TRANSFUSION HISTORY (Step 3 - Optional)
        // ─────────────────────────────────────────────────────────────
        
        if (dto.getHadPreviousTransfusion() != null) {
            request.setHadPreviousTransfusion(dto.getHadPreviousTransfusion());
            
            if (dto.getHadPreviousTransfusion() && dto.getPreviousTransfusionDate() != null) {
                request.setPreviousTransfusionDate(dto.getPreviousTransfusionDate());
            }
            
            if (dto.getHadPreviousTransfusion() && dto.getPreviousTransfusionUnits() != null) {
                request.setPreviousTransfusionUnits(dto.getPreviousTransfusionUnits());
            }
        }
    
        // ─────────────────────────────────────────────────────────────
        // REACTION HISTORY (Step 3 - Optional)
        // ─────────────────────────────────────────────────────────────
        
        if (dto.getHadPreviousReaction() != null) {
            request.setHadPreviousReaction(dto.getHadPreviousReaction());
            
            if (dto.getHadPreviousReaction() && dto.getPreviousReactionDate() != null) {
                request.setPreviousReactionDate(dto.getPreviousReactionDate());
            }
            
            // NEW: Set reaction details if provided
            if (dto.getHadPreviousReaction() && dto.getPreviousReactionDetails() != null) {
                request.setPreviousReactionDetails(dto.getPreviousReactionDetails().trim());
            }
        }
    
        // ─────────────────────────────────────────────────────────────
        // INDICATIONS FOR TRANSFUSION (Step 4 - Required)
        // ─────────────────────────────────────────────────────────────
        
        if (dto.getIndication() != null && !dto.getIndication().isBlank()) {
            request.setIndication(dto.getIndication());
        }
        
        request.setIndicationOtherSpecify(dto.getIndicationOtherSpecify());
        
        request.setHospitalProfile(hospital);
        // ─────────────────────────────────────────────────────────────
        // HOSPITAL CONTEXT
        // ─────────────────────────────────────────────────────────────
        
        request.setHospitalProfile(hospital);
        request.setRequestedBy(requestingUser);
    
        // ─────────────────────────────────────────────────────────────
        // REQUESTER INFORMATION (From hospital account)
        // ─────────────────────────────────────────────────────────────
        
        request.setRequesterName(hospital.getContactPersonName() != null
                ? hospital.getContactPersonName()
                : "Hospital Account");
        request.setRequesterRelationship("Hospital");
        request.setRequesterContact(hospital.getPhoneNumber());
        request.setRequesterEmail(requestingUser.getEmail());
    
        // ─────────────────────────────────────────────────────────────
        // REQUEST METADATA
        // ─────────────────────────────────────────────────────────────
        
        request.setRequesterType(BloodBagRequest.RequesterType.HOSPITAL);
        request.setStatus(BloodBagRequest.RequestStatus.PENDING);
        request.setReferenceNumber(generateReferenceNumber(request.getRequestCategory()));

        BloodBagRequest savedRequest = repository.save(request);

        if (hasRequesterEmail(savedRequest)) {
            try {
                emailService.sendRequestConfirmationEmail(
                    savedRequest.getRequesterEmail(),
                    savedRequest.getRequesterName(),
                    savedRequest.getReferenceNumber(),
                    savedRequest.getBloodType().getDisplayName(),
                    savedRequest.getNumberOfUnits()
                );
            } catch (Exception e) {
                System.err.println("[BloodBagRequest] Failed to send hospital confirmation email: " + e.getMessage());
            }
        }

        return savedRequest;
    }
    
    /**
     * Updated validation - now validates indication as required
     */
    private void validateHospitalRequest(BloodBagRequestDTO dto, MultipartFile file) {
        if (dto.getPatientName() == null || dto.getPatientName().isBlank())
            throw new IllegalArgumentException("Patient name is required.");
        if (dto.getPatientAge() == null)
            throw new IllegalArgumentException("Patient age is required.");
        if (dto.getPatientSex() == null || dto.getPatientSex().isBlank())
            throw new IllegalArgumentException("Patient sex is required.");
        if (dto.getRequestingPhysician() == null || dto.getRequestingPhysician().isBlank())
            throw new IllegalArgumentException("Requesting physician is required.");
        if (dto.getBloodType() == null)
            throw new IllegalArgumentException("Blood type is required.");
        if (dto.getBloodComponent() == null)
            throw new IllegalArgumentException("Blood component is required.");
        if (dto.getNumberOfUnits() == null || dto.getNumberOfUnits() < 1)
            throw new IllegalArgumentException("Number of units is required (minimum 1).");
        if (dto.getPlateletCount() != null && dto.getPlateletCount() < 0)
            throw new IllegalArgumentException("Platelet count cannot be negative.");
        if (dto.getUrgencyLevel() == null)
            throw new IllegalArgumentException("Urgency level is required.");
        
        // NEW: Validate indication is provided
        if (dto.getIndication() == null || dto.getIndication().isBlank())
            throw new IllegalArgumentException("At least one indication for transfusion is required.");
        
        // NEW: Validate doctors note is provided
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Doctor's Blood Request Form is required.");
        String contentType = file.getContentType();
        if (!"image/jpeg".equalsIgnoreCase(contentType) && !"image/png".equalsIgnoreCase(contentType))
            throw new IllegalArgumentException("Only JPG or PNG images are allowed for hospital request uploads.");
    }
    // ─────────────────────────────────────────────
    // GET REQUESTS BY HOSPITAL
    // ─────────────────────────────────────────────
 
    public List<BloodBagRequest> getByHospital(HospitalProfile hospital) {
        return repository.findByHospitalProfile(hospital);
    }

    public PaginatedResponse<BloodBagRequest> getByHospitalPaged(
            HospitalProfile hospital,
            int page,
            int size,
            BloodBagRequest.RequestStatus status,
            BloodBag.BloodType bloodType,
            BloodBag.ComponentType componentType,
            BloodBagRequest.UrgencyLevel urgencyLevel,
            String search,
            LocalDateTime dateFrom,
            LocalDateTime dateTo,
            String sort) {
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(size, 1), 200);
        String normalizedSearch = (search == null || search.trim().isEmpty()) ? null : search.trim();

        Pageable pageable = PageRequest.of(
                safePage - 1,
                safeSize,
                resolveHospitalRequestSort(sort)
        );

        Page<BloodBagRequest> pageData = repository.findForHospitalList(
                hospital,
                status,
                bloodType,
                componentType,
                urgencyLevel,
                normalizedSearch,
                dateFrom,
                dateTo,
                pageable
        );

        List<BloodBagRequest> rows = populateReservedBags(pageData.getContent());
        return new PaginatedResponse<>(
                rows,
                pageData.getNumber() + 1,
                Math.max(pageData.getTotalPages(), 1),
                pageData.getTotalElements(),
                pageData.getSize()
        );
    }

    public Map<String, Long> getHospitalRequestStatusCounts(
            HospitalProfile hospital,
            String search,
            BloodBag.BloodType bloodType,
            BloodBag.ComponentType componentType,
            BloodBagRequest.UrgencyLevel urgencyLevel,
            LocalDateTime dateFrom,
            LocalDateTime dateTo
    ) {
        String normalizedSearch = (search == null || search.trim().isEmpty()) ? null : search.trim();
        EnumMap<RequestStatus, Long> statusCounts = new EnumMap<>(RequestStatus.class);
        for (RequestStatus requestStatus : RequestStatus.values()) {
            statusCounts.put(requestStatus, 0L);
        }

        long allCount = 0L;
        List<BloodBagRequestRepository.StatusCountRow> rows =
                repository.countForHospitalStatusSummary(
                        hospital,
                        normalizedSearch,
                        bloodType,
                        componentType,
                        urgencyLevel,
                        dateFrom,
                        dateTo
                );
        for (BloodBagRequestRepository.StatusCountRow row : rows) {
            if (row == null || row.getStatus() == null) continue;
            long count = row.getTotal();
            statusCounts.put(row.getStatus(), count);
            allCount += count;
        }

        Map<String, Long> response = new LinkedHashMap<>();
        response.put("ALL", allCount);
        response.put("PENDING", statusCounts.getOrDefault(RequestStatus.PENDING, 0L));
        response.put("NEEDS_CONFIRMATION", statusCounts.getOrDefault(RequestStatus.NEEDS_CONFIRMATION, 0L));
        response.put("APPROVED", statusCounts.getOrDefault(RequestStatus.APPROVED, 0L));
        response.put("ALLOCATED", statusCounts.getOrDefault(RequestStatus.ALLOCATED, 0L));
        response.put("READY_FOR_RELEASE", statusCounts.getOrDefault(RequestStatus.READY_FOR_RELEASE, 0L));
        response.put("RELEASED", statusCounts.getOrDefault(RequestStatus.RELEASED, 0L));
        response.put("REJECTED", statusCounts.getOrDefault(RequestStatus.REJECTED, 0L));
        response.put("CANCELLED", statusCounts.getOrDefault(RequestStatus.CANCELLED, 0L));
        return response;
    }

    private Sort resolveHospitalRequestSort(String sort) {
        if (sort == null) {
            return Sort.by(Sort.Direction.DESC, "requestedAt");
        }
        return switch (sort.trim().toLowerCase(Locale.ROOT)) {
            case "date_asc", "oldest", "date" -> Sort.by(Sort.Direction.ASC, "requestedAt");
            case "date_desc", "recent", "newest", "date-desc" -> Sort.by(Sort.Direction.DESC, "requestedAt");
            case "ref", "ref-asc" -> Sort.by(Sort.Direction.ASC, "referenceNumber");
            case "ref-desc" -> Sort.by(Sort.Direction.DESC, "referenceNumber");
            case "patient", "patient-asc" -> Sort.by(Sort.Direction.ASC, "patientName");
            case "patient-desc" -> Sort.by(Sort.Direction.DESC, "patientName");
            case "units", "units-asc" -> Sort.by(Sort.Direction.ASC, "numberOfUnits");
            case "units_desc", "units-desc" -> Sort.by(Sort.Direction.DESC, "numberOfUnits");
            default -> Sort.by(Sort.Direction.DESC, "requestedAt");
        };
    }

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────

    private StaffProfile validate(BloodBagRequestDTO dto, MultipartFile doctorsNote) {
        StaffProfile authorizedStaff = resolveAuthorizedStaff(dto.getStaffUniqueCode());
        resolveRequiredStaffDepartment(authorizedStaff);

        // Required patient fields
        if (dto.getPatientName() == null || dto.getPatientName().trim().isEmpty())
            throw new IllegalArgumentException("Patient name is required.");
        if (dto.getPatientAge() == null || dto.getPatientAge() < 0) 
            throw new IllegalArgumentException("Valid patient age is required."); 
        if (dto.getPatientSex() == null || dto.getPatientSex().trim().isEmpty())
            throw new IllegalArgumentException("Patient sex is required.");
        if (dto.getRequestingPhysician() == null || dto.getRequestingPhysician().trim().isEmpty())
            throw new IllegalArgumentException("Requesting physician is required.");
 
        // Required blood details
        if (dto.getBloodType() == null)
            throw new IllegalArgumentException("Blood type is required.");
        if (dto.getBloodComponent() == null)
            throw new IllegalArgumentException("Blood component is required.");
        if (dto.getNumberOfUnits() == null || dto.getNumberOfUnits() <= 0)
            throw new IllegalArgumentException("Number of units must be greater than 0.");
        if (dto.getPlateletCount() != null && dto.getPlateletCount() < 0)
            throw new IllegalArgumentException("Platelet count cannot be negative.");
 
        // Required urgency
        if (dto.getUrgencyLevel() == null)
            throw new IllegalArgumentException("Urgency level is required.");
 
        // Required contact fields (for walk-in/anonymous)
        if (dto.getRequesterName() == null || dto.getRequesterName().trim().isEmpty())
            throw new IllegalArgumentException("Requester name is required.");
        if (dto.getRequesterContact() == null || dto.getRequesterContact().trim().isEmpty())
            throw new IllegalArgumentException("Contact number is required.");
        String requesterEmail = normalizeOptionalEmail(dto.getRequesterEmail());
        if (requesterEmail != null && !requesterEmail.contains("@"))
            throw new IllegalArgumentException("Requester email must be a valid email address when provided.");
 
        // Required file
        if (doctorsNote == null || doctorsNote.isEmpty())
            throw new IllegalArgumentException("Doctor's note or blood request form is required.");
 
        // At least one indication must be provided
        if (dto.getIndication() == null || dto.getIndication().trim().isEmpty())
            throw new IllegalArgumentException("At least one indication for transfusion must be selected.");

        return authorizedStaff;
    }

    public BloodBagRequest getRequestById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Blood request not found with id: " + id));
    }

    public BloodBagRequest getRequestDetailForAdmin(Long id) {
        return populateReservedBags(getRequestById(id));
    }

    public BloodBagRequest populateReservedBags(BloodBagRequest request) {
        if (request == null) return null;
        request.setReservedBags(loadAllocatedBags(request));
        populateRequesterStaffInfo(request);
        return request;
    }

    public List<BloodBagRequest> populateReservedBags(List<BloodBagRequest> requests) {
        if (requests == null) return List.of();
        Map<String, StaffProfile> staffByEmail = loadStaffProfilesByRequesterEmail(requests);
        requests.forEach(req -> {
            if (req == null) return;
            req.setReservedBags(loadAllocatedBags(req));
            populateRequesterStaffInfo(req, staffByEmail);
        });
        return requests;
    }

    private Map<String, StaffProfile> loadStaffProfilesByRequesterEmail(List<BloodBagRequest> requests) {
        Set<String> requesterEmails = new HashSet<>();
        for (BloodBagRequest request : requests) {
            if (request == null) continue;
            String email = normalizeOptionalEmail(request.getRequesterEmail());
            if (email != null) requesterEmails.add(email);
        }
        if (requesterEmails.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, StaffProfile> staffByEmail = new HashMap<>();
        for (StaffProfile profile : staffProfileRepository.findByEmailIn(requesterEmails)) {
            if (profile == null) continue;
            String email = normalizeOptionalEmail(profile.getEmail());
            if (email != null) {
                staffByEmail.put(email, profile);
            }
        }
        return staffByEmail;
    }

    private void populateRequesterStaffInfo(BloodBagRequest request) {
        if (request == null) return;
        String requesterEmail = normalizeOptionalEmail(request.getRequesterEmail());
        if (requesterEmail == null) {
            clearRequesterStaffInfo(request);
            return;
        }
        StaffProfile staffProfile = staffProfileRepository.findByEmail(requesterEmail).orElse(null);
        applyRequesterStaffInfo(request, staffProfile);
    }

    private void populateRequesterStaffInfo(BloodBagRequest request, Map<String, StaffProfile> staffByEmail) {
        if (request == null) return;
        String requesterEmail = normalizeOptionalEmail(request.getRequesterEmail());
        if (requesterEmail == null) {
            clearRequesterStaffInfo(request);
            return;
        }
        applyRequesterStaffInfo(request, staffByEmail.get(requesterEmail));
    }

    private void applyRequesterStaffInfo(BloodBagRequest request, StaffProfile staffProfile) {
        if (staffProfile == null) {
            clearRequesterStaffInfo(request);
            return;
        }
        request.setRequesterStaffId(normalizeOptionalText(staffProfile.getStaffId()));
        request.setRequesterStaffName(buildStaffName(staffProfile));
        request.setRequesterStaffEmail(normalizeOptionalEmail(staffProfile.getEmail()));
        request.setRequesterStaffPhone(normalizeOptionalText(staffProfile.getPhoneNumber()));
    }

    private void clearRequesterStaffInfo(BloodBagRequest request) {
        request.setRequesterStaffId(null);
        request.setRequesterStaffName(null);
        request.setRequesterStaffEmail(null);
        request.setRequesterStaffPhone(null);
    }

    private String buildStaffName(StaffProfile staffProfile) {
        String firstName = normalizeOptionalText(staffProfile.getFirstName());
        String lastName = normalizeOptionalText(staffProfile.getLastName());
        if (firstName == null && lastName == null) return null;
        if (firstName == null) return lastName;
        if (lastName == null) return firstName;
        return firstName + " " + lastName;
    }

    private String normalizeOptionalEmail(String email) {
        if (email == null) return null;
        String normalized = email.trim().toLowerCase();
        if (normalized.isEmpty() || "null".equals(normalized) || "undefined".equals(normalized)) {
            return null;
        }
        return normalized;
    }

    private String normalizeOptionalText(String value) {
        if (value == null) return null;
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeStaffUniqueCode(String uniqueCode) {
        if (uniqueCode == null) return null;
        String normalized = uniqueCode.trim().toUpperCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private StaffProfile resolveAuthorizedStaff(String staffUniqueCode) {
        String normalizedCode = normalizeStaffUniqueCode(staffUniqueCode);
        if (normalizedCode == null) {
            throw new IllegalArgumentException("Staff authorization code is required.");
        }

        if (!normalizedCode.matches("^[A-Z0-9]{4}-[A-Z0-9]{4}$")) {
            throw new IllegalArgumentException("Invalid staff authorization code.");
        }

        StaffProfile staffProfile = staffProfileRepository.findByUniqueCode(normalizedCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid staff authorization code."));

        String normalizedEmail = normalizeOptionalEmail(staffProfile.getEmail());
        if (normalizedEmail == null) {
            throw new IllegalArgumentException("Invalid staff authorization code.");
        }

        return staffProfile;
    }

    private String resolveRequiredStaffDepartment(StaffProfile staffProfile) {
        if (staffProfile == null) {
            throw new IllegalArgumentException("Staff department could not be determined.");
        }
        String normalizedDepartment = normalizeOptionalText(staffProfile.getDepartment());
        if (normalizedDepartment == null) {
            throw new IllegalArgumentException("Staff department could not be determined.");
        }
        return normalizedDepartment;
    }

    private String normalizeRequiredText(String value, String message) {
        String normalized = normalizeOptionalText(value);
        if (normalized == null) {
            throw new IllegalArgumentException(message);
        }
        return normalized;
    }

    private boolean hasRequesterEmail(BloodBagRequest request) {
        return request.getRequesterEmail() != null && !request.getRequesterEmail().trim().isEmpty();
    }

    private String getRequesterNotificationEmail(BloodBagRequest request) {
        if (request == null) return null;
        return normalizeOptionalEmail(request.getRequesterEmail());
    }

    private AdminBloodRequestListItemDTO toAdminListItem(BloodBagRequest request) {
        AdminBloodRequestListItemDTO dto = new AdminBloodRequestListItemDTO();
        dto.setId(request.getId());
        dto.setReferenceNumber(request.getReferenceNumber());
        dto.setStatus(request.getStatus());
        dto.setRequesterType(request.getRequesterType());
        dto.setRequestCategory(request.getRequestCategory());
        dto.setUrgencyLevel(request.getUrgencyLevel());
        dto.setRequestType(request.getRequestType());
        dto.setRequestedAt(request.getRequestedAt());
        dto.setRequiredBy(request.getRequiredBy());

        dto.setPatientName(request.getPatientName());
        dto.setPatientMiddle(request.getPatientMiddle());
        dto.setPatientLast(request.getPatientLast());
        dto.setPatientSuffix(request.getPatientSuffix());
        dto.setPatientAge(request.getPatientAge());
        dto.setPatientSex(request.getPatientSex());
        dto.setPatientBirthdate(request.getPatientBirthdate());
        dto.setWardRoom(request.getWardRoom());
        dto.setRoomNo(request.getRoomNo());
        dto.setPatientPurok(request.getPatientPurok());
        dto.setPatientBarangay(request.getPatientBarangay());
        dto.setPatientMunicipality(request.getPatientMunicipality());
        dto.setPatientProvince(request.getPatientProvince());
        dto.setRequestingPhysician(request.getRequestingPhysician());
        dto.setAgeGroup(request.getAgeGroup());

        dto.setBloodType(request.getBloodType());
        dto.setBloodComponent(request.getBloodComponent());
        dto.setNumberOfUnits(request.getNumberOfUnits());
        dto.setApprovedUnits(request.getApprovedUnits());
        dto.setPatientAcceptedRemarks(request.getPatientAcceptedRemarks());
        dto.setApprovalRemarks(request.getApprovalRemarks());
        dto.setConfirmationEmailSentAt(request.getConfirmationEmailSentAt());
        dto.setPlateletCount(request.getPlateletCount());
        dto.setVolumeMl(request.getVolumeMl());

        dto.setRequesterName(request.getRequesterName());
        dto.setRequesterRelationship(request.getRequesterRelationship());
        dto.setRequesterContact(request.getRequesterContact());
        dto.setRequesterEmail(request.getRequesterEmail());

        if (request.getHospitalProfile() != null) {
            dto.setHospitalName(request.getHospitalProfile().getHospitalName());
            dto.setHospitalContactName(request.getHospitalProfile().getContactPersonName());
            dto.setHospitalPhoneNumber(request.getHospitalProfile().getPhoneNumber());
            if (request.getHospitalProfile().getUser() != null) {
                dto.setHospitalContactEmail(request.getHospitalProfile().getUser().getEmail());
            }
        }

        dto.setNotes(request.getNotes());
        dto.setDoctorsNoteUrl(request.getDoctorsNoteUrl());
        dto.setRejectionReason(request.getRejectionReason());
        return dto;
    }

    private int getEffectiveUnits(BloodBagRequest request) {
        if (Boolean.TRUE.equals(request.getPatientAcceptedRemarks())) {
            if (request.getApprovedUnits() == null || request.getApprovedUnits() <= 0) {
                throw new IllegalStateException("Approved-with-remarks request has no valid approved units.");
            }
            return request.getApprovedUnits();
        }
        return getRequestedUnits(request);
    }

    private int getRequiredUnitsForAllocation(BloodBagRequest request) {
        Boolean acceptedRemarks = request.getPatientAcceptedRemarks();
        if (Boolean.FALSE.equals(acceptedRemarks)) {
            throw new IllegalStateException("Requester rejected the updated approval terms.");
        }

        if (Boolean.TRUE.equals(acceptedRemarks)) {
            if (request.getApprovedUnits() == null || request.getApprovedUnits() <= 0) {
                throw new IllegalStateException("Approved-with-remarks request has no valid approved units.");
            }
            return request.getApprovedUnits();
        }

        return getRequestedUnits(request);
    }

    private int getRequestedUnits(BloodBagRequest request) {
        return request.getNumberOfUnits() != null ? request.getNumberOfUnits() : 1;
    }

    private int countCompatibleAvailableBags(BloodBagRequest request) {
        List<BloodBagAvailableDTO> bags = bloodBagService.getAvailableBags(
            request.getBloodType(),
            request.getBloodComponent()
        );

        int compatibleCount = 0;
        for (BloodBagAvailableDTO bag : bags) {
            if (bag.isCompatible()) {
                compatibleCount++;
            }
        }
        return compatibleCount;
    }

    private String serializeAllocatedBagIds(List<BloodBag> bags) {
        List<String> ids = new ArrayList<>();
        for (BloodBag bag : bags) {
            if (bag != null && bag.getId() != null) {
                ids.add(String.valueOf(bag.getId()));
            }
        }
        return ids.isEmpty() ? null : String.join(",", ids);
    }

    private List<Long> parseAllocatedBagIds(BloodBagRequest request) {
        List<Long> bagIds = new ArrayList<>();
        String rawIds = request.getAllocatedBagIds();
        if (rawIds != null && !rawIds.isBlank()) {
            for (String token : rawIds.split(",")) {
                String normalized = token.trim();
                if (normalized.isEmpty()) {
                    continue;
                }
                try {
                    bagIds.add(Long.parseLong(normalized));
                } catch (NumberFormatException ignored) {
                }
            }
        }

        if (bagIds.isEmpty() && request.getFulfilledByBag() != null && request.getFulfilledByBag().getId() != null) {
            bagIds.add(request.getFulfilledByBag().getId());
        }
        return bagIds;
    }

    private List<BloodBag> loadAllocatedBags(BloodBagRequest request) {
        List<Long> bagIds = parseAllocatedBagIds(request);
        if (bagIds.isEmpty()) {
            return new ArrayList<>();
        }

        Map<Long, BloodBag> bagMap = new HashMap<>();
        for (BloodBag bag : bloodBagRepository.findAllById(bagIds)) {
            bagMap.put(bag.getId(), bag);
        }

        List<BloodBag> orderedBags = new ArrayList<>();
        for (Long bagId : bagIds) {
            BloodBag bag = bagMap.get(bagId);
            if (bag != null) {
                orderedBags.add(bag);
            }
        }
        return orderedBags;
    }

    private void releaseAllocatedBags(BloodBagRequest request) {
        List<BloodBag> allocatedBags = loadAllocatedBags(request);
        if (allocatedBags.isEmpty()) {
            return;
        }

        boolean changed = false;
        for (BloodBag bag : allocatedBags) {
            if (bag.getStatus() == BloodBag.BagStatus.CROSSMATCHED) {
                bag.setStatus(BloodBag.BagStatus.AVAILABLE);
                changed = true;
            }
        }
        if (changed) {
            bloodBagRepository.saveAll(allocatedBags);
        }
        request.setReservedBags(new ArrayList<>());
    }

    private void clearAllocatedBagSelection(BloodBagRequest request) {
        request.setAllocatedBagIds(null);
        request.setFulfilledByBag(null);
        request.setReservedBags(new ArrayList<>());
    }

    private String generateConfirmationToken() {
        return UUID.randomUUID().toString();
    }

    private void clearConfirmationToken(BloodBagRequest request) {
        request.setConfirmationToken(null);
        request.setConfirmationTokenExpiresAt(null);
    }
    
 
    // ─────────────────────────────────────────────
    // REFERENCE NUMBER
    // ─────────────────────────────────────────────

    private String generateReferenceNumber(BloodBagRequest.RequestCategory requestCategory) {
        int year = LocalDate.now().getYear();
        long count = repository.count() + 1;
        String prefix = switch (requestCategory) {
            case INPATIENT -> "IP";
            case OUTPATIENT -> "OP";
            default -> "BR";
        };
        String ref;
        do {
            ref = String.format("%s-%d-%05d", prefix, year, count++);
        } while (repository.findByReferenceNumber(ref).isPresent());
        return ref;
    }
}
