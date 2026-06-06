package com.hospital.blood_plus.service;

import java.util.ArrayList;
import java.util.List;

public class DuplicateSerialException extends RuntimeException {
    private final List<String> duplicateSerials;

    public DuplicateSerialException(List<String> duplicateSerials) {
        super("Some serial numbers already exist.");
        this.duplicateSerials = duplicateSerials != null ? duplicateSerials : new ArrayList<>();
    }

    public List<String> getDuplicateSerials() {
        return duplicateSerials;
    }
}

