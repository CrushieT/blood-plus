package com.hospital.blood_plus.dto.request;

import java.time.LocalDate;

// ─── Request DTOs ────────────────────────────────────────────

/** Used by POST /api/admin/staff  (create) */
public class StaffDTOs {

    public static class CreateStaffRequest {
        private String email;
        private String firstName;
        private String lastName;
        private String staffId;
        private String department;
        private String position;
        private String phoneNumber;
        private LocalDate hireDate;
        private String status;   // "active" | "inactive"

        public String getEmail()       { return email; }
        public void setEmail(String v) { email = v; }

        public String getFirstName()       { return firstName; }
        public void setFirstName(String v) { firstName = v; }

        public String getLastName()        { return lastName; }
        public void setLastName(String v)  { lastName = v; }

        public String getStaffId()         { return staffId; }
        public void setStaffId(String v)   { staffId = v; }

        public String getDepartment()       { return department; }
        public void setDepartment(String v) { department = v; }

        public String getPosition()        { return position; }
        public void setPosition(String v)  { position = v; }

        public String getPhoneNumber()        { return phoneNumber; }
        public void setPhoneNumber(String v)  { phoneNumber = v; }

        public LocalDate getHireDate()        { return hireDate; }
        public void setHireDate(LocalDate v)  { hireDate = v; }

        public String getStatus()         { return status; }
        public void setStatus(String v)   { status = v; }
    }

    /** Used by PUT /api/admin/staff/{id}  (edit) */
    public static class UpdateStaffRequest {
        private String firstName;
        private String lastName;
        private String staffId;
        private String department;
        private String position;
        private String phoneNumber;
        private LocalDate hireDate;
        private String status;
        private String newPassword;   // optional — blank = no change

        public String getFirstName()       { return firstName; }
        public void setFirstName(String v) { firstName = v; }

        public String getLastName()        { return lastName; }
        public void setLastName(String v)  { lastName = v; }

        public String getStaffId()         { return staffId; }
        public void setStaffId(String v)   { staffId = v; }

        public String getDepartment()       { return department; }
        public void setDepartment(String v) { department = v; }

        public String getPosition()        { return position; }
        public void setPosition(String v)  { position = v; }

        public String getPhoneNumber()        { return phoneNumber; }
        public void setPhoneNumber(String v)  { phoneNumber = v; }

        public LocalDate getHireDate()        { return hireDate; }
        public void setHireDate(LocalDate v)  { hireDate = v; }

        public String getStatus()         { return status; }
        public void setStatus(String v)   { status = v; }

        public String getNewPassword()        { return newPassword; }
        public void setNewPassword(String v)  { newPassword = v; }
    }

    /** Returned from every staff endpoint */
    public static class StaffResponse {
        private Long   id;
        private Long   userId;
        private String staffId;
        private String email;
        private String firstName;
        private String lastName;
        private String department;
        private String position;
        private String phoneNumber;
        private String hireDate;
        private String status;
        private boolean hasDashboardAccess;
        private String accountAccessStatus;
        private String codeStatus;
        private String maskedUniqueCode;
        private String createdAt;

        // Builder-style setters
        public StaffResponse id(Long v)          { id = v;          return this; }
        public StaffResponse userId(Long v)      { userId = v;      return this; }
        public StaffResponse staffId(String v)   { staffId = v;     return this; }
        public StaffResponse email(String v)     { email = v;       return this; }
        public StaffResponse firstName(String v) { firstName = v;   return this; }
        public StaffResponse lastName(String v)  { lastName = v;    return this; }
        public StaffResponse department(String v){ department = v;  return this; }
        public StaffResponse position(String v)  { position = v;    return this; }
        public StaffResponse phoneNumber(String v){ phoneNumber = v;return this; }
        public StaffResponse hireDate(String v)  { hireDate = v;    return this; }
        public StaffResponse status(String v)    { status = v;      return this; }
        public StaffResponse hasDashboardAccess(boolean v) { hasDashboardAccess = v; return this; }
        public StaffResponse accountAccessStatus(String v) { accountAccessStatus = v; return this; }
        public StaffResponse codeStatus(String v) { codeStatus = v; return this; }
        public StaffResponse maskedUniqueCode(String v) { maskedUniqueCode = v; return this; }
        public StaffResponse createdAt(String v) { createdAt = v;   return this; }

        public Long   getId()          { return id; }
        public Long   getUserId()      { return userId; }
        public String getStaffId()     { return staffId; }
        public String getEmail()       { return email; }
        public String getFirstName()   { return firstName; }
        public String getLastName()    { return lastName; }
        public String getDepartment()  { return department; }
        public String getPosition()    { return position; }
        public String getPhoneNumber() { return phoneNumber; }
        public String getHireDate()    { return hireDate; }
        public String getStatus()      { return status; }
        public boolean isHasDashboardAccess() { return hasDashboardAccess; }
        public boolean getHasDashboardAccess() { return hasDashboardAccess; }
        public String getAccountAccessStatus() { return accountAccessStatus; }
        public String getCodeStatus() { return codeStatus; }
        public String getMaskedUniqueCode() { return maskedUniqueCode; }
        public String getCreatedAt()   { return createdAt; }
    }
}
