package com.hospital.blood_plus.dto.response;

import com.hospital.blood_plus.model.BloodBag;
import java.time.LocalDateTime;

/**
 * Response DTO for the /api/admin/blood-bags/available endpoint.
 * Returned as a list so the frontend can render the bag picker.
 */
public class BloodBagAvailableDTO {

    private Long   id;
    private String serialNumber;
    private String transactionNumber;
    private String bloodType;        // e.g. "A_POS"
    private String rhType;           // "POSITIVE" / "NEGATIVE"
    private String componentType;    // e.g. "WHOLE_BLOOD"
    private int    volumeMl;
    private String source;           // BagSource enum name
    private LocalDateTime collectedAt;
    private LocalDateTime expiresAt;
    private boolean compatible;      // exact blood-type match
    private boolean recommended;     // first compatible bag sorted by soonest-expiry

    /* ── Static factory ─────────────────────────────────── */
    public static BloodBagAvailableDTO from(BloodBag bag, boolean compatible, boolean recommended) {
        BloodBagAvailableDTO dto = new BloodBagAvailableDTO();
        dto.id                = bag.getId();
        dto.serialNumber      = bag.getSerialNumber();
        dto.transactionNumber = bag.getTransactionNumber();
        dto.bloodType         = bag.getBloodType() != null ? bag.getBloodType().name() : null;
        dto.rhType            = bag.getRhType()    != null ? bag.getRhType().name()    : null;
        dto.componentType     = bag.getComponentType() != null ? bag.getComponentType().name() : null;
        dto.volumeMl          = bag.getVolumeMl()  != null ? bag.getVolumeMl()  : 0;
        dto.source            = bag.getSource()    != null ? bag.getSource().name()    : null;
        dto.collectedAt       = bag.getCollectedAt();
        dto.expiresAt         = bag.getExpiresAt();
        dto.compatible        = compatible;
        dto.recommended       = recommended;
        return dto;
    }

    /* ── Getters (Spring needs these for JSON serialisation) */
    public Long   getId()               { return id; }
    public String getSerialNumber()     { return serialNumber; }
    public String getTransactionNumber(){ return transactionNumber; }
    public String getBloodType()        { return bloodType; }
    public String getRhType()           { return rhType; }
    public String getComponentType()    { return componentType; }
    public int    getVolumeMl()         { return volumeMl; }
    public String getSource()           { return source; }
    public LocalDateTime getCollectedAt(){ return collectedAt; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public boolean isCompatible()       { return compatible; }
    public boolean isRecommended()      { return recommended; }
}