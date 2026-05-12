-- Manual schema update for the approve-with-remarks email confirmation flow.
-- Run this once in environments that are not relying on Hibernate schema updates.

ALTER TABLE blood_bag_requests
    ADD COLUMN approved_units INT NULL,
    ADD COLUMN approval_remarks VARCHAR(1000) NULL,
    ADD COLUMN alternative_component_suggestion VARCHAR(500) NULL,
    ADD COLUMN patient_accepted_remarks BIT NULL,
    ADD COLUMN patient_responded_at DATETIME NULL,
    ADD COLUMN confirmation_token VARCHAR(255) NULL,
    ADD COLUMN confirmation_token_expires_at DATETIME NULL,
    ADD COLUMN confirmation_email_sent_at DATETIME NULL;

CREATE INDEX idx_blood_bag_requests_confirmation_token
    ON blood_bag_requests (confirmation_token);

ALTER TABLE request_status_logs
    MODIFY COLUMN changed_by BIGINT NULL;
