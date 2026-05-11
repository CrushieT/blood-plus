# BloodPlus

BloodPlus is a full-stack blood bank workflow system built for hospital operations. It manages blood inventory, patient blood requests, hospital account workflows, and admin/staff review pipelines in a single application.

The project is designed around a real operational use case rather than a toy CRUD demo. It combines backend API design, role-based security, persistence modeling, document handling, scheduled automation, and a multi-surface frontend experience.

## Project Overview

BloodPlus supports three primary user experiences:

| User Type | Main Capabilities |
| --- | --- |
| Public requester | Submit a blood request, upload doctor's note, track request by reference number |
| Hospital account | View blood availability, submit requests, monitor request history, manage hospital profile |
| Admin / staff | Manage inventory, process request lifecycle, review analytics, manage hospitals and staff, export logs |

This makes the project a strong demonstration of:

- Full-stack application architecture
- Domain-driven workflow design
- Secure role-based access control
- Real-world auditability and lifecycle tracking
- External service integration for file storage and email notifications

## Key Features

### Blood Request Management

- Multi-step public blood request form
- Hospital-specific request submission flow
- Reference-number-based request tracking
- Support for anonymous and hospital-linked requests
- Detailed clinical, transfusion, and indication data capture

### Inventory and Fulfillment

- Blood bag intake and inventory management
- Availability views by blood type and component
- Request approval, rejection, allocation, reallocation, and release workflow
- Scheduled expiration handling for expired and open-system bags

### Operations and Oversight

- Role-based dashboards for hospitals and admins
- Audit trails through request status logs and fulfillment records
- Analytics for urgency, category, component, inventory, and hospital activity
- Exportable status and fulfillment logs

### Integrations

- Cloudinary for doctor's note uploads
- Brevo email API for verification and request notifications
- Tesseract.js OCR support for scanning request forms and auto-filling fields

## Architecture

The application follows a layered Spring Boot architecture:

- `controller`
  - REST endpoints for auth, public requests, hospital APIs, and admin APIs
- `service`
  - Business logic for requests, inventory, analytics, profiles, logging, and integrations
- `repository`
  - JPA repositories and custom queries for filtering, metrics, and exports
- `model`
  - Entities for users, blood bags, requests, logs, dispatches, and fulfillments
- `static`
  - Role-specific frontend pages built with vanilla HTML, CSS, and JavaScript

### Core Domain Models

- `AppUser`
  - Roles: `ADMIN`, `STAFF`, `HOSPITAL`
- `BloodBag`
  - Tracks unit identity, component, blood type, status, source, volume, expiry, and dispatch history
- `BloodBagRequest`
  - Tracks patient information, urgency, request type, category, requester type, status, clinical context, and attached documents
- `RequestStatusLog`
  - Captures status transitions for auditability
- `RequestFulfillment`
  - Captures request-to-bag fulfillment records
- `HospitalProfile` and `StaffProfile`
  - Extend user accounts with operational profile data

## Request Lifecycle

The request lifecycle is modeled explicitly in the backend:

`PENDING -> APPROVED -> ALLOCATED -> READY_FOR_RELEASE -> RELEASED`

Alternative terminal states:

- `REJECTED`
- `CANCELLED`

This lifecycle is handled primarily in `BloodBagRequestService`, with audit logging persisted through `RequestStatusLogService`.

## Security

BloodPlus uses Spring Security with session-based authentication.

- Public routes are available for login, public request submission, and request tracking
- Hospital routes are restricted to `ROLE_HOSPITAL`
- Admin routes are restricted to `ROLE_ADMIN` and `ROLE_STAFF`
- Logout invalidates session state and clears `JSESSIONID`
- API routes are designed for authenticated cookie-backed frontend requests

## Tech Stack

| Layer | Technology |
| --- | --- |
| Backend | Java 21, Spring Boot 4.0.5, Spring MVC, Spring Data JPA, Spring Security |
| Database | MySQL |
| Frontend | HTML, CSS, Vanilla JavaScript |
| File Storage | Cloudinary |
| Email | Brevo API |
| OCR | Tesseract.js |
| Build | Maven |
| CI | GitHub Actions |

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
`-- REPO_SUMMARY.md
```

## Running Locally

### Prerequisites

- Java 21
- Maven 3.9+
- MySQL 8+

### 1. Create the database

Create a MySQL database for the application, for example:

```sql
CREATE DATABASE blood_plus;
```

### 2. Configure environment variables

This project supports `.env` loading through `java-dotenv`.

Create a `.env` file in the project root:

```env
MYSQLHOST=localhost
MYSQLPORT=3306
MYSQL_DATABASE=blood_plus
MYSQLUSER=root
MYSQLPASSWORD=your_password

BREVO_API=your_brevo_api_key
EMAIL=your_sender_email

CLOUDINARY-CLOUD-NAME=your_cloud_name
CLOUDINARY-API-KEY=your_api_key
CLOUDINARY-API-SECRET=your_api_secret

PORT=8080
```

### 3. Start the application

```bash
mvn spring-boot:run
```

On Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

### 4. Open the application

Useful entry points:

- Public request portal: `http://localhost:8080/blood-request.html`
- Login page: `http://localhost:8080/admin-login.html`
- First-run admin setup: `http://localhost:8080/admin-setup.html`

## Testing

Run tests with:

```bash
mvn test
```

Current automated coverage is minimal, but the application successfully boots through the Spring test context and includes CI workflows for package/build verification.

## API Areas

The backend is organized into four main API groups:

- `/api/auth`
  - Login, session lookup, admin bootstrap, email verification
- `/api/req`
  - Public request submission and request tracking
- `/api/hospital`
  - Hospital request history, availability lookups, profile management
- `/api/admin`
  - Inventory, request lifecycle actions, analytics, hospital/staff management, logs, and exports

## Engineering Highlights

These are the parts of the project that are especially valuable from an employer review perspective:

- Workflow-first design
  - The application models an operational process, not just data forms
- Role separation
  - Different users have dedicated experiences and API scopes
- Auditability
  - Status changes and fulfillments are recorded explicitly
- Operational automation
  - Scheduled expiration tasks reduce manual maintenance
- Integration work
  - Handles file uploads, email notifications, and OCR-assisted input
- Full ownership across layers
  - Backend APIs, persistence, security, dashboards, and forms live in one repo

## Current State and Improvement Opportunities

The project is already substantial and functional, but there are a few areas that could be improved further:

- Add broader automated test coverage for services and controllers
- Break large frontend scripts into smaller modules
- Introduce API documentation such as OpenAPI/Swagger
- Add screenshots or a short demo walkthrough for portfolio presentation
- Improve deployment and environment setup documentation

## Additional Technical Context

For a deeper handoff-oriented summary of the repository, see:

- [REPO_SUMMARY.md](./REPO_SUMMARY.md)

## Why This Project Matters

BloodPlus demonstrates more than framework familiarity. It shows the ability to take a domain problem, translate it into a secure and auditable software workflow, and deliver a working application across backend, database, integration, and frontend layers.

That combination makes it a strong portfolio piece for roles involving backend engineering, full-stack development, internal tools, or operations-focused product systems.
