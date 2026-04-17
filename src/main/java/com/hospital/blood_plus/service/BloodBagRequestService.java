package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.BloodBagRequestDTO;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.repository.BloodBagRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BloodBagRequestService {

    private final BloodBagRequestRepository repository;
    private final CloudinaryService cloudinaryService;

    public BloodBagRequestService(BloodBagRequestRepository repository,
                                 CloudinaryService cloudinaryService) {
        this.repository = repository;
        this.cloudinaryService = cloudinaryService;
    }

    // ─────────────────────────────────────────────
    // SUBMIT ANONYMOUS REQUEST
    // ─────────────────────────────────────────────

    public BloodBagRequest submitAnonymousRequest(BloodBagRequestDTO dto,
                                                  MultipartFile doctorsNote) throws IOException {

        validate(dto, doctorsNote);

        BloodBagRequest request = new BloodBagRequest();

        // Upload document
        String[] cloudResult = cloudinaryService.uploadDoctorsNote(doctorsNote);
        request.setDoctorsNoteUrl(cloudResult[0]);
        request.setDoctorsNoteKey(cloudResult[1]);

        // Patient info
        request.setPatientName(dto.getPatientName().trim());
        request.setPatientAge(dto.getPatientAge());
        request.setPatientSex(dto.getPatientSex());
        request.setWardRoom(dto.getWardRoom());
        request.setRequestingPhysician(dto.getRequestingPhysician().trim());

        // Category
        request.setAgeGroup(dto.getAgeGroup() != null
                ? dto.getAgeGroup()
                : BloodBagRequest.AgeGroup.ADULT);

        request.setRequestCategory(dto.getRequestCategory() != null
                ? dto.getRequestCategory()
                : BloodBagRequest.RequestCategory.INPATIENT);

        // Blood details
        request.setBloodType(dto.getBloodType());
        request.setBloodComponent(dto.getBloodComponent());
        request.setNumberOfUnits(dto.getNumberOfUnits());
        request.setUrgencyLevel(dto.getUrgencyLevel());

        // Date (already LocalDateTime)
        request.setRequiredBy(dto.getRequiredBy());

        // Notes
        request.setNotes(dto.getNotes());

        // Contact info
        request.setRequesterName(dto.getRequesterName().trim());
        request.setRequesterRelationship(dto.getRequesterRelationship());
        request.setRequesterContact(dto.getRequesterContact().trim());
        request.setRequesterEmail(dto.getRequesterEmail().trim().toLowerCase());
        

        // System fields
        request.setRequesterType(BloodBagRequest.RequesterType.ANONYMOUS);
        request.setStatus(BloodBagRequest.RequestStatus.PENDING);
        request.setReferenceNumber(generateReferenceNumber());

        return repository.save(request);
    }

    // ─────────────────────────────────────────────
    // FETCH
    // ─────────────────────────────────────────────

    public List<BloodBagRequest> getAllRequests() {
        return repository.findAllByOrderByRequestedAtDesc();
    }

    public BloodBagRequest getByReferenceNumber(String refNum) {
        return repository.findByReferenceNumber(refNum)
                .orElseThrow(() -> new IllegalArgumentException(
                        "No request found for reference number: " + refNum));
    }

    public List<BloodBagRequest> getByStatus(BloodBagRequest.RequestStatus status) {
        return repository.findByStatus(status);
    }

    // ─────────────────────────────────────────────
    // WORKFLOW ACTIONS
    // ─────────────────────────────────────────────

    public BloodBagRequest approveRequest(Long id, AppUser reviewer) {
        return updateStatus(id, BloodBagRequest.RequestStatus.PENDING,
                BloodBagRequest.RequestStatus.APPROVED, reviewer);
    }

    public BloodBagRequest rejectRequest(Long id, String reason, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.PENDING);
        req.setStatus(BloodBagRequest.RequestStatus.REJECTED);
        req.setRejectionReason(reason);
        applyReview(req, reviewer);
        return repository.save(req);
    }

    public BloodBagRequest allocateRequest(Long id, AppUser reviewer) {
        return updateStatus(id, BloodBagRequest.RequestStatus.APPROVED,
                BloodBagRequest.RequestStatus.ALLOCATED, reviewer);
    }

    public BloodBagRequest markReadyRequest(Long id, AppUser reviewer) {
        return updateStatus(id, BloodBagRequest.RequestStatus.ALLOCATED,
                BloodBagRequest.RequestStatus.READY_FOR_RELEASE, reviewer);
    }

    public BloodBagRequest releaseRequest(Long id, AppUser reviewer) {
        return updateStatus(id, BloodBagRequest.RequestStatus.READY_FOR_RELEASE,
                BloodBagRequest.RequestStatus.RELEASED, reviewer);
    }

    public BloodBagRequest cancelRequest(Long id) {
        BloodBagRequest req = findById(id);
        if (req.getStatus() == BloodBagRequest.RequestStatus.RELEASED) {
            throw new IllegalStateException("Released requests cannot be cancelled.");
        }
        req.setStatus(BloodBagRequest.RequestStatus.CANCELLED);
        return repository.save(req);
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    private void validate(BloodBagRequestDTO dto, MultipartFile file) {
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

        if (dto.getNumberOfUnits() == null)
            throw new IllegalArgumentException("Number of units is required.");

        if (dto.getUrgencyLevel() == null)
            throw new IllegalArgumentException("Urgency level is required.");

        if (dto.getRequesterName() == null || dto.getRequesterName().isBlank())
            throw new IllegalArgumentException("Contact name is required.");

        if (dto.getRequesterRelationship() == null || dto.getRequesterRelationship().isBlank())
            throw new IllegalArgumentException("Relationship is required.");

        if (dto.getRequesterContact() == null || dto.getRequesterContact().isBlank())
            throw new IllegalArgumentException("Contact number is required.");

        if (dto.getRequesterEmail() == null || !dto.getRequesterEmail().contains("@"))
            throw new IllegalArgumentException("Valid email is required.");

        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Doctor's note is required.");
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
            throw new IllegalStateException("Invalid status transition.");
        }
        return req;
    }

    private void applyReview(BloodBagRequest req, AppUser reviewer) {
        req.setReviewedBy(reviewer);
        req.setReviewedAt(LocalDateTime.now());
    }

    private BloodBagRequest findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Request not found: " + id));
    }

    private String generateReferenceNumber() {
        int year = LocalDate.now().getYear();
        long count = repository.count() + 1;

        String ref;
        do {
            ref = String.format("BR-%d-%05d", year, count++);
        } while (repository.findByReferenceNumber(ref).isPresent());

        return ref;
    }
}