package com.hospital.blood_plus.dto.request;

import java.util.ArrayList;
import java.util.List;

public class BloodTracerSaveDTO {

    private String bloodServiceFacility;
    private String preparedBy;
    private String releasedBy;
    private String dateReleased;
    private String timeReleased;
    private String temperaturePriorTransport;
    private String transportedBy;
    private String bloodReceivedBy;
    private String dateReceived;
    private String timeReceived;
    private String tempUponReceipt;
    private String transportBoxTemp;
    private String transactionNumber;
    private String qualityManager;
    private String receivingOfficer;
    private String pathologist;
    private Boolean checkSignHemolysis;
    private Boolean checkBloodClots;
    private Boolean checkLeakageOnBag;
    private Boolean checkBacterialContamination;
    private Boolean checkGreenishDiscoloration;
    private Boolean checkIndirectCoolantContact;
    private Boolean checkPlasmaNotFrozen;
    private Boolean checkCoolantsSufficientFrozen;
    private List<RowDTO> rows = new ArrayList<>();

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

    public List<RowDTO> getRows() {
        return rows;
    }

    public void setRows(List<RowDTO> rows) {
        this.rows = rows;
    }

    public static class RowDTO {
        private Integer rowIndex;
        private String aboRh;
        private String componentReleased;
        private String serialNumber;
        private String extractionDate;
        private String expirationDate;
        private String patientName;
        private String address;
        private String age;
        private String sex;
        private String ward;
        private String rmNo;
        private String indicationCode;
        private String transfusionDate;
        private String comp;
        private String rxn;
        private String remarks;

        public Integer getRowIndex() {
            return rowIndex;
        }

        public void setRowIndex(Integer rowIndex) {
            this.rowIndex = rowIndex;
        }

        public String getAboRh() {
            return aboRh;
        }

        public void setAboRh(String aboRh) {
            this.aboRh = aboRh;
        }

        public String getComponentReleased() {
            return componentReleased;
        }

        public void setComponentReleased(String componentReleased) {
            this.componentReleased = componentReleased;
        }

        public String getSerialNumber() {
            return serialNumber;
        }

        public void setSerialNumber(String serialNumber) {
            this.serialNumber = serialNumber;
        }

        public String getExtractionDate() {
            return extractionDate;
        }

        public void setExtractionDate(String extractionDate) {
            this.extractionDate = extractionDate;
        }

        public String getExpirationDate() {
            return expirationDate;
        }

        public void setExpirationDate(String expirationDate) {
            this.expirationDate = expirationDate;
        }

        public String getPatientName() {
            return patientName;
        }

        public void setPatientName(String patientName) {
            this.patientName = patientName;
        }

        public String getAddress() {
            return address;
        }

        public void setAddress(String address) {
            this.address = address;
        }

        public String getAge() {
            return age;
        }

        public void setAge(String age) {
            this.age = age;
        }

        public String getSex() {
            return sex;
        }

        public void setSex(String sex) {
            this.sex = sex;
        }

        public String getWard() {
            return ward;
        }

        public void setWard(String ward) {
            this.ward = ward;
        }

        public String getRmNo() {
            return rmNo;
        }

        public void setRmNo(String rmNo) {
            this.rmNo = rmNo;
        }

        public String getIndicationCode() {
            return indicationCode;
        }

        public void setIndicationCode(String indicationCode) {
            this.indicationCode = indicationCode;
        }

        public String getTransfusionDate() {
            return transfusionDate;
        }

        public void setTransfusionDate(String transfusionDate) {
            this.transfusionDate = transfusionDate;
        }

        public String getComp() {
            return comp;
        }

        public void setComp(String comp) {
            this.comp = comp;
        }

        public String getRxn() {
            return rxn;
        }

        public void setRxn(String rxn) {
            this.rxn = rxn;
        }

        public String getRemarks() {
            return remarks;
        }

        public void setRemarks(String remarks) {
            this.remarks = remarks;
        }
    }
}
