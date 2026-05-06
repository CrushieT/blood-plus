package com.hospital.blood_plus.service;

import com.hospital.blood_plus.dto.request.BloodBagRequestDTO;
import com.hospital.blood_plus.model.AppUser;
import com.hospital.blood_plus.model.BloodBag;
import com.hospital.blood_plus.model.BloodBagRequest;
import com.hospital.blood_plus.model.BloodBagRequest.RequestStatus;
import com.hospital.blood_plus.model.HospitalProfile;
import com.hospital.blood_plus.model.RequestFulfillment;
import com.hospital.blood_plus.repository.BloodBagRepository;
import com.hospital.blood_plus.repository.BloodBagRequestRepository;
import com.hospital.blood_plus.repository.RequestFulfillmentRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class BloodBagRequestService {

    private final BloodBagRequestRepository     repository;
    private final CloudinaryService             cloudinaryService;
    private final BloodBagRepository            bloodBagRepository;
    private final RequestFulfillmentRepository        requestFulfillmentRepository;
    private final EmailService                  emailService;

    public BloodBagRequestService(BloodBagRequestRepository repository,
                                  CloudinaryService cloudinaryService,
                                  BloodBagRepository bloodBagRepository,
                                  RequestFulfillmentRepository requestFulfillmentRepository,
                                  EmailService emailService) {
        this.repository          = repository;
        this.cloudinaryService   = cloudinaryService;
        this.bloodBagRepository  = bloodBagRepository;
        this.requestFulfillmentRepository  = requestFulfillmentRepository;
        this.emailService  = emailService;
    }

    // ─────────────────────────────────────────────
    // SUBMIT ANONYMOUS REQUEST
    // ─────────────────────────────────────────────

    public BloodBagRequest submitAnonymousRequest(BloodBagRequestDTO dto,
                                                  MultipartFile doctorsNote) throws IOException {
        validate(dto, doctorsNote);
 
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
        request.setWardRoom(dto.getWardRoom());
        request.setRoomNo(dto.getRoomNo());
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
        request.setRequesterEmail(dto.getRequesterEmail().trim().toLowerCase());
 
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
        request.setReferenceNumber(generateReferenceNumber());
 
        BloodBagRequest savedRequest = repository.save(request);

        // Send confirmation email to requester
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

        return savedRequest;
    }

    // ─────────────────────────────────────────────
    // FETCH
    // ─────────────────────────────────────────────

    public List<BloodBagRequest> getAllRequests() {
        return repository.findAllByOrderByRequestedAtDesc();
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
        req.setStatus(BloodBagRequest.RequestStatus.APPROVED);
        applyReview(req, reviewer);
        BloodBagRequest savedReq = repository.save(req);
        
        // Send approval email
        try {
            emailService.sendRequestApprovalEmail(
                savedReq.getRequesterEmail(),
                savedReq.getRequesterName(),
                savedReq.getReferenceNumber(),
                savedReq.getBloodType().getDisplayName(),
                savedReq.getNumberOfUnits()
            );
        } catch (Exception e) {
            System.err.println("[BloodBagRequest] Failed to send approval email: " + e.getMessage());
        }
        
        return savedReq;
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
        BloodBagRequest req = updateStatus(id,
                BloodBagRequest.RequestStatus.ALLOCATED,
                BloodBagRequest.RequestStatus.READY_FOR_RELEASE,
                reviewer);
        
        // Send ready notification email
        try {
            emailService.sendRequestReadyEmail(
                req.getRequesterEmail(),
                req.getRequesterName(),
                req.getReferenceNumber(),
                req.getBloodType().getDisplayName(),
                req.getNumberOfUnits()
            );
        } catch (Exception e) {
            System.err.println("[BloodBagRequest] Failed to send ready email: " + e.getMessage());
        }
        
        return req;
    }

    /** READY_FOR_RELEASE → RELEASED  (marks bag as DISPENSED) */
    @Transactional
    public BloodBagRequest releaseRequest(Long id, AppUser reviewer) {
        BloodBagRequest req = ensureStatus(id, BloodBagRequest.RequestStatus.READY_FOR_RELEASE);
        req.setStatus(BloodBagRequest.RequestStatus.RELEASED);
        applyReview(req, reviewer);

        if (req.getFulfilledByBag() != null) {
            BloodBag bag = req.getFulfilledByBag();
            bag.setStatus(BloodBag.BagStatus.DISPENSED);
            bloodBagRepository.save(bag);
            
            String notes = String.format(
                "Blood request released. Bag Serial Number: %s, Blood Type: %s, Component: %s, Units: %d",
                bag.getSerialNumber(),
                bag.getBloodType().getDisplayName(),
                bag.getComponentType(),
                (req.getNumberOfUnits() != null) ? req.getNumberOfUnits() : 1
            );
            
            RequestFulfillment fulfillment = new RequestFulfillment();
            fulfillment.setRequest(req);
            fulfillment.setBloodBag(bag);
            fulfillment.setFulfilledBy(reviewer);
            fulfillment.setNotes(notes);
            requestFulfillmentRepository.save(fulfillment);
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
        request.setPatientAge(dto.getPatientAge());
        request.setPatientSex(dto.getPatientSex());
        request.setWardRoom(dto.getWardRoom() != null ? dto.getWardRoom() : "");
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
        request.setReferenceNumber(generateReferenceNumber());
    
        return repository.save(request);
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
        if (dto.getUrgencyLevel() == null)
            throw new IllegalArgumentException("Urgency level is required.");
        
        // NEW: Validate indication is provided
        if (dto.getIndication() == null || dto.getIndication().isBlank())
            throw new IllegalArgumentException("At least one indication for transfusion is required.");
        
        // NEW: Validate doctors note is provided
        if (file == null || file.isEmpty())
            throw new IllegalArgumentException("Doctor's Blood Request Form is required.");
    }
    // ─────────────────────────────────────────────
    // GET REQUESTS BY HOSPITAL
    // ─────────────────────────────────────────────
 
    public List<BloodBagRequest> getByHospital(HospitalProfile hospital) {
        return repository.findByHospitalProfile(hospital);
    }

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────

    private void validate(BloodBagRequestDTO dto, MultipartFile doctorsNote) {
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
 
        // Required urgency
        if (dto.getUrgencyLevel() == null)
            throw new IllegalArgumentException("Urgency level is required.");
 
        // Required contact fields (for walk-in/anonymous)
        if (dto.getRequesterName() == null || dto.getRequesterName().trim().isEmpty())
            throw new IllegalArgumentException("Requester name is required.");
        if (dto.getRequesterContact() == null || dto.getRequesterContact().trim().isEmpty())
            throw new IllegalArgumentException("Contact number is required.");
        if (dto.getRequesterEmail() == null || !dto.getRequesterEmail().contains("@"))
            throw new IllegalArgumentException("Valid email address is required.");
 
        // Required file
        if (doctorsNote == null || doctorsNote.isEmpty())
            throw new IllegalArgumentException("Doctor's note or blood request form is required.");
 
        // At least one indication must be provided
        if (dto.getIndication() == null || dto.getIndication().trim().isEmpty())
            throw new IllegalArgumentException("At least one indication for transfusion must be selected.");
    }

    public BloodBagRequest getRequestById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Blood request not found with id: " + id));
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