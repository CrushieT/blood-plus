package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.BloodBagRequestDTO;
import com.hospital.blood_plus.dto.response.BloodBagAvailableDTO;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.repository.BloodBagRepository;
import com.hospital.blood_plus.repository.BloodBagRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class BloodBagRequestService {

    private final BloodBagRequestRepository repository;
    private final CloudinaryService         cloudinaryService;
    private final BloodBagRepository        bloodBagRepository;

    public BloodBagRequestService(BloodBagRequestRepository repository,
                                  CloudinaryService cloudinaryService,
                                  BloodBagRepository bloodBagRepository) {
        this.repository          = repository;
        this.cloudinaryService   = cloudinaryService;
        this.bloodBagRepository  = bloodBagRepository;
    }

    // ─────────────────────────────────────────────
    // SUBMIT ANONYMOUS REQUEST
    // ─────────────────────────────────────────────

    public BloodBagRequest submitAnonymousRequest(BloodBagRequestDTO dto,
                                                  MultipartFile doctorsNote) throws IOException {
        validate(dto, doctorsNote);

        BloodBagRequest request = new BloodBagRequest();

        String[] cloudResult = cloudinaryService.uploadDoctorsNote(doctorsNote);
        request.setDoctorsNoteUrl(cloudResult[0]);
        request.setDoctorsNoteKey(cloudResult[1]);

        request.setPatientName(dto.getPatientName().trim());
        request.setPatientAge(dto.getPatientAge());
        request.setPatientSex(dto.getPatientSex());
        request.setWardRoom(dto.getWardRoom());
        request.setRequestingPhysician(dto.getRequestingPhysician().trim());

        request.setAgeGroup(dto.getAgeGroup() != null
                ? dto.getAgeGroup()
                : BloodBagRequest.AgeGroup.ADULT);
        request.setRequestCategory(dto.getRequestCategory() != null
                ? dto.getRequestCategory()
                : BloodBagRequest.RequestCategory.INPATIENT);

        request.setBloodType(dto.getBloodType());
        request.setBloodComponent(dto.getBloodComponent());
        request.setNumberOfUnits(dto.getNumberOfUnits());
        request.setUrgencyLevel(dto.getUrgencyLevel());
        request.setRequiredBy(dto.getRequiredBy());
        request.setNotes(dto.getNotes());

        request.setRequesterName(dto.getRequesterName().trim());
        request.setRequesterRelationship(dto.getRequesterRelationship());
        request.setRequesterContact(dto.getRequesterContact().trim());
        request.setRequesterEmail(dto.getRequesterEmail().trim().toLowerCase());

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

    /** PENDING → APPROVED  (simple approval, no bag selection here) */
    public BloodBagRequest approveRequest(Long id, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.PENDING);
        req.setStatus(BloodBagRequest.RequestStatus.APPROVED);
        applyReview(req, reviewer);
        return repository.save(req);
    }

    /** PENDING → REJECTED */
    public BloodBagRequest rejectRequest(Long id, String reason, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.PENDING);
        req.setStatus(BloodBagRequest.RequestStatus.REJECTED);
        req.setRejectionReason(reason);
        applyReview(req, reviewer);
        return repository.save(req);
    }

    /** APPROVED → ALLOCATED  (selects blood bags) */
    public BloodBagRequest allocateRequest(Long id, List<Long> bagIds, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.APPROVED);
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

        // Release previously crossmatched bag back to AVAILABLE
        if (req.getFulfilledByBag() != null) {
            BloodBag old = req.getFulfilledByBag();
            if (old.getStatus() == BloodBag.BagStatus.CROSSMATCHED) {
                old.setStatus(BloodBag.BagStatus.AVAILABLE);
                bloodBagRepository.save(old);
            }
        }

        return reserveBags(req, bagIds, reviewer);
    }

    /** ALLOCATED → READY_FOR_RELEASE */
    public BloodBagRequest markReadyRequest(Long id, AppUser reviewer) {
        return updateStatus(id,
                BloodBagRequest.RequestStatus.ALLOCATED,
                BloodBagRequest.RequestStatus.READY_FOR_RELEASE,
                reviewer);
    }

    /** READY_FOR_RELEASE → RELEASED  (marks bag as DISPENSED) */
    public BloodBagRequest releaseRequest(Long id, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.READY_FOR_RELEASE);
        req.setStatus(BloodBagRequest.RequestStatus.RELEASED);
        applyReview(req, reviewer);

        if (req.getFulfilledByBag() != null) {
            req.getFulfilledByBag().setStatus(BloodBag.BagStatus.DISPENSED);
            bloodBagRepository.save(req.getFulfilledByBag());
        }

        return repository.save(req);
    }

    /** Any non-RELEASED → CANCELLED */
    public BloodBagRequest cancelRequest(Long id) {
        BloodBagRequest req = findById(id);
        if (req.getStatus() == BloodBagRequest.RequestStatus.RELEASED) {
            throw new IllegalStateException("Released requests cannot be cancelled.");
        }
        req.setStatus(BloodBagRequest.RequestStatus.CANCELLED);
        return repository.save(req);
    }

    // ─────────────────────────────────────────────
    // INTERNAL
    // ─────────────────────────────────────────────

    /** Validate bags, mark CROSSMATCHED, link to request, set ALLOCATED */
    private BloodBagRequest reserveBags(BloodBagRequest req, List<Long> bagIds, AppUser reviewer) {
        if (bagIds == null || bagIds.isEmpty()) {
            throw new IllegalArgumentException("At least one blood bag must be selected.");
        }
        if (bagIds.size() != req.getNumberOfUnits()) {
            throw new IllegalArgumentException(
                    "Expected " + req.getNumberOfUnits() + " bag(s), got " + bagIds.size() + ".");
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
        applyReview(req, reviewer);
        return repository.save(req);
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

    private BloodBagRequest findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Request not found: " + id));
    }

    // ─────────────────────────────────────────────
    // VALIDATION
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

    // ─────────────────────────────────────────────
    // REFERENCE NUMBER
    // ─────────────────────────────────────────────

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