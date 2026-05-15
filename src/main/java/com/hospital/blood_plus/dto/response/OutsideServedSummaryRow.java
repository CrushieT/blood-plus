package com.hospital.blood_plus.dto.response;

public class OutsideServedSummaryRow {
    private String hospital;
    private int servedUnits;
    private int unservedUnits;

    public OutsideServedSummaryRow() {
    }

    public OutsideServedSummaryRow(String hospital, int servedUnits, int unservedUnits) {
        this.hospital = hospital;
        this.servedUnits = servedUnits;
        this.unservedUnits = unservedUnits;
    }

    public String getHospital() {
        return hospital;
    }

    public void setHospital(String hospital) {
        this.hospital = hospital;
    }

    public int getServedUnits() {
        return servedUnits;
    }

    public void setServedUnits(int servedUnits) {
        this.servedUnits = servedUnits;
    }

    public int getUnservedUnits() {
        return unservedUnits;
    }

    public void setUnservedUnits(int unservedUnits) {
        this.unservedUnits = unservedUnits;
    }
}
