package com.hospital.blood_plus.service;

import com.hospital.blood_plus.model.BloodBagRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class EmailService {

    @Value("${brevo.api.key}")
    private String apiKey;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.frontend.base-url:http://localhost:8080}")
    private String frontendBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendVerificationEmail(String to, String code) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            Map<String, Object> body = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "BloodPlus"),
                "to",          new Object[]{ Map.of("email", to) },
                "subject",     "BloodPlus - Email Verification Code",
                "textContent", "Your verification code is: " + code +
                            "\n\nThis code will expire in 5 minutes."
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("Brevo response: " + response.getStatusCode() + " - " + response.getBody());
        } catch (Exception e) {
            System.err.println("Failed to send email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendStaffCredentialsEmail(String to, String staffName,
                                           String username, String tempPassword,
                                           String uniqueCode) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";
 
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);
 
            String body =
                "Hi " + staffName + ",\n\n" +
                "Your BloodPlus Blood Bank staff account has been created.\n\n" +
                "Login details:\n" +
                "Email/Login: " + to + "\n" +
                "Username: " + username + "\n" +
                "Temporary Password: " + tempPassword + "\n\n" +
                "Staff authorization code:\n" +
                uniqueCode + "\n\n" +
                "Dashboard access:\n" +
                "Sign in at " + normalizedFrontendBaseUrl() + "/admin-login.html using your email and temporary password. " +
                "Please change your password after your first login.\n\n" +
                "— BloodPlus Admin";
 
            Map<String, Object> payload = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "BloodPlus"),
                "to",          new Object[]{ Map.of("email", to) },
                "subject",     "BloodPlus — Your Staff Account Credentials",
                "textContent", body
            );
 
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("Brevo credentials email: " + response.getStatusCode());
        } catch (Exception e) {
            System.err.println("Failed to send credentials email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendStaffAuthorizationCodeEmail(String to, String staffName,
                                                String department, String uniqueCode) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            String body =
                "Hi " + staffName + ",\n\n" +
                "Your BloodPlus staff authorization code has been created.\n\n" +
                "Department: " + department + "\n" +
                "Authorization Code: " + uniqueCode + "\n\n" +
                "This code is for staff identification and authorization for blood requesting workflows.\n\n" +
                "You do not have BloodPlus dashboard login access. No password has been created for your account.\n\n" +
                "BloodPlus Admin";

            Map<String, Object> payload = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "BloodPlus"),
                "to",          new Object[]{ Map.of("email", to) },
                "subject",     "BloodPlus - Staff Authorization Code",
                "textContent", body
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("Brevo staff authorization code email: " + response.getStatusCode());
        } catch (Exception e) {
            System.err.println("Failed to send staff authorization code email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendStaffRegeneratedCodeEmail(String to, String staffName,
                                              String uniqueCode, boolean hasDashboardAccess) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            String dashboardNote = hasDashboardAccess
                ? "Your dashboard password has not been changed.\n"
                : "You still do not have BloodPlus dashboard login access.\n";

            String body =
                "Hi " + staffName + ",\n\n" +
                "A new BloodPlus staff authorization code has been generated for you.\n\n" +
                "New Authorization Code: " + uniqueCode + "\n\n" +
                "Please use this new code going forward. Your previous authorization code should no longer be used.\n\n" +
                dashboardNote + "\n" +
                "BloodPlus Admin";

            Map<String, Object> payload = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "BloodPlus"),
                "to",          new Object[]{ Map.of("email", to) },
                "subject",     "BloodPlus - New Staff Authorization Code",
                "textContent", body
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("Brevo regenerated staff code email: " + response.getStatusCode());
        } catch (Exception e) {
            System.err.println("Failed to send regenerated staff code email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public void sendHospitalCredentialsEmail(String email, String hospitalName, String tempPassword) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: #C41E3A; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                        .header h1 { margin: 0; }
                        .content { padding: 20px 0; }
                        .credential-box { background: #f9f9f9; border-left: 4px solid #C41E3A; padding: 15px; margin: 15px 0; }
                        .label { font-weight: bold; color: #333; }
                        .value { font-family: 'Courier New', monospace; background: white; padding: 8px; border-radius: 4px; margin-top: 5px; word-break: break-all; }
                        .warning { background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; font-size: 13px; }
                        .footer { border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🩸 Blood+ System</h1>
                            <p>Hospital Portal Access</p>
                        </div>
                        
                        <div class="content">
                            <p>Dear <strong>%s</strong>,</p>
                            
                            <p>Your hospital account has been created in the Blood+ Blood Bank Management System. Use the credentials below to log in and start requesting blood for your patients.</p>
                            
                            <div class="credential-box">
                                <div class="label">Email (Login):</div>
                                <div class="value">%s</div>
                                
                                <div class="label" style="margin-top: 12px;">Temporary Password:</div>
                                <div class="value">%s</div>
                            </div>
                            
                            <div class="warning">
                                ⚠️ <strong>Important:</strong> Please change your password immediately after your first login. Do not share your credentials with anyone.
                            </div>
                            
                            <p><strong>What you can do:</strong></p>
                            <ul>
                                <li>Request blood for your patients</li>
                                <li>Track request status in real-time</li>
                                <li>View available blood types and components</li>
                                <li>Access your request history</li>
                            </ul>
                            
                            <p style="margin-top: 20px; color: #666;">If you have any questions or need assistance, please contact the Blood Bank staff at the hospital.</p>
                        </div>
                        
                        <div class="footer">
                            <p>© 2026 CNPH Blood Bank · Camarines Norte Provincial Hospital<br>
                            24/7 Blood Bank Services</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(hospitalName, email, tempPassword);

            Map<String, Object> body = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "Blood+ System"),
                "to",          new Object[]{ Map.of("email", email) },
                "subject",     "🩸 Blood+ Hospital Portal — Login Credentials",
                "htmlContent", htmlContent
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("[EmailService] Hospital credentials email sent to: " + email + " | Status: " + response.getStatusCode());
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send hospital email: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Sending Email to Blood Request
    public void sendRequestConfirmationEmail(String to, String requesterName, String referenceNumber, 
                                            String bloodType, Integer units) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: #C41E3A; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                        .header h1 { margin: 0; }
                        .ref-box { background: #f0f8ff; border-left: 4px solid #0066CC; padding: 15px; margin: 15px 0; }
                        .ref-label { font-weight: bold; color: #333; font-size: 12px; text-transform: uppercase; }
                        .ref-number { font-family: 'Courier New', monospace; font-size: 24px; font-weight: bold; color: #0066CC; margin-top: 8px; }
                        .details { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; }
                        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                        .detail-row:last-child { border-bottom: none; }
                        .detail-label { font-weight: 600; color: #666; }
                        .detail-value { color: #333; }
                        .status-badge { display: inline-block; background: #fff3cd; color: #856404; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                        .footer { border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🩸 Blood Request Submitted</h1>
                        </div>
                        
                        <div style="padding: 20px 0;">
                            <p>Dear <strong>%s</strong>,</p>
                            
                            <p>Your blood request has been successfully submitted to the Blood Bank. Our team will review and process your request shortly.</p>
                            
                            <div class="ref-box">
                                <div class="ref-label">Your Request Reference Number:</div>
                                <div class="ref-number">%s</div>
                                <p style="margin: 12px 0 0 0; font-size: 12px; color: #666;">Keep this number for your records and use it to track your request status.</p>
                            </div>
                            
                            <div class="details">
                                <div class="detail-row">
                                    <span class="detail-label">Blood Type Required:</span>
                                    <span class="detail-value"><strong>%s</strong></span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Units Requested:</span>
                                    <span class="detail-value"><strong>%d unit(s)</strong></span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Current Status:</span>
                                    <span><span class="status-badge">PENDING REVIEW</span></span>
                                </div>
                            </div>
                            
                            <p style="margin-top: 20px; line-height: 1.6;">
                                <strong>What happens next?</strong><br>
                                1. Our blood bank staff will review your request<br>
                                2. We will verify blood availability<br>
                                3. You will be notified once the blood is ready for pickup/delivery<br>
                                <br>
                                For urgent requests, please contact the blood bank directly at the hospital.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>© 2026 CNPH Blood Bank · Camarines Norte Provincial Hospital<br>
                            24/7 Blood Bank Services</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(requesterName, referenceNumber, bloodType, units);

            Map<String, Object> body = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "Blood+ System"),
                "to",          new Object[]{ Map.of("email", to) },
                "subject",     "🩸 Blood Request Confirmation — Ref: " + referenceNumber,
                "htmlContent", htmlContent
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("[BloodRequest] Confirmation email sent to: " + to + " | Ref: " + referenceNumber);
        } catch (Exception e) {
            System.err.println("[BloodRequest] Email failed: " + e.getMessage());
        }
    }

    // When Approve
    public void sendRequestApprovalEmail(String to, String requesterName, String referenceNumber,
                                        String bloodType, Integer units) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: #22863A; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                        .header h1 { margin: 0; }
                        .success-box { background: #f0fdf4; border-left: 4px solid #22863A; padding: 15px; margin: 15px 0; }
                        .ref-number { font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; color: #22863A; margin: 8px 0; }
                        .details { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; }
                        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                        .detail-row:last-child { border-bottom: none; }
                        .detail-label { font-weight: 600; color: #666; }
                        .detail-value { color: #333; font-weight: 600; }
                        .status-badge { display: inline-block; background: #d4edda; color: #155724; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                        .next-steps { background: #e7f3ff; border-left: 4px solid #0066CC; padding: 15px; margin: 15px 0; }
                        .footer { border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✓ Request Approved</h1>
                        </div>
                        
                        <div style="padding: 20px 0;">
                            <p>Dear <strong>%s</strong>,</p>
                            
                            <p>Great news! Your blood request has been <strong>approved</strong> by the Blood Bank and we are now allocating the blood bags for you.</p>
                            
                            <div class="success-box">
                                <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600;">Reference Number</p>
                                <div class="ref-number">%s</div>
                            </div>
                            
                            <div class="details">
                                <div class="detail-row">
                                    <span class="detail-label">Blood Type:</span>
                                    <span class="detail-value">%s</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Units Approved:</span>
                                    <span class="detail-value">%d unit(s)</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Status:</span>
                                    <span><span class="status-badge">APPROVED</span></span>
                                </div>
                            </div>
                            
                            <div class="next-steps">
                                <p style="margin: 0 0 10px 0; font-weight: 600; color: #0066CC;">Next Steps:</p>
                                <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                                    <li>Blood bags are being prepared and verified</li>
                                    <li>You will receive another notification when blood is ready for pickup</li>
                                    <li>Please arrange collection at the scheduled time</li>
                                    <li>Contact the blood bank immediately for any urgent updates</li>
                                </ul>
                            </div>
                            
                            <p style="margin-top: 20px; color: #666; font-size: 14px;">
                                If you have any questions or need assistance, please contact the blood bank staff at the hospital.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>© 2026 CNPH Blood Bank · Camarines Norte Provincial Hospital<br>
                            24/7 Blood Bank Services</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(requesterName, referenceNumber, bloodType, units);

            Map<String, Object> body = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "Blood+ System"),
                "to",          new Object[]{ Map.of("email", to) },
                "subject",     "✓ Your Blood Request Has Been Approved — Ref: " + referenceNumber,
                "htmlContent", htmlContent
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("[BloodRequest] Approval email sent to: " + to + " | Ref: " + referenceNumber);
        } catch (Exception e) {
            System.err.println("[BloodRequest] Approval email failed: " + e.getMessage());
        }
    }

    // When Ready for Release
    public void sendRequestReadyEmail(String to, String requesterName, String referenceNumber,
                                    String bloodType, Integer units) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f5f5f5; }
                        .container { max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: #FF6B35; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                        .header h1 { margin: 0; }
                        .alert-box { background: #fff8e1; border-left: 4px solid #FF6B35; padding: 15px; margin: 15px 0; border-radius: 4px; }
                        .alert-icon { font-size: 24px; margin-right: 8px; }
                        .ref-number { font-family: 'Courier New', monospace; font-size: 20px; font-weight: bold; color: #FF6B35; margin: 8px 0; }
                        .details { background: #f9f9f9; padding: 15px; border-radius: 4px; margin: 15px 0; }
                        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
                        .detail-row:last-child { border-bottom: none; }
                        .detail-label { font-weight: 600; color: #666; }
                        .detail-value { color: #333; font-weight: 600; }
                        .status-badge { display: inline-block; background: #ffe6cc; color: #c23a0f; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                        .action-box { background: #fff3cd; border: 2px solid #FF6B35; padding: 20px; margin: 20px 0; border-radius: 4px; text-align: center; }
                        .action-box h3 { margin: 0 0 10px 0; color: #c23a0f; }
                        .action-box p { margin: 5px 0; font-size: 14px; line-height: 1.6; }
                        .urgency { color: #c23a0f; font-weight: bold; }
                        .footer { border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🩸 Your Blood Is Ready!</h1>
                        </div>
                        
                        <div style="padding: 20px 0;">
                            <p>Dear <strong>%s</strong>,</p>
                            
                            <p>Excellent news! Your requested blood bags have been prepared and are <strong>ready for pickup</strong>. Please come to the blood bank at your earliest convenience to collect them.</p>
                            
                            <div class="alert-box">
                                <span class="alert-icon">⏰</span>
                                <span>Your blood bags are reserved and waiting for collection. Please pick them up as soon as possible to ensure freshness.</span>
                            </div>
                            
                            <div style="background: #e3f2fd; border-left: 4px solid #0066CC; padding: 15px; margin: 15px 0; border-radius: 4px;">
                                <p style="margin: 0; font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600;">Your Reference Number</p>
                                <div class="ref-number">%s</div>
                                <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Please provide this number when collecting your blood</p>
                            </div>
                            
                            <div class="details">
                                <div class="detail-row">
                                    <span class="detail-label">Blood Type:</span>
                                    <span class="detail-value">%s</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Units Ready:</span>
                                    <span class="detail-value">%d unit(s)</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Status:</span>
                                    <span><span class="status-badge">READY FOR PICKUP</span></span>
                                </div>
                            </div>
                            
                            <div class="action-box">
                                <h3>⚡ Action Required</h3>
                                <p><strong>Please collect your blood bags from the Blood Bank immediately.</strong></p>
                                <p>Location: Blood Bank Counter · CNPH Main Hospital Building</p>
                                <p style="margin-top: 15px;"><span class="urgency">⚠️ Blood bags have limited shelf life.</span><br>Delays in collection may affect blood viability.</p>
                            </div>
                            
                            <div style="background: #f0f8ff; border-left: 4px solid #0066CC; padding: 15px; margin: 15px 0; border-radius: 4px;">
                                <p style="margin: 0; font-weight: 600; color: #0066CC;">Important Information:</p>
                                <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px;">
                                    <li>Bring your reference number for verification</li>
                                    <li>Check bag labels and expiration dates</li>
                                    <li>Store blood at appropriate temperature during transport</li>
                                    <li>Do not delay collection beyond 24 hours</li>
                                </ul>
                            </div>
                            
                            <p style="margin-top: 20px; color: #666; font-size: 13px;">
                                For urgent inquiries or if you cannot collect within 24 hours, please contact the blood bank immediately at the hospital.
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>© 2026 CNPH Blood Bank · Camarines Norte Provincial Hospital<br>
                            24/7 Blood Bank Services</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(requesterName, referenceNumber, bloodType, units);

            Map<String, Object> body = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "Blood+ System"),
                "to",          new Object[]{ Map.of("email", to) },
                "subject",     "🩸 Your Blood Is Ready for Pickup — Ref: " + referenceNumber,
                "htmlContent", htmlContent
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            System.out.println("[BloodRequest] Ready notification email sent to: " + to + " | Ref: " + referenceNumber);
        } catch (Exception e) {
            System.err.println("[BloodRequest] Ready email failed: " + e.getMessage());
        }
    }

    public void sendApprovalRemarksConfirmationEmail(BloodBagRequest request) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);

            String baseUrl = frontendBaseUrl != null ? frontendBaseUrl.trim() : "";
            if (baseUrl.endsWith("/")) {
                baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
            }

            String token = request.getConfirmationToken();
            String acceptUrl = baseUrl + "/blood-request-confirmation.html?token=" + token + "&action=accept";
            String rejectUrl = baseUrl + "/blood-request-confirmation.html?token=" + token + "&action=reject";

            String alternativeComponentHtml =
                request.getAlternativeComponentSuggestion() != null
                    ? """
                        <div class="detail-row">
                            <span class="detail-label">Alternative Component:</span>
                            <span class="detail-value">%s</span>
                        </div>
                      """.formatted(request.getAlternativeComponentSuggestion())
                    : "";

            String htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background: #f5f5f5; }
                        .container { max-width: 640px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                        .header { background: #C41E3A; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
                        .header h1 { margin: 0; }
                        .details { background: #f9f9f9; padding: 18px; border-radius: 6px; margin: 18px 0; }
                        .detail-row { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid #eee; }
                        .detail-row:last-child { border-bottom: none; }
                        .detail-label { font-weight: 600; color: #666; }
                        .detail-value { color: #333; text-align: right; }
                        .remarks-box { background: #fff8e1; border-left: 4px solid #FF9800; padding: 14px; margin: 18px 0; border-radius: 4px; }
                        .actions { display: flex; gap: 12px; margin-top: 24px; }
                        .btn { display: inline-block; padding: 12px 18px; border-radius: 6px; font-weight: 700; text-decoration: none; text-align: center; }
                        .btn-accept { background: #22863A; color: white; }
                        .btn-reject { background: #C41E3A; color: white; }
                        .footer { border-top: 1px solid #eee; margin-top: 30px; padding-top: 15px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Blood Request Confirmation Needed</h1>
                        </div>
                        <div style="padding: 20px 0;">
                            <p>Hello <strong>%s</strong>,</p>
                            <p>Your blood request needs confirmation before the blood bank can proceed.</p>

                            <div class="details">
                                <div class="detail-row">
                                    <span class="detail-label">Reference Number:</span>
                                    <span class="detail-value">%s</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Requested Units:</span>
                                    <span class="detail-value">%d unit(s)</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">Available / Approved Units:</span>
                                    <span class="detail-value">%d unit(s)</span>
                                </div>
                                %s
                            </div>

                            <div class="remarks-box">
                                <strong>Remarks:</strong><br>
                                %s
                            </div>

                            <p>Please choose one:</p>

                            <div class="actions">
                                <a class="btn btn-accept" href="%s">Proceed / Accept</a>
                                <a class="btn btn-reject" href="%s">Reject / Cancel</a>
                            </div>

                            <p style="margin-top: 20px; color: #666;">This confirmation link will expire in 24 hours.</p>
                        </div>
                        <div class="footer">
                            <p>CNPH Blood Bank · Camarines Norte Provincial Hospital</p>
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(
                    request.getRequesterName(),
                    request.getReferenceNumber(),
                    request.getNumberOfUnits(),
                    request.getApprovedUnits(),
                    alternativeComponentHtml,
                    request.getApprovalRemarks(),
                    acceptUrl,
                    rejectUrl
                );

            String textContent =
                "Hello " + request.getRequesterName() + ",\n\n" +
                "Your blood request needs confirmation.\n\n" +
                "Reference Number: " + request.getReferenceNumber() + "\n" +
                "Requested Units: " + request.getNumberOfUnits() + "\n" +
                "Available/Approved Units: " + request.getApprovedUnits() + "\n" +
                "Remarks: " + request.getApprovalRemarks() + "\n" +
                (request.getAlternativeComponentSuggestion() != null
                    ? "Alternative Component: " + request.getAlternativeComponentSuggestion() + "\n"
                    : "") +
                "\nProceed:\n" + acceptUrl + "\n\n" +
                "Reject:\n" + rejectUrl + "\n\n" +
                "This confirmation link will expire in 24 hours.";

            Map<String, Object> body = Map.of(
                "sender",      Map.of("email", fromEmail, "name", "Blood+ System"),
                "to",          new Object[]{ Map.of("email", request.getRequesterEmail()) },
                "subject",     "Blood Request Confirmation Needed - " + request.getReferenceNumber(),
                "htmlContent", htmlContent,
                "textContent", textContent
            );

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
            System.out.println("[BloodRequest] Remarks confirmation email sent to: "
                + request.getRequesterEmail() + " | Ref: " + request.getReferenceNumber()
                + " | Status: " + response.getStatusCode());
        } catch (Exception e) {
            throw new RuntimeException("Failed to send approval confirmation email: " + e.getMessage(), e);
        }
    }

    private String normalizedFrontendBaseUrl() {
        String baseUrl = frontendBaseUrl != null ? frontendBaseUrl.trim() : "http://localhost:8080";
        if (baseUrl.endsWith("/")) {
            return baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl;
    }
}
