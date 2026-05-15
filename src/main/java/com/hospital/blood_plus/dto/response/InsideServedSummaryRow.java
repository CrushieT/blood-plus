package com.hospital.blood_plus.dto.response;

public class InsideServedSummaryRow {
    private String ward;
    private String component;
    private int servedUnits;
    private int unservedUnits;

    public InsideServedSummaryRow() {
    }

    public InsideServedSummaryRow(String ward, String component, int servedUnits, int unservedUnits) {
        this.ward = ward;
        this.component = component;
        this.servedUnits = servedUnits;
        this.unservedUnits = unservedUnits;
    }

    public String getWard() {
        return ward;
    }

    public void setWard(String ward) {
        this.ward = ward;
    }

    public String getComponent() {
        return component;
    }

    public void setComponent(String component) {
        this.component = component;
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
