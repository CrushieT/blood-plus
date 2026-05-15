package com.hospital.blood_plus.dto.request;

public class ApproveRequestDTO {

    private Integer approvedUnits;
    private String approvalRemarks;
    private String alternativeComponentSuggestion;

    public Integer getApprovedUnits() {
        return approvedUnits;
    }

    public void setApprovedUnits(Integer approvedUnits) {
        this.approvedUnits = approvedUnits;
    }

    public String getApprovalRemarks() {
        return approvalRemarks;
    }

    public void setApprovalRemarks(String approvalRemarks) {
        this.approvalRemarks = approvalRemarks;
    }

    public String getAlternativeComponentSuggestion() {
        return alternativeComponentSuggestion;
    }

    public void setAlternativeComponentSuggestion(String alternativeComponentSuggestion) {
        this.alternativeComponentSuggestion = alternativeComponentSuggestion;
    }
}
