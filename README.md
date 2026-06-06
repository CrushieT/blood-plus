# BloodPlus – Blood Bank Operations System

BloodPlus is a full-stack blood bank management system built with **Java, Spring Boot, Spring Security, MySQL, and vanilla JavaScript**. It was developed to support hospital and blood bank workflows such as blood request intake, inventory monitoring, request approval, blood allocation, release tracking, audit logging, OCR-assisted intake, and reporting.

This project demonstrates backend development skills in **REST API design, authentication and authorization, relational database modeling, workflow management, file upload handling, email notifications, deployment, and production-style system organization**.

---

## Why This Project Matters

BloodPlus was designed around real blood bank workflows, including request approval, allocation, release, and traceability, making it more than a basic CRUD application.

---

## Project Highlights

* Built a complete **Spring Boot blood bank operations system** with multiple user roles.
* Implemented **session-based authentication** and role-based access for Admin, Staff, Hospital, and request-code users.
* Designed request workflows covering **pending, approval, allocation, ready for release, release, rejection, and cancellation**.
* Created blood inventory features with **status tracking, filtering, expiry monitoring, and availability summaries**.
* Integrated **Cloudinary** for document storage and **Brevo** for email notifications.
* Added **OCR-assisted processing** using OCR.Space and OCR-assisted frontend review flow for faster form and stock intake.
* Deployed and tested the system using **Railway** with MySQL.

---

## Tech Stack

| Area           | Technologies                                                       |
| -------------- | ------------------------------------------------------------------ |
| Backend        | Java 21, Spring Boot, Spring MVC, Spring Security, Spring Data JPA |
| Database       | MySQL                                                              |
| Frontend       | HTML, CSS, Vanilla JavaScript                                      |
| Authentication | Spring Security, Session-Based Authentication                      |
| File Storage   | Cloudinary                                                         |
| Email Service  | Brevo                                                              |
| OCR            | OCR.Space API, Tesseract-based frontend OCR flow                   |
| Build Tool     | Maven                                                              |
| Deployment     | Railway                                                            |

---

## System Architecture

BloodPlus follows a **layered monolithic architecture**:

```text
Browser / Static Frontend
        ↓
Spring Boot Controllers
        ↓
Service Layer
        ↓
Repository Layer
        ↓
MySQL Database
```

The system separates responsibilities through controllers, services, repositories, DTOs, and entity models. This keeps business logic organized and makes the request, inventory, analytics, and account-management workflows easier to maintain.

---

## Core Features

### Role-Based Access and Account Management

BloodPlus supports multiple user contexts:

| User Type                                 | Capabilities                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Admin                                     | Manage blood inventory, requests, hospitals, staff, logs, analytics, and reports       |
| Staff with Dashboard Access               | Access operational dashboard features based on assigned permissions                    |
| Staff / Department User with Request Code | Submit authorized blood requests without dashboard login                               |
| Hospital Account                          | Submit hospital requests, view availability, track request history, and manage profile |

---

### Blood Request Workflow

The system manages blood requests from intake to release:

```text
Pending → Approved / Needs Confirmation → Allocated → Ready for Release → Released
```

Supported workflow actions include:

* Submit blood requests
* Upload supporting physician documents
* Review and approve requests
* Add approval remarks
* Allocate compatible blood bags
* Reallocate blood bags when needed
* Mark requests ready for release
* Release blood bags
* Cancel or reject requests
* Track request status logs

This demonstrates business workflow handling beyond basic CRUD operations.

---

### Blood Inventory Management

BloodPlus includes inventory tools for blood bank operations:

* Blood bag encoding
* Blood type and component tracking
* Availability monitoring
* Bag-level status management
* Expiry monitoring
* Filtering and sorting
* Discard workflow
* Protected deletion behavior
* Inventory summaries and reports

---

### OCR-Assisted Processing

BloodPlus includes OCR-assisted workflows to reduce manual encoding:

* OCR-assisted request-form processing
* OCR-assisted blood stock intake
* Manual review before saving extracted data
* Warning and confidence handling for extracted fields

The OCR feature is implemented as an assistance layer, not an automatic final write operation, so users can review extracted data before submission.

---

### Analytics, Reports, and Audit Logs

The system includes operational reporting features such as:

* Dashboard summaries
* Blood availability metrics
* Request statistics
* Blood inventory summaries
* Request status logs
* Exportable operational records
* Audit-oriented workflow tracking

---

## Screenshots

### Admin Dashboard

Shows the main operational dashboard with summaries, navigation, and blood bank monitoring.

![Admin Dashboard](docs/img/system_img/Admin%20Dashboard.png)

---

### Blood Bank Inventory

Shows grouped blood stock visibility, inventory summaries, and operational stock monitoring.

![Blood Bank Inventory](docs/img/system_img/Blood%20Bank.png)

---

### OCR-Assisted Intake

Shows OCR-assisted stock or form intake where extracted data is reviewed before saving.

![OCR Assisted Intake](docs/img/system_img/OCR%20Add%20Stock.png)

---

