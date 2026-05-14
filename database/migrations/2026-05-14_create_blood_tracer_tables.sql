CREATE TABLE IF NOT EXISTS blood_tracers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT NOT NULL,
    blood_service_facility VARCHAR(200),
    prepared_by VARCHAR(200),
    released_by VARCHAR(200),
    date_released VARCHAR(50),
    time_released VARCHAR(50),
    temperature_prior_transport VARCHAR(100),
    transported_by VARCHAR(200),
    blood_received_by VARCHAR(200),
    date_received VARCHAR(50),
    time_received VARCHAR(50),
    temp_upon_receipt VARCHAR(100),
    transport_box_temp VARCHAR(100),
    transaction_number VARCHAR(100),
    quality_manager VARCHAR(200),
    receiving_officer VARCHAR(200),
    pathologist VARCHAR(200),
    check_sign_hemolysis BOOLEAN,
    check_blood_clots BOOLEAN,
    check_leakage_on_bag BOOLEAN,
    check_bacterial_contamination BOOLEAN,
    check_greenish_discoloration BOOLEAN,
    check_indirect_coolant_contact BOOLEAN,
    check_plasma_not_frozen BOOLEAN,
    check_coolants_sufficient_frozen BOOLEAN,
    rows_json LONGTEXT,
    edited_by BIGINT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT uk_blood_tracer_request UNIQUE (request_id),
    CONSTRAINT fk_blood_tracer_request FOREIGN KEY (request_id) REFERENCES blood_bag_requests (id),
    CONSTRAINT fk_blood_tracer_edited_by FOREIGN KEY (edited_by) REFERENCES users (id)
);

ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS rows_json LONGTEXT;
ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS check_sign_hemolysis BOOLEAN;
ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS check_blood_clots BOOLEAN;
ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS check_leakage_on_bag BOOLEAN;
ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS check_bacterial_contamination BOOLEAN;
ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS check_greenish_discoloration BOOLEAN;
ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS check_indirect_coolant_contact BOOLEAN;
ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS check_plasma_not_frozen BOOLEAN;
ALTER TABLE blood_tracers
    ADD COLUMN IF NOT EXISTS check_coolants_sufficient_frozen BOOLEAN;

DROP TABLE IF EXISTS blood_tracer_items;
