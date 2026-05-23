package com.hospital.blood_plus.dto.request;

public class HospitalDTOs {

    // ── Create Hospital ──
    public static class CreateHospitalRequest {
        private String hospitalName;
        private String address;
        private String city;
        private String province;
        private String phoneNumber;
        private String contactPersonName;
        private String contactPersonPhone;
        private String email; // AppUser email (login)

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

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    // ── Update Hospital ──
    public static class UpdateHospitalRequest {
        private String hospitalName;
        private String address;
        private String city;
        private String province;
        private String phoneNumber;
        private String contactPersonName;
        private String contactPersonPhone;
        private String email;
        private String newPassword;

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

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    // ── Hospital Response ──
    public static class HospitalResponse {
        private Long id;
        private Long userId;
        private String hospitalName;
        private String address;
        private String city;
        private String province;
        private String phoneNumber;
        private String contactPersonName;
        private String contactPersonPhone;
        private String email;
        private Integer requestCount;
        private String createdAt;

        public HospitalResponse(Long id, Long userId, String hospitalName, String address, String city,
                                String province, String phoneNumber, String contactPersonName,
                                String contactPersonPhone, String email, Integer requestCount, String createdAt) {
            this.id = id;
            this.userId = userId;
            this.hospitalName = hospitalName;
            this.address = address;
            this.city = city;
            this.province = province;
            this.phoneNumber = phoneNumber;
            this.contactPersonName = contactPersonName;
            this.contactPersonPhone = contactPersonPhone;
            this.email = email;
            this.requestCount = requestCount;
            this.createdAt = createdAt;
        }

        public Long getId() { return id; }
        public Long getUserId() { return userId; }
        public String getHospitalName() { return hospitalName; }
        public String getAddress() { return address; }
        public String getCity() { return city; }
        public String getProvince() { return province; }
        public String getPhoneNumber() { return phoneNumber; }
        public String getContactPersonName() { return contactPersonName; }
        public String getContactPersonPhone() { return contactPersonPhone; }
        public String getEmail() { return email; }
        public Integer getRequestCount() { return requestCount; }
        public String getCreatedAt() { return createdAt; }
    }
}