### Hospital Dashboard

Shows the separate hospital-side dashboard for institutional users.

![Hospital Dashboard](docs/img/system_img/Hospital%20Dashboard.png)

---

### Request Workflow – Pending

Shows blood requests waiting for review.

![Blood Request Pending](docs/img/system_img/Blood%20Request%20Pending.png)

---

### Request Workflow – Allocated

Shows requests with allocated blood bags before release.

![Blood Request Allocated](docs/img/system_img/Blood%20Request%20Allocated.png)

---

### Request Workflow – Released

Shows completed request fulfillment after blood release.

![Blood Request Released](docs/img/system_img/Blood%20Request%20Released.png)

---

### Request Logs

Shows request history and traceability logs for audit review.

![Request Logs](docs/img/system_img/Request%20Logs.png)

---

## Documentation

Full project documentation and thesis-related system evidence:

[BloodPlus Documentation Site](https://mc-ccs-batch-25-26.github.io/documentation-repository-ths-25-26-but-it-works-we-swear/)

---

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
|-- pom.xml
`-- README.md
```

---

## Installation Guide

### Prerequisites

Install the following:

* Java 21
* Maven 3.9+
* MySQL 8+
* Cloudinary account
* Brevo account
* Optional: OCR.Space API key

---

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd blood-plus
```

---

### 2. Create the Database

```sql
CREATE DATABASE bloodplus;
```

---

### 3. Configure Environment Variables

Create a `.env` file in the project root.

```env
# Mail / Notifications
EMAIL=your_sender_email@example.com
BREVO_API=your_brevo_api_key

# Database
MYSQLHOST=localhost
MYSQLPORT=3306
MYSQL_DATABASE=bloodplus
MYSQLUSER=root
MYSQLPASSWORD=your_mysql_password

# Cloudinary
CLOUDINARY-CLOUD-NAME=your_cloudinary_cloud_name
CLOUDINARY-API-KEY=your_cloudinary_api_key
CLOUDINARY-API-SECRET=your_cloudinary_api_secret

# OCR
OCR_SPACE_API_KEY=your_ocr_space_api_key

# Runtime
PORT=8080
FRONTEND_BASE_URL=http://localhost:8080

# Optional
# JAVA_TOOL_OPTIONS=-Xms256m -Xmx512m -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError -Duser.timezone=Asia/Manila
# TZ=Asia/Manila
```

> Do not commit real `.env` credentials to GitHub.

---

### 4. Build the Project

```bash
mvn clean compile
```

---

### 5. Run the Application

```bash
mvn spring-boot:run
```

---

### 6. Open the System

After startup, open:

```text
http://localhost:8080/admin-login.html
```

Other available routes:

```text
http://localhost:8080/admin-setup.html
http://localhost:8080/blood-request.html
```

---

## First-Time Setup

For a fresh local environment:

1. Start the application.
2. Open `http://localhost:8080/admin-setup.html`.
3. Create the initial admin account.
4. Log in through `http://localhost:8080/admin-login.html`.
5. Add staff and hospital accounts from the admin dashboard.

---

## Main API Areas

| Base Path       | Purpose                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `/api/auth`     | Authentication, session lookup, admin bootstrap, and verification                                 |
| `/api/req`      | Public or request-code blood request submission and tracking                                      |
| `/api/hospital` | Hospital dashboard, request history, profile, and availability                                    |
| `/api/admin`    | Blood bank operations, request lifecycle actions, analytics, logs, staff, and hospital management |

---

## Security Notes

* Uses session-based authentication through Spring Security.
* Protects admin, staff, and hospital routes.
* Uses role-based access control for dashboard workflows.
* Supports backend rate limiting for login and registration endpoints.
* Stores sensitive credentials in environment variables.
* Sensitive information should never be committed to the repository.

---

## Operational Notes

* Uploaded documents are stored through Cloudinary.
* Email notifications are sent through Brevo.
* OCR features require valid OCR configuration.
* Blood bag and request workflows include audit and status tracking.
* The system is designed around real blood bank workflow transitions, not only CRUD screens.

---

## Troubleshooting

### Application does not start

Check the following:

* Java 21 is installed.
* MySQL is running.
* The database exists.
* `.env` exists in the project root.
* Required environment variables are configured.

### Database connection fails

Verify:

* `MYSQLHOST`
* `MYSQLPORT`
* `MYSQL_DATABASE`
* `MYSQLUSER`
* `MYSQLPASSWORD`

### Emails are not sending

Verify:

* `BREVO_API`
* `EMAIL`
* Brevo sender configuration

### Uploads are failing

Verify:

* Cloudinary credentials
* Upload file size limits

### OCR features are unavailable

Verify:

* `OCR_SPACE_API_KEY`
* Network access for OCR API requests

---

## Developer

**Aundray Tafalla**

BS Computer Science

Backend Developer / Lead Developer

GitHub: [github.com/CrushieT](https://github.com/CrushieT)

LinkedIn: [linkedin.com/in/aundray-tafalla](https://linkedin.com/in/aundray-tafalla)
