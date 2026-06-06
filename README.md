# BloodPlus

BloodPlus is a full-stack blood bank operations system built for hospital and blood bank workflows. It centralizes blood request intake, blood bag inventory, request approval and release, hospital account management, staff administration, audit logging, and reporting in one Spring Boot application.

## Overview

The system supports three main user groups:

| User Type | Capabilities |
| --- | --- |
| Public requester | Submit a blood request, upload supporting documents, track request status by reference number |
| Hospital account | View blood availability, submit and monitor hospital requests, manage hospital profile |
| Admin / staff | Manage blood bags, process request workflows, review analytics, manage hospitals and staff, export logs |

## Core Features

### Blood Request Workflows
- Public blood request submission
- Hospital blood request submission
- Reference-based request tracking
- Request approval, rejection, allocation, reallocation, and release
- In-house and outpatient request categorization

### Blood Bank Operations
- Blood bag intake and inventory management
- Blood availability monitoring by type and component
- Expiry monitoring and scheduled expiration updates
- Crossmatch-aware workflow protection
- Blood bag discard and protected deletion workflow

### Administration and Audit
- Role-based admin and hospital dashboards
- Staff and hospital management
- Request status logs and fulfillment tracking
- Exportable operational records
- Dashboard filtering, sorting, and reporting tools

### Integrations
- Cloudinary for document uploads
- Brevo for email delivery
- OCR.Space and Tesseract-assisted OCR support for forms and blood bag intake

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Java 21, Spring Boot 4.0.5, Spring MVC, Spring Data JPA, Spring Security |
| Database | MySQL 8+ |
| Frontend | HTML, CSS, Vanilla JavaScript |
| File Storage | Cloudinary |
| Email | Brevo |
| OCR | OCR.Space API, Tesseract-based frontend OCR flow |
| Build Tool | Maven |

## Project Structure

```text
blood-plus/
|-- src/main/java/com/hospital/blood_plus
|   |-- config/
|   |-- controller/
|   |-- dto/
|   |-- model/
|   |-- repository/
|   `-- service/
|-- src/main/resources
|   |-- application.properties
|   `-- static/
|       |-- admin/
|       |-- hospital/
|       |-- css/
|       |-- js/
|       `-- forms/
|-- src/test/java/com/hospital/blood_plus
|-- .github/workflows/
|-- .env
|-- pom.xml
`-- REPO_SUMMARY.md
```

## Installation Guide

### Prerequisites

Install the following first:

- Java 21
- Maven 3.9+
- MySQL 8+
- A Cloudinary account
- A Brevo account
- Optional: OCR.Space API key for OCR features

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd blood-plus
```

### 2. Create the Database

Create the MySQL database used by the system:

```sql
CREATE DATABASE bloodplus;
```

> The local environment in this project currently points to `bloodplus`.

### 3. Configure Environment Variables

This project loads environment variables from a root `.env` file using `java-dotenv`.

Create a `.env` file in the project root and provide the required values:

```env
# --- Mail / Notifications ---
EMAIL=your_sender_email@example.com
BREVO_API=your_brevo_api_key

# --- Database ---
MYSQLHOST=localhost
MYSQLPORT=3306
MYSQL_DATABASE=bloodplus
MYSQLUSER=root
MYSQLPASSWORD=your_mysql_password

# --- Cloudinary ---
CLOUDINARY-CLOUD-NAME=your_cloudinary_cloud_name
CLOUDINARY-API-KEY=your_cloudinary_api_key
CLOUDINARY-API-SECRET=your_cloudinary_api_secret

# --- OCR ---
OCR_SPACE_API_KEY=your_ocr_space_api_key

# --- Optional runtime settings ---
PORT=8080
FRONTEND_BASE_URL=http://localhost:8080

# Optional timezone / JVM tuning examples
# JAVA_TOOL_OPTIONS=-Xms256m -Xmx512m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Duser.timezone=Asia/Manila
# TZ=Asia/Manila
```

### 4. Review Application Configuration

The main runtime configuration is defined in `src/main/resources/application.properties:1`.

Important defaults:

- Database host defaults to `localhost`
- Default server port is `8080`
- Multipart upload limit is `10MB`
- JPA uses `spring.jpa.hibernate.ddl-auto=update`
- Login and register rate limiting are enabled through app properties

### 5. Build the Project

```bash
mvn clean compile
```

### 6. Run the Application

```bash
mvn spring-boot:run
```

If you only want to verify compilation:

```bash
mvn -q -DskipTests compile
```

### 7. Open the System

After startup, open these routes in your browser:

- Admin login: `http://localhost:8080/admin-login.html`
- Public blood request form: `http://localhost:8080/blood-request.html`
- Initial admin setup: `http://localhost:8080/admin-setup.html`

## First-Time Setup

For a fresh local environment:

1. Start the application
2. Open `http://localhost:8080/admin-setup.html`
3. Create the initial admin account
4. Log in through `http://localhost:8080/admin-login.html`
5. Add staff and hospital accounts from the admin dashboard

## Running Tests

Run the test suite with:

```bash
mvn test
```

## Main API Areas

| Base Path | Purpose |
| --- | --- |
| `/api/auth` | Authentication, session lookup, admin bootstrap, verification |
| `/api/req` | Public blood request submission and request tracking |
| `/api/hospital` | Hospital dashboard, request history, profile, and availability |
| `/api/admin` | Blood bank operations, request lifecycle actions, analytics, logs, staff and hospital management |

## Security Notes

- Session-based authentication is used for authenticated areas
- Spring Security protects hospital, admin, and staff routes
- Login and registration endpoints use backend rate limiting
- Sensitive credentials should remain in `.env` and must not be committed

## Operational Notes

- Uploaded documents are stored through Cloudinary
- Email notifications are sent through Brevo
- OCR features depend on valid OCR configuration
- Blood bag and request workflows include audit and status tracking
- The system is designed around real workflow transitions, not just CRUD screens

## Troubleshooting

### Application does not start
- Confirm Java 21 is installed
- Confirm MySQL is running
- Confirm the database in `.env` exists
- Confirm `.env` is in the project root

### Database connection fails
- Verify `MYSQLHOST`, `MYSQLPORT`, `MYSQL_DATABASE`, `MYSQLUSER`, and `MYSQLPASSWORD`
- Confirm MySQL allows the configured user to access the target database

### Emails are not sending
- Verify `BREVO_API` and `EMAIL`
- Confirm the sender email is valid in your Brevo configuration

### Uploads are failing
- Verify Cloudinary credentials
- Confirm uploaded files stay within the configured size limits

### OCR features are unavailable
- Verify `OCR_SPACE_API_KEY`
- Confirm outbound network access is available for OCR requests
