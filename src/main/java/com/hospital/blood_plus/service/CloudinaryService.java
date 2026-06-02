package com.hospital.blood_plus.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(
        @Value("${cloudinary.cloud-name}") String cloudName,
        @Value("${cloudinary.api-key}")    String apiKey,
        @Value("${cloudinary.api-secret}") String apiSecret
    ) {
        String normalizedCloudName = normalizeConfigValue("cloudinary.cloud-name", cloudName);
        String normalizedApiKey = normalizeConfigValue("cloudinary.api-key", apiKey);
        String normalizedApiSecret = normalizeConfigValue("cloudinary.api-secret", apiSecret);

        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
            "cloud_name", normalizedCloudName,
            "api_key",    normalizedApiKey,
            "api_secret", normalizedApiSecret
        ));
    }

    private String normalizeConfigValue(String propertyName, String value) {
        if (value == null) {
            throw new IllegalStateException("Missing required Cloudinary config: " + propertyName);
        }

        String normalized = value.trim();
        if ((normalized.startsWith("\"") && normalized.endsWith("\""))
            || (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.substring(1, normalized.length() - 1).trim();
        }

        if (normalized.isEmpty()) {
            throw new IllegalStateException("Blank Cloudinary config: " + propertyName);
        }

        return normalized;
    }

    /**
     * Uploads a doctor's note file to Cloudinary.
     * Returns a String[2]: [0] = secure_url, [1] = public_id (key)
     */
    public String[] uploadDoctorsNote(MultipartFile file) throws IOException {
        System.out.println("=== CLOUDINARY UPLOAD START ===");
        System.out.println("File name: " + file.getOriginalFilename());
        System.out.println("File size: " + file.getSize());
        System.out.println("File type: " + file.getContentType());

        try {
            String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "upload";
            String sanitizedName = originalName.replaceAll("[^A-Za-z0-9._-]", "_");
            String suffix = sanitizedName.lastIndexOf('.') >= 0
                    ? sanitizedName.substring(sanitizedName.lastIndexOf('.'))
                    : ".bin";
            Path tempFilePath = Files.createTempFile("blood-plus-upload-", suffix);
            Map uploadResult;
            try {
                file.transferTo(tempFilePath);
                File tempFile = tempFilePath.toFile();
                uploadResult = cloudinary.uploader().upload(
                    tempFile,
                    ObjectUtils.asMap(
                        "folder",          "blood_plus/doctors_notes",
                        "resource_type",   "auto",
                        "use_filename",    true,
                        "unique_filename", true
                    )
                );
            } finally {
                Files.deleteIfExists(tempFilePath);
            }

            System.out.println("=== CLOUDINARY UPLOAD SUCCESS ===");
            System.out.println("URL: " + uploadResult.get("secure_url"));
            System.out.println("Key: " + uploadResult.get("public_id"));

            return new String[]{
                (String) uploadResult.get("secure_url"),
                (String) uploadResult.get("public_id")
            };

        } catch (Exception e) {
            System.out.println("=== CLOUDINARY UPLOAD FAILED ===");
            System.out.println(e.getClass().getName() + ": " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    /**
     * Deletes a file from Cloudinary by its public_id (key).
     * Call this when a request is cancelled or rejected if you want cleanup.
     */
    public void deleteDoctorsNote(String publicId) throws IOException {
        cloudinary.uploader().destroy(
            publicId,
            ObjectUtils.asMap("resource_type", "auto")
        );
    }
}
