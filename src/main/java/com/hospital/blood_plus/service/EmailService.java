package com.hospital.blood_plus.service;

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

    public void sendStaffCredentialsEmail(String to, String firstName,
                                           String username, String tempPassword) {
        try {
            String url = "https://api.brevo.com/v3/smtp/email";
 
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", apiKey);
 
            String body =
                "Hi " + firstName + ",\n\n" +
                "Your BloodPlus staff account has been created.\n\n" +
                "Login details:\n" +
                "  Email:    " + to + "\n" +
                "  Username: " + username + "\n" +
                "  Password: " + tempPassword + "\n\n" +
                "Please log in and change your password as soon as possible.\n\n" +
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
}