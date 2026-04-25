package com.hospital.blood_plus.dto.request;

public class UpdateHospitalProfileDTO {
    private String hospitalName;
    private String address;
    private String city;
    private String province;
    private String phoneNumber;
    private String contactPersonName;
    private String contactPersonPhone;

    // Constructors
    public UpdateHospitalProfileDTO() {}

    public UpdateHospitalProfileDTO(
            String hospitalName,
            String address,
            String city,
            String province,
            String phoneNumber,
            String contactPersonName,
            String contactPersonPhone) {
        this.hospitalName = hospitalName;
        this.address = address;
        this.city = city;
        this.province = province;
        this.phoneNumber = phoneNumber;
        this.contactPersonName = contactPersonName;
        this.contactPersonPhone = contactPersonPhone;
    }

    // Getters & Setters
    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getProvince() { return province; }
    public void setProvince(String province) { this.province = province; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getContactPersonName() { return contactPersonName; }
    public void setContactPersonName(String contactPersonName) { this.contactPersonName = contactPersonName; }

    public String getContactPersonPhone() { return contactPersonPhone; }
    public void setContactPersonPhone(String contactPersonPhone) { this.contactPersonPhone = contactPersonPhone; }
}