package com.hospital.blood_plus.dto.request;

public class DeferralRequest {
    private String deferralReason;
    private String deferralNote;

    public String getDeferralReason()                     { return deferralReason; }
    public void setDeferralReason(String deferralReason)  { this.deferralReason = deferralReason; }

    public String getDeferralNote()                       { return deferralNote; }
    public void setDeferralNote(String deferralNote)      { this.deferralNote = deferralNote; }
}