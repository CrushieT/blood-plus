package com.hospital.blood_plus.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "blood_tracers",
    uniqueConstraints = {
        @UniqueConstraint(name = "uk_blood_tracer_request", columnNames = "request_id")
    }
)
public class BloodTracer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private BloodBagRequest request;

    @Column(name = "blood_service_facility", length = 200)
    private String bloodServiceFacility;

    @Column(name = "prepared_by", length = 200)
    private String preparedBy;

    @Column(name = "released_by", length = 200)
    private String releasedBy;

    @Column(name = "date_released", length = 50)
    private String dateReleased;

    @Column(name = "time_released", length = 50)
    private String timeReleased;

    @Column(name = "temperature_prior_transport", length = 100)
    private String temperaturePriorTransport;

    @Column(name = "transported_by", length = 200)
    private String transportedBy;

    @Column(name = "blood_received_by", length = 200)
    private String bloodReceivedBy;

    @Column(name = "date_received", length = 50)
    private String dateReceived;

    @Column(name = "time_received", length = 50)
    private String timeReceived;

    @Column(name = "temp_upon_receipt", length = 100)
    private String tempUponReceipt;

    @Column(name = "transport_box_temp", length = 100)
    private String transportBoxTemp;

    @Column(name = "transaction_number", length = 100)
    private String transactionNumber;

    @Column(name = "quality_manager", length = 200)
    private String qualityManager;

    @Column(name = "receiving_officer", length = 200)
    private String receivingOfficer;

    @Column(name = "pathologist", length = 200)
    private String pathologist;

    @Column(name = "check_sign_hemolysis")
    private Boolean checkSignHemolysis;

    @Column(name = "check_blood_clots")
    private Boolean checkBloodClots;

    @Column(name = "check_leakage_on_bag")
    private Boolean checkLeakageOnBag;

    @Column(name = "check_bacterial_contamination")
    private Boolean checkBacterialContamination;

    @Column(name = "check_greenish_discoloration")
    private Boolean checkGreenishDiscoloration;

    @Column(name = "check_indirect_coolant_contact")
    private Boolean checkIndirectCoolantContact;

    @Column(name = "check_plasma_not_frozen")
    private Boolean checkPlasmaNotFrozen;

    @Column(name = "check_coolants_sufficient_frozen")
    private Boolean checkCoolantsSufficientFrozen;

    @Lob
    @Column(name = "rows_json", columnDefinition = "LONGTEXT")
    private String rowsJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "edited_by")
    private AppUser editedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public BloodBagRequest getRequest() {
        return request;
    }

    public void setRequest(BloodBagRequest request) {
        this.request = request;
    }

    public String getBloodServiceFacility() {
        return bloodServiceFacility;
    }

    public void setBloodServiceFacility(String bloodServiceFacility) {
        this.bloodServiceFacility = bloodServiceFacility;
    }

    public String getPreparedBy() {
        return preparedBy;
    }

    public void setPreparedBy(String preparedBy) {
        this.preparedBy = preparedBy;
    }

    public String getReleasedBy() {
        return releasedBy;
    }

    public void setReleasedBy(String releasedBy) {
        this.releasedBy = releasedBy;
    }

    public String getDateReleased() {
        return dateReleased;
    }

    public void setDateReleased(String dateReleased) {
        this.dateReleased = dateReleased;
    }

    public String getTimeReleased() {
        return timeReleased;
    }

    public void setTimeReleased(String timeReleased) {
        this.timeReleased = timeReleased;
    }

    public String getTemperaturePriorTransport() {
        return temperaturePriorTransport;
    }

    public void setTemperaturePriorTransport(String temperaturePriorTransport) {
        this.temperaturePriorTransport = temperaturePriorTransport;
    }

    public String getTransportedBy() {
        return transportedBy;
    }

    public void setTransportedBy(String transportedBy) {
        this.transportedBy = transportedBy;
    }

    public String getBloodReceivedBy() {
        return bloodReceivedBy;
    }

    public void setBloodReceivedBy(String bloodReceivedBy) {
        this.bloodReceivedBy = bloodReceivedBy;
    }

    public String getDateReceived() {
        return dateReceived;
    }

    public void setDateReceived(String dateReceived) {
        this.dateReceived = dateReceived;
    }

    public String getTimeReceived() {
        return timeReceived;
    }

    public void setTimeReceived(String timeReceived) {
        this.timeReceived = timeReceived;
    }

    public String getTempUponReceipt() {
        return tempUponReceipt;
    }

    public void setTempUponReceipt(String tempUponReceipt) {
        this.tempUponReceipt = tempUponReceipt;
    }

    public String getTransportBoxTemp() {
        return transportBoxTemp;
    }

    public void setTransportBoxTemp(String transportBoxTemp) {
        this.transportBoxTemp = transportBoxTemp;
    }

    public String getTransactionNumber() {
        return transactionNumber;
    }

    public void setTransactionNumber(String transactionNumber) {
        this.transactionNumber = transactionNumber;
    }

    public String getQualityManager() {
        return qualityManager;
    }

    public void setQualityManager(String qualityManager) {
        this.qualityManager = qualityManager;
    }

    public String getReceivingOfficer() {
        return receivingOfficer;
    }

    public void setReceivingOfficer(String receivingOfficer) {
        this.receivingOfficer = receivingOfficer;
    }

    public String getPathologist() {
        return pathologist;
    }

    public void setPathologist(String pathologist) {
        this.pathologist = pathologist;
    }

    public Boolean getCheckSignHemolysis() {
        return checkSignHemolysis;
    }

    public void setCheckSignHemolysis(Boolean checkSignHemolysis) {
        this.checkSignHemolysis = checkSignHemolysis;
    }

    public Boolean getCheckBloodClots() {
        return checkBloodClots;
    }

    public void setCheckBloodClots(Boolean checkBloodClots) {
        this.checkBloodClots = checkBloodClots;
    }

    public Boolean getCheckLeakageOnBag() {
        return checkLeakageOnBag;
    }

    public void setCheckLeakageOnBag(Boolean checkLeakageOnBag) {
        this.checkLeakageOnBag = checkLeakageOnBag;
    }

    public Boolean getCheckBacterialContamination() {
        return checkBacterialContamination;
    }

    public void setCheckBacterialContamination(Boolean checkBacterialContamination) {
        this.checkBacterialContamination = checkBacterialContamination;
    }

    public Boolean getCheckGreenishDiscoloration() {
        return checkGreenishDiscoloration;
    }

    public void setCheckGreenishDiscoloration(Boolean checkGreenishDiscoloration) {
        this.checkGreenishDiscoloration = checkGreenishDiscoloration;
    }

    public Boolean getCheckIndirectCoolantContact() {
        return checkIndirectCoolantContact;
    }

    public void setCheckIndirectCoolantContact(Boolean checkIndirectCoolantContact) {
        this.checkIndirectCoolantContact = checkIndirectCoolantContact;
    }

    public Boolean getCheckPlasmaNotFrozen() {
        return checkPlasmaNotFrozen;
    }

    public void setCheckPlasmaNotFrozen(Boolean checkPlasmaNotFrozen) {
        this.checkPlasmaNotFrozen = checkPlasmaNotFrozen;
    }

    public Boolean getCheckCoolantsSufficientFrozen() {
        return checkCoolantsSufficientFrozen;
    }

    public void setCheckCoolantsSufficientFrozen(Boolean checkCoolantsSufficientFrozen) {
        this.checkCoolantsSufficientFrozen = checkCoolantsSufficientFrozen;
    }

    public String getRowsJson() {
        return rowsJson;
    }

    public void setRowsJson(String rowsJson) {
        this.rowsJson = rowsJson;
    }

    public AppUser getEditedBy() {
        return editedBy;
    }

    public void setEditedBy(AppUser editedBy) {
        this.editedBy = editedBy;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
