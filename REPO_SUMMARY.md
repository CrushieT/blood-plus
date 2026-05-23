# Blood Plus Repository Summary

Last updated: 2026-05-14
Repository root: `c:\Users\Aundray\Desktop\Project\blood-plus`
Branch: `admin/blood-request`
HEAD commit: `cf05e2b`

## Purpose

`blood-plus` is a Spring Boot + MySQL blood bank management system for Camarines Norte Provincial Hospital (CNPH).

The app supports three user surfaces:

- Public/anonymous requesters: submit blood requests and track by reference number
- Hospital accounts: submit authenticated requests, monitor status/history, view availability
- Admin/staff users: manage inventory, process lifecycle actions, manage hospitals/staff, analytics, logs, and release workflows

## Stack

- Java 21
- Spring Boot 4.0.5 (`spring-boot-starter-parent`)
- Spring Web MVC, Data JPA, Security, Validation
- MySQL
- Maven wrapper (`mvnw`, `mvnw.cmd`)
- Cloudinary (doctor's note uploads)
- Brevo SMTP API (email notifications)
- Vanilla HTML/CSS/JS frontend
- Tesseract.js OCR (public request form scanner)
- GitHub Actions CI workflows

## Current Architecture

### Backend package layout

`src/main/java/com/hospital/blood_plus`

- `controller`
  - `AuthController`
  - `BloodRequestController`
  - `HospitalController`
  - `AdminController`
- `service`
  - request, inventory, analytics, profile, logs, recent activity, tracer, email, expiry services
- `model`
  - user, profile, request, bag, logs, fulfillment, dispatch, tracer entities
- `repository`
  - JPA repositories for all major entities
- `config`
  - security + startup/system checks + redirect filter + dotenv config

### Frontend surfaces

`src/main/resources/static`

- Public
  - `blood-request.html`
  - `blood-request-confirmation.html`
  - `js/blood_request.js`
  - `js/blood_request_confirmation.js`
- Auth/setup
  - `admin-login.html`
  - `admin-setup.html`
  - `js/scripts.js`
  - `js/admin_setup.js`
  - `js/AuthGuard.js`
- Admin/staff
  - `admin/admin_dashboard.html`
  - `admin/js/script.js`
  - `admin/receipt/blood-release-receipt.html`
  - `admin/receipt/blood-request-tracer.html`
- Hospital
  - `hospital/hospital-dashboard.html`
  - `hospital/js/hospital-dashboard.js`

## Core Domain Model

### Users and roles

- `AppUser.Role`: `HOSPITAL`, `ADMIN`, `STAFF`
- `HospitalProfile`: hospital account metadata + contact data
- `StaffProfile`: staff identity, role context, unique code, optional linked dashboard user

### Blood inventory

- `BloodBag.BagStatus`: `AVAILABLE`, `CROSSMATCHED`, `DISPENSED`, `EXPIRED`, `DISCARDED`
- `BloodBag.ComponentType`:
  - `WHOLE_BLOOD`
  - `PRBC`
  - `LEUKOREDUCED_PRBC`
  - `ALIQUOTED_PRBC`
  - `PLATELET_CONCENTRATE`
  - `FRESH_FROZEN_PLASMA`
  - `CRYOPRECIPITATE`
  - `CRYOSUPERNATANT`
- Open-system conversion supported (shortened expiry)

### Blood requests

- `BloodBagRequest.RequestStatus`:
  - `PENDING`
  - `APPROVED`
  - `NEEDS_CONFIRMATION`
  - `ALLOCATED`
  - `READY_FOR_RELEASE`
  - `RELEASED`
  - `REJECTED`
  - `CANCELLED`
- `RequesterType`: `HOSPITAL`, `ANONYMOUS`
- `RequestType`: `STAT`, `ROUTINE`
- `RequestCategory`: `INPATIENT`, `OUTPATIENT`, `HOSPITAL`, `EMERGENCY`
- Tracks:
  - patient demographics/address
  - blood type/component/units/platelet count
  - clinical fields (diagnosis, Hb, Hct)
  - structured transfusion/reaction history
  - indication codes + other-specify map
  - requester contact/email
  - approval remarks + confirmation token flow
  - allocated bag IDs and fulfillment link

### Tracing and audit entities

- `RequestStatusLog` for status transitions
- `RequestFulfillment` for bag-to-request fulfillment records
- `BloodBagDispatch` for disposal/usage events
- `BloodTracer` (one-to-one with request) for release/tracer form persistence

## Main Workflows

### 1. Public request flow

- Submit multipart request (`data` + `doctorsNote`) to `POST /api/req/blood-requests`
- Track status by reference number: `GET /api/req/blood-requests/track/{refNum}`
- OCR-assisted field extraction in public form (`blood_request.js`)

### 2. Hospital account flow

- Submit request: `POST /api/hospital/blood-requests`
- View own request history: `GET /api/hospital/blood-requests`
- View blood type/component availability:
  - `/api/hospital/blood-bank/availability`
  - `/api/hospital/blood-bank/availability/blood-types`
  - `/api/hospital/blood-bank/availability/components`
- Manage profile and password under `/api/hospital/profile`

### 3. Admin/staff lifecycle flow

- Inventory intake/discard/open-system conversion
- Request actions:
  - `approve`
  - `approve-with-remarks` (moves request to `NEEDS_CONFIRMATION` and sends email decision links)
  - `reject`
  - `allocate` / `reallocate`
  - `ready`
  - `release`
  - `cancel`
- Tracer endpoints:
  - `GET /api/admin/blood-requests/{id}/tracer`
  - `PUT /api/admin/blood-requests/{id}/tracer`

### 4. Email confirmation sub-workflow

- Admin uses `approve-with-remarks`
- System sends email with accept/reject links
- Frontend confirmation page posts token decision to:
  - `POST /api/blood-requests/confirm-remarks`
- Accepted: request returns to `APPROVED`
- Rejected: request becomes `REJECTED`

## Security and session model

- Session/cookie auth (not JWT)
- `/api/auth/**` and `/api/req/**` are public
- `/api/hospital/**` restricted to hospital role
- `/api/admin/**` restricted to admin/staff roles
- CSRF ignored for `/api/**`
- Logout endpoint: `POST /api/auth/logout`

## Runtime config and env vars

From `src/main/resources/application.properties`:

- MySQL via `MYSQLHOST`, `MYSQLPORT`, `MYSQL_DATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`
- Server via `PORT`
- Email via `BREVO_API`, `EMAIL`
- Cloudinary via `CLOUDINARY-CLOUD-NAME`, `CLOUDINARY-API-KEY`, `CLOUDINARY-API-SECRET`
- Frontend link generation via `FRONTEND_BASE_URL` (used in confirmation emails)

## Automation and CI

- Scheduler enabled (`@EnableScheduling`)
- `BloodBagExpiryService` runs every 5 minutes:
  - marks expired available bags
  - marks expired open-system bags
- Workflows:
  - `.github/workflows/ci.yml`: builds, verifies, and tests with MySQL service
  - `.github/workflows/ci-full.yml`: package/build + optional quality/security checks

## Tests

- Current test suite: only `BloodPlusApplicationTests.contextLoads()`
- No dedicated service/controller unit tests yet

## Local database migration notes

Local ignored folder `database/migrations` currently contains:

- `2026-05-12_add_blood_request_confirmation_columns.sql`
- `2026-05-13_allow_staff_profiles_without_users.sql`
- `2026-05-14_create_blood_tracer_tables.sql`

These are present on disk but excluded from git tracking by `.gitignore`.

## Historical Changes Timeline (including pre-summary work)

### 2026-04-17 to 2026-04-20

- Initial project cleanup and secret hygiene (`.env` and `target` tracking cleanup)
- Early blood request compatibility and frontend auth guard updates

### 2026-04-21 to 2026-04-24

- Staff page/backend introduced with role authorization adjustments
- CI pipeline introduced and tuned for Java 21
- Hospital frontend and request backend populated
- Blood request UI moved to paged/multi-step behavior
- Blood component enum/frontend handling adjustments

### 2026-04-25 to 2026-05-01

- Hospital profile population/edit/delete work
- Admin dashboard and analytics improvements
- Blood request model expanded for more clinical fields
- Logging frontend added and request list improvements

### 2026-05-02 to 2026-05-06

- Backend log population and request/blood bank fixes
- Recent activity feed + expiry scheduling added
- Admin and hospital auto-refresh work
- File upload and request data expansion (date/room fields)

### 2026-05-06 to 2026-05-11

- Blood request workflow revisions
- Urgency + request type behavior updates
- Indication model and platelet count support enhanced
- Document scanning (OCR) added and stabilized
- Hospital request form aligned with anonymous flow format
- README added/expanded

### 2026-05-12 to 2026-05-14 (after previous summary creation)

- CI workflow updated (`d59a726`)
- Email-based `approve-with-remarks` + confirmation token flow (`af51ff9`)
- Reference number prefix fix to use `IP`/`OP` by request category (`77b9b44`)
- Admin blood request panel defaulting to pending view (`8c1a514`)
- CNPH blood tracer integration for release workflow (`f6d4ce9`)
- Tracer reset display fix for blood type/reference in reset UI (`c55d5ba`)

## Known gotchas

- `AuthGuard.js` currently redirects hospitals to `/hospital/hospital_dashboard.html`, while the actual file is `/hospital/hospital-dashboard.html`.
- `UserService.register()` currently creates users with `Role.ADMIN`, which may not match intended public registration behavior.
- `.gitignore` excludes `REPO_SUMMARY.md`, `summary.md`, and `database/`, so those can diverge from tracked history.

## Quick run

1. Configure env vars / `.env`
2. Run `mvn spring-boot:run` or `./mvnw spring-boot:run`
3. Open:
   - `/blood-request.html`
   - `/admin-login.html`
   - `/admin-setup.html`
   - `/admin/admin_dashboard.html`
   - `/hospital/hospital-dashboard.html`

## Paste-ready context for another chat

I am working on `blood-plus`, a Spring Boot 4.0.5 + MySQL blood bank management system with vanilla JS frontends for public requesters, hospital accounts, and admin/staff users. It uses session auth, Cloudinary uploads, Brevo email notifications, and scheduled expiry checks. The request lifecycle includes `PENDING`, `APPROVED`, `NEEDS_CONFIRMATION`, `ALLOCATED`, `READY_FOR_RELEASE`, `RELEASED`, `REJECTED`, and `CANCELLED`. Recent major updates include email-based approve-with-remarks confirmation links, `IP/OP` reference number prefixes, pending-default admin request view, and CNPH blood tracer integration (`/api/admin/blood-requests/{id}/tracer`). The repo has minimal tests (`contextLoads` only), and local `database/migrations` plus `REPO_SUMMARY.md` are currently git-ignored.
