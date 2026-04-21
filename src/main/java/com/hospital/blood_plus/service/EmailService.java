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
}