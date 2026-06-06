package com.hospital.blood_plus.dto.request;

public class EmailConfirmationRequest {

    private String token;
    private Boolean accepted;

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Boolean getAccepted() {
        return accepted;
    }

    public void setAccepted(Boolean accepted) {
        this.accepted = accepted;
    }
}
