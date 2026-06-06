# BloodPlus Project Summary

Last updated: 2026-05-24

## 1. Project Overview
- BloodPlus is a full-stack blood bank operations system for CNPH workflows, implemented as a Spring Boot backend plus role-specific static web UIs.
- It serves four active user contexts:
- `ADMIN` and `STAFF` users in `admin/admin_dashboard.html` for inventory, requests, analytics, logs, hospitals, and staff management.
- `HOSPITAL` users in `hospital/hospital-dashboard.html` for hospital-linked request submission, tracking, availability checks, and profile management.
- Public/anonymous requesters in `blood-request.html` for walk-in request submission and tracking.
- Requesters receiving tokenized approval-remarks confirmation links via `blood-request-confirmation.html`.

## 2. Tech Stack
- Backend framework: Java 21 + Spring Boot (`spring-boot-starter-parent` `4.0.5`) with MVC, JPA, Validation, Security, Mail (`pom.xml`).
- Database: MySQL (`mysql-connector-j`), entity-managed schema updates via `spring.jpa.hibernate.ddl-auto=update` (`application.properties`).
- Frontend approach: server-hosted static HTML/CSS/vanilla JS in `src/main/resources/static`.
- Authentication/security:
- Spring Security session-based auth (`JSESSIONID`, `SPRING_SECURITY_CONTEXT`).
- Role-based route protection for `ADMIN`, `STAFF`, `HOSPITAL` in `SecurityConfig.java`.
- CSRF disabled for `/api/**` only.
- File upload/cloud storage: doctor-request files uploaded to Cloudinary (`CloudinaryService`, `cloudinary-*` properties).
- Email integration: Brevo API key + sender config (`application.properties`, `EmailService`).
- OCR integration: OCR.space-backed backend scanning for public blood request forms and admin add-stock tracer images (`OCR_SPACE_API_KEY`, `OCR_SPACE_API_URL`).
- Build tools: Maven + `spring-boot-maven-plugin` (`pom.xml`).
- Frontend export tooling: SheetJS (`admin/assets/xlsx.full.min.js`) for Excel exports.

## 3. Main User Roles
- Admin (`AppUser.Role.ADMIN`): full admin panel access (`/admin/**`, `/api/admin/**`), hospital/staff CRUD, request lifecycle decisions, analytics/log exports, own profile/password management.
- Blood Bank staff (`AppUser.Role.STAFF`): admin panel access for operations; staff profile/password endpoints under `/api/admin/staff/*`.
- Hospital requester (`AppUser.Role.HOSPITAL`): hospital dashboard access (`/hospital/**`, `/api/hospital/**`), submit/view own requests, view blood availability, manage hospital profile/password.
- Anonymous/public requester (`BloodBagRequest.RequesterType.ANONYMOUS`): submit request and track status via public APIs.
- Other department staff: stored as `StaffProfile` with authorization `uniqueCode` but no dashboard `AppUser` when department is not `Blood Bank` (`StaffService`).

## 4. Current Main Features
- Authentication and setup:
- Initial system bootstrap via `/api/auth/system-status`, `/api/auth/admin/setup`, `/api/auth/admin/verify`, `/api/auth/admin/resend-verification`.
- Session login via `/api/auth/login`; logout via `/api/auth/logout`.
- Admin dashboard:
- Multi-panel UI in `admin/admin_dashboard.html` with dashboard, blood bank, requests, hospitals, staff, logs, profile.
- Blood bank inventory:
- Inventory summary, bag list, status computations, compatibility fetch, low-stock visibility.
- Blood bag management:
- Intake (`/api/admin/blood-bank/intake`), discard (`/discard`), open-system conversion (`/convert-open-system`).
- Add-stock scanning:
- Admin add-stock modal can upload/capture tracer images, review OCR-detected rows, import selected rows, and print scanned OCR data before final intake.
- Blood request management:
- Full workflow actions (approve, approve-with-remarks, reject, allocate, reallocate, ready, release, cancel).
- Allocation/release workflow:
- Bag reservation to `CROSSMATCHED`, release to `DISPENSED`, fulfillment log creation.
- Staff management:
- Create/update/delete staff, toggle status, regenerate authorization code, role-based access handling.
- Hospital management:
- Create/update/delete/search hospitals and provision hospital accounts.
- Analytics:
- Consolidated analytics payload from `/api/admin/analytics`; rendered in admin analytics tab with export/print.
- Printing/exporting:
- Blood bags print/export and analytics print/export in admin JS.
- Logs/tracking:
- Status logs, fulfillments, served summaries/details, tracer save/load endpoints.

## 5. Blood Bank Module
- Inventory overview:
- `/api/admin/blood-bank/inventory` returns `countByType`, `countByComponent`, `volumeByType`, `totalAvailable`, `expiringSoon`, `openSystemCount`.
- Blood bag statuses:
- `BloodBag.BagStatus`: `AVAILABLE`, `CROSSMATCHED`, `DISPENSED`, `EXPIRED`, `DISCARDED`.
- Add stock / batch intake:
- Backend intake endpoint accepts one record per call (`BloodBankIntakeRequest`).
- Frontend supports multi-row intake staging in `admin/js/admin_dashboard.js` (`addStockRow`, `generateAddStockRows`, `submitAddBloodStock` loops calls).
- Tracer OCR-assisted intake:
- `POST /api/admin/blood-bank/tracer-ocr` scans uploaded tracer images via `TracerOcrService`, returns up to 10 parsed rows, estimated confidence, raw text, transaction number, and warnings.
- OCR import blocks existing duplicate serial numbers with `DUPLICATE_SERIALS` and lets admins edit/select rows before staging them into add-stock inputs.
- Discard:
- Disallow discard if already `DISCARDED` or `DISPENSED`; create `BloodBagDispatch` record with `DISCARDED` type.
- Open system conversion:
- Allowed only for `AVAILABLE` `WHOLE_BLOOD`; `convertToOpenSystem()` sets component to `PRBC` and `expiresAt = openSystemAt + 24h`.
- Expiration tracking:
- `BloodBagScheduler` hourly bulk expire via repository update.
- `BloodBagExpiryService` every 5 minutes for available expired bags and 24-hour open-system expiry.
- Filtering/sorting:
- Admin bags table filters by blood type/component/status/search/sort in frontend state (`renderBagsTable`, paginated `bagsCurrent`).
- Print/export behavior:
- `printBloodBags()` and `exportBloodBagsToExcel()` use current filtered dataset (`bagsCurrent`) and optional from/to date inputs.

## 6. Blood Request Workflow
- Status enum (`BloodBagRequest.RequestStatus`):
- `PENDING`, `NEEDS_CONFIRMATION`, `APPROVED`, `ALLOCATED`, `READY_FOR_RELEASE`, `RELEASED`, `REJECTED`, `CANCELLED`.
- Submission:
- Public: `POST /api/req/blood-requests` (`submitAnonymousRequest`).
- Hospital: `POST /api/hospital/blood-requests` (`submitHospitalRequest`).
- Public OCR prefill: `POST /api/req/blood-requests/ocr` scans PDF/image uploads via `BloodRequestOcrService` and returns normalized request fields, confidence, raw text, and warnings.
- Both require doctor's note file and indication data validation.
- Approval:
- `approve`: `PENDING -> APPROVED` only when compatible available bags are sufficient.
- `approve-with-remarks`: `PENDING -> NEEDS_CONFIRMATION`, stores `approvedUnits`, `approvalRemarks`, optional `alternativeComponentSuggestion`, 24h token expiry, email dispatch.
- Rejection:
- `reject`: blocks released requests; releases crossmatched bags if needed; clears token and allocations.
- Allocation:
- `allocate`: only from `APPROVED`; blocked from `NEEDS_CONFIRMATION`; validates exact required bag count; marks selected bags `CROSSMATCHED`; stores `allocatedBagIds`.
- Reallocation:
- `reallocate`: allowed from `ALLOCATED` and `READY_FOR_RELEASE`; releases prior crossmatched bags then reserves new set.
- Ready/release:
- `markReadyRequest`: `ALLOCATED -> READY_FOR_RELEASE` plus ready email when requester email exists.
- `releaseRequest`: `READY_FOR_RELEASE -> RELEASED`; marks allocated bags `DISPENSED`; creates `RequestFulfillment` rows.
- Cancellation:
- `cancel`: disallowed for `RELEASED`; closes request and frees reserved bags when applicable.
- Confirmation token flow:
- `POST /api/blood-requests/confirm-remarks` consumes token + accepted flag.
- Accepted: `NEEDS_CONFIRMATION -> APPROVED`; rejected: `NEEDS_CONFIRMATION -> REJECTED`.
- Logs/tracer:
- Status transitions logged in `request_status_logs` via `RequestStatusLogService`.
- Tracer endpoints: `GET/PUT /api/admin/blood-requests/{id}/tracer` via `BloodTracerService`.
- Served/unserved logic:
- `RequestLogsService` computes `servedUnits`, `unservedUnits`, `result` (`Served`, `Partially Served`, `Unserved`) and derives `unservedReason` fallback text when absent.
- Remarks/notes fields in workflow:
- `approvalRemarks`, `alternativeComponentSuggestion`, `patientAcceptedRemarks`, `patientRespondedAt`, `rejectionReason`, `unservedReason`.

## 7. Analytics Module
- Backend source: `AnalyticsService.getDashboardMetrics()` served by `GET /api/admin/analytics`.
- Request status overview:
- Counts for `PENDING`, `APPROVED`, `ALLOCATED`, `RELEASED`, `REJECTED`, `CANCELLED`.
- Fulfillment performance:
- `fulfillmentMetrics.rate`, `totalReleased`, `avgDaysToRelease`.
- Urgency breakdown:
- Counts by `UrgencyLevel` enum.
- Inpatient vs outpatient category:
- Category map by `RequestCategory` enum (`INPATIENT`, `OUTPATIENT`, `HOSPITAL`, `EMERGENCY`).
- Blood component breakdown:
- Counts by `BloodBag.ComponentType` from requests.
- Alerts and dispatch:
- Alerts: `expiringSoon`, `expired`, `qualityIssues` (currently hard-coded `0L` in service).
- Dispatch counts by `BloodBagDispatch.DispatchType` (`USED`, `DISCARDED`, `TRANSFERRED`).
- Requester type:
- Grouped counts for `HOSPITAL` and `ANONYMOUS`.
- Top requesting hospitals:
- Native-query metrics from `blood_bag_requests` + `hospital_profiles`.
- Export analytics / print report:
- Admin UI uses `printAnalytics()` cloning current analytics DOM and chart canvases.

## 8. Staff Management
- Blood Bank staff dashboard login:
- `StaffService` creates linked `AppUser` (`Role.STAFF`) only when department is `Blood Bank`.
- Other departments authorization model:
- Non-`Blood Bank` staff get `StaffProfile` + `uniqueCode` without dashboard `AppUser`.
- Unique code format:
- Generated code is 8 chars from restricted charset, formatted `XXXX-XXXX` (`length=9` with hyphen).
- Staff ID behavior:
- Auto-generated `STF-###` when not provided.
- Credential/code email behavior:
- Blood Bank staff: credentials email + code (`sendStaffCredentialsEmail`).
- Other departments: authorization-code email only (`sendStaffAuthorizationCodeEmail`).
- Regeneration sends new code via `sendStaffRegeneratedCodeEmail`.

## 9. Backend API Summary
- Auth endpoints (`AuthController`):
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/register`, `POST /api/auth/verify-email`.
- `POST /api/auth/admin/setup`, `POST /api/auth/admin/verify`, `POST /api/auth/admin/resend-verification`, `GET /api/auth/system-status`.
- Logout endpoint from security config: `POST /api/auth/logout`.
- Public request endpoints (`BloodRequestController`):
- `POST /api/req/blood-requests`, `GET /api/req/blood-requests/track/{refNum}`, `POST /api/blood-requests/confirm-remarks`, `POST /api/req/blood-requests/ocr`.
- Hospital endpoints (`HospitalController`):
- Requests: `POST/GET /api/hospital/blood-requests`.
- Availability: `/api/hospital/blood-bank/availability`, `/blood-types`, `/blood-types/{bloodType}`, `/components`, `/components/{componentType}`.
- Profile: `GET/PUT /api/hospital/profile`, `POST /api/hospital/profile/change-password`.
- Admin endpoints (`AdminController`, grouped):
- Dashboard: `/api/admin/dashboard`.
- Blood bank: `/api/admin/blood-bank/bags`, `/inventory`, `/intake`, `/bags/{id}/discard`, `/bags/{id}/convert-open-system`, `/available`.
- Blood bank OCR: `POST /api/admin/blood-bank/tracer-ocr` (`AdminTracerOcrController`).
- Requests: `/api/admin/blood-requests` + actions `/approve`, `/approve-with-remarks`, `/reject`, `/allocate`, `/reallocate`, `/ready`, `/release`, `/cancel`.
- Tracer: `GET/PUT /api/admin/blood-requests/{id}/tracer`.
- Analytics/system: `/api/admin/analytics`, `/health`, `/refresh`.
- Staff: `/api/admin/staff` CRUD + `/toggle-status`, `/regenerate-code`, `/staff/profile`, `/staff/change-password`.
- Hospitals: `/api/admin/hospitals` CRUD + `/search`.
- Profile/password: `/api/admin/profile`, `/api/admin/change-password`, `/api/admin/auth/change-password`.
- Logs/export: `/api/admin/logs/*` summary/status/fulfillment/served + export routes.

## 10. Frontend Structure
- `src/main/resources/static/admin/admin_dashboard.html`:
- Admin shell with panels for Dashboard, Blood Bank tabs, Blood Requests, Hospitals, Staff, Request Logs, Profile, plus add-stock OCR review modals.
- Loads `admin/assets/xlsx.full.min.js`, Tesseract.js, and `admin/js/admin_dashboard.js`.
- `src/main/resources/static/admin/js/admin_dashboard.js`:
- Central admin state + fetch/AJAX flow, request lifecycle actions, bag picker/allocation, blood bag filtering and pagination, add-stock batch/OCR UI, analytics rendering, print/export, logs exports, hospital/staff CRUD, profile/security forms.
- Note: `admin/js/script.js` is not present; active file is `admin/js/admin_dashboard.js`.
- Public request flow:
- `blood-request.html` + `js/blood_request.js` implement multi-step request form, tracker tab, indication logic, document upload, hospital-session-aware request mode, and backend OCR scanner integration.
- Request confirmation page:
- `blood-request-confirmation.html` + `js/blood_request_confirmation.js` parse token/action query params and call `/api/blood-requests/confirm-remarks`.
- Hospital pages:
- `hospital/hospital-dashboard.html` + `hospital/js/hospital-dashboard.js` handle dashboard metrics, blood bank availability view, request wizard, request history/detail/cancel UI, profile update and password change.
- Auth/setup pages:
- `admin-login.html` + `js/admin-login.js` for admin/staff/hospital session login redirects and legacy verify/resend UI.
- `admin-setup.html` + `js/admin_setup.js` + `css/admin_setup.css` for first-admin bootstrap, verification, password strength, OTP, and responsive setup styling.
- Guards/auth scripts:
- `js/AuthGuard.js` performs initialization guard (`/api/auth/system-status`) and auth/role redirects.
- CSS/theme files:
- `css/blood_request.css`, `css/admin-login.css`, `css/admin_setup.css`, `admin/css/admin_dashboard.css`, `hospital/css/hospital-dashboard.css`.

## 11. Database / Important Entities
- `AppUser` (`users`):
- Unique/non-null `username`, unique/non-null `email`, `password`, enum `role` (`HOSPITAL`, `ADMIN`, `STAFF`).
- Verification fields: `verificationCode` (length 4), `verificationExpiry`, `emailVerified`.
- `StaffProfile` (`staff_profiles`):
- `user_id` is nullable and unique.
- Unique `staffId`, unique/non-null `email`, unique/non-null `uniqueCode` length 9.
- Stores department/position/phone/hireDate.
- `HospitalProfile` (`hospital_profiles`):
- Non-null unique `user_id` one-to-one.
- Required `hospitalName`, `address`, `city`, `province`.
- `BloodBag` (`blood_bags`):
- Unique/non-null `serialNumber`; status/source/component/blood enums; `openSystem` + `openSystemAt`; expiry/collection dates.
- `BloodBagRequest` (`blood_bag_requests`):
- Unique `referenceNumber`; index on `confirmation_token`.
- Core workflow fields: `status`, `approvedUnits`, `approvalRemarks`, `patientAcceptedRemarks`, token timestamps, `allocatedBagIds`, `unservedReason`.
- Links to `requestedBy`, `hospitalProfile`, `reviewedBy`, optional `fulfilledByBag`.
- Clinical/transfusion/reaction/indication structured fields are present.
- `RequestStatusLog` (`request_status_logs`):
- Stores old/new status enums, nullable `changed_by`, timestamp and notes.
- `RequestFulfillment` (`request_fulfillments`):
- Request-to-bag release records with `fulfilledBy`, `fulfilledAt`, notes.
- `BloodBagDispatch` (`blood_bag_dispatches`):
- Dispatch types `USED`, `DISCARDED`, `TRANSFERRED`; optional `dispensedTo`.
- `BloodTracer` (`blood_tracers`):
- Unique `request_id` one-to-one; checklist booleans + metadata + `rows_json` (`LONGTEXT`).

## 12. Known Current Implementation Notes
- Session-based Spring Security is actively used (`SecurityConfig`, `AuthController` stores security context in session).
- Frontend API communication is vanilla JS `fetch` with cookie credentials in protected views.
- Analytics dashboard pulls from `/api/admin/analytics` (`admin/js/admin_dashboard.js`).
- Blood bag table filtering/sorting/pagination is client-side state over fetched data (`bagsAll`, `bagsCurrent`).
- Analytics print/export and blood bag print/export are based on currently rendered/filtered frontend state.
- Startup/config behavior:
- Scheduling enabled globally (`@EnableScheduling`).
- `.env` keys loaded into JVM props via `DotenvConfig`.
- OCR.space config is read from `ocr.space.api.key` / `ocr.space.api.url`, backed by `OCR_SPACE_API_KEY` / `OCR_SPACE_API_URL` in `application.properties`.
- Route/public asset rules are centralized in `SecurityConfig`.

## 13. Recently Updated Features
- Approval-with-remarks and requester confirmation workflow is integrated end-to-end:
- New `NEEDS_CONFIRMATION` branch and token confirmation endpoint.
- Added fields/migration in `database/migrations/2026-05-12_add_blood_request_confirmation_columns.sql`.
- Staff profile optional login-account support:
- `staff_profiles.user_id` nullable migration (`2026-05-13_allow_staff_profiles_without_users.sql`).
- `StaffService` now supports dashboard-access staff vs code-only staff by department.
- Blood tracer module added:
- `BloodTracer` entity/repository/service/controller endpoints and SQL migration (`2026-05-14_create_blood_tracer_tables.sql`).
- Admin dashboard enhancements in `admin/js/admin_dashboard.js`:
- Analytics tab rendering + print export.
- Blood bag report print/export with date-range options.
- Batch add-stock row tools, OCR-assisted tracer import, and reusable modals.
- Expanded logs module:
- Served details and inside/outside summaries with export endpoints and frontend integration.
- Public request OCR:
- `BloodRequestOcrService` and `/api/req/blood-requests/ocr` provide backend PDF/image scanning and normalized prefill data for `blood-request.html`.
- Recent UI polishing:
- Admin login now supports hospital login routing, and admin setup styling has been rebuilt around the multi-step bootstrap/verification flow.

## 14. Remaining TODO / Risks
- Frontend/backend route mismatches found:
- `admin-login.js` calls `/api/auth/resend-otp`, but backend exposes `/api/auth/admin/resend-verification`.
- `AuthGuard.js` redirects hospitals to `/hospital/hospital_dashboard.html`, but current file is `/hospital/hospital-dashboard.html`.
- `AuthGuard.js` admin-path role gate checks only `ADMIN` while backend permits `ADMIN` and `STAFF` for `/admin/**`.
- Password endpoint mismatch risk:
- Frontend staff password change uses `/api/auth/change-password` in `admin_dashboard.js`; backend mapping is `/api/admin/auth/change-password` (plus `/api/admin/change-password` and `/api/admin/staff/change-password`).
- Duplicated frontend logic in `admin/js/admin_dashboard.js`:
- Duplicate `showPanel` and `renderRecentActivities` function declarations, increasing maintenance/regression risk.
- Native `alert()` usage remains in multiple flows:
- Present in `admin/js/admin_dashboard.js`, `hospital/js/hospital-dashboard.js`, and `js/blood_request.js`.
- Auto-refresh timing mismatch:
- `initializeAutoRefresh()` says it checks every 30 seconds, but the current constant is `1000` ms.
- OCR configuration/runtime risk:
- Request-form and tracer scanning require `OCR_SPACE_API_KEY`; missing or unreachable OCR.space service returns `503`/`502` style API errors.
- Schema drift risk:
- `ddl-auto=update` is enabled while manual SQL migration files also exist under `database/migrations`; environments can diverge if migration scripts are not applied consistently.
- Notes for repository expectations:
- `admin/js/script.js` does not exist in current repo; admin dashboard uses `admin/js/admin_dashboard.js`.

## 15. Project Structure (All Tracked Files)
- Source of truth: generated from repository-tracked files (`git ls-files`).

```text
.github/workflows/ci.yml
.gitignore
.mvn/wrapper/maven-wrapper.properties
.vscode/settings.json
HELP.md
README.md
REPO_SUMMARY.md
mvnw
mvnw.cmd
pom.xml
src/main/java/com/hospital/blood_plus/BloodPlusApplication.java
src/main/java/com/hospital/blood_plus/config/AdminCheck.java
src/main/java/com/hospital/blood_plus/config/DotenvConfig.java
src/main/java/com/hospital/blood_plus/config/RedirectIfLoggedInFilter.java
src/main/java/com/hospital/blood_plus/config/SecurityConfig.java
src/main/java/com/hospital/blood_plus/controller/AdminController.java
src/main/java/com/hospital/blood_plus/controller/AdminTracerOcrController.java
src/main/java/com/hospital/blood_plus/controller/AuthController.java
src/main/java/com/hospital/blood_plus/controller/BloodRequestController.java
src/main/java/com/hospital/blood_plus/controller/HospitalController.java
src/main/java/com/hospital/blood_plus/dto/request/AllocateRequestDTO.java
src/main/java/com/hospital/blood_plus/dto/request/AnalyticsDTO.java
src/main/java/com/hospital/blood_plus/dto/request/ApproveRequestDTO.java
src/main/java/com/hospital/blood_plus/dto/request/BloodBagRequestDTO.java
src/main/java/com/hospital/blood_plus/dto/request/BloodBankIntakeRequest.java
src/main/java/com/hospital/blood_plus/dto/request/BloodTracerSaveDTO.java
src/main/java/com/hospital/blood_plus/dto/request/ChangePasswordRequestDTO.java
src/main/java/com/hospital/blood_plus/dto/request/DeferralRequest.java
src/main/java/com/hospital/blood_plus/dto/request/DiscardBagRequest.java
src/main/java/com/hospital/blood_plus/dto/request/EmailConfirmationRequest.java
src/main/java/com/hospital/blood_plus/dto/request/HospitalDTOs.java
src/main/java/com/hospital/blood_plus/dto/request/ProfileDTO.java
src/main/java/com/hospital/blood_plus/dto/request/RecentActivityDTO.java
src/main/java/com/hospital/blood_plus/dto/request/RegisterRequest.java
src/main/java/com/hospital/blood_plus/dto/request/RequestStatusLogDTO.java
src/main/java/com/hospital/blood_plus/dto/request/StaffDTOs.java
src/main/java/com/hospital/blood_plus/dto/request/UpdateHospitalProfileDTO.java
src/main/java/com/hospital/blood_plus/dto/request/VerifyEmailRequest.java
src/main/java/com/hospital/blood_plus/dto/response/AdminDashboardDTO.java
src/main/java/com/hospital/blood_plus/dto/response/AdminDashboardResponse.java
src/main/java/com/hospital/blood_plus/dto/response/BloodBagAvailableDTO.java
src/main/java/com/hospital/blood_plus/dto/response/BloodBagResponse.java
src/main/java/com/hospital/blood_plus/dto/response/BloodRequestOcrFieldsDTO.java
src/main/java/com/hospital/blood_plus/dto/response/BloodRequestOcrResponseDTO.java
src/main/java/com/hospital/blood_plus/dto/response/InsideServedSummaryRow.java
src/main/java/com/hospital/blood_plus/dto/response/LogsSummaryResponse.java
src/main/java/com/hospital/blood_plus/dto/response/OutsideServedSummaryRow.java
src/main/java/com/hospital/blood_plus/dto/response/PaginatedResponse.java
src/main/java/com/hospital/blood_plus/dto/response/ServedBagDetailResponse.java
src/main/java/com/hospital/blood_plus/dto/response/ServedRequestSummaryResponse.java
src/main/java/com/hospital/blood_plus/dto/response/TracerOcrResponseDTO.java
src/main/java/com/hospital/blood_plus/dto/response/TracerOcrRowDTO.java
src/main/java/com/hospital/blood_plus/model/AppUser.java
src/main/java/com/hospital/blood_plus/model/BloodBag.java
src/main/java/com/hospital/blood_plus/model/BloodBagDispatch.java
src/main/java/com/hospital/blood_plus/model/BloodBagRequest.java
src/main/java/com/hospital/blood_plus/model/BloodTracer.java
src/main/java/com/hospital/blood_plus/model/HospitalProfile.java
src/main/java/com/hospital/blood_plus/model/RequestFulfillment.java
src/main/java/com/hospital/blood_plus/model/RequestStatusLog.java
src/main/java/com/hospital/blood_plus/model/StaffProfile.java
src/main/java/com/hospital/blood_plus/repository/BloodBagDispatchRepository.java
src/main/java/com/hospital/blood_plus/repository/BloodBagRepository.java
src/main/java/com/hospital/blood_plus/repository/BloodBagRequestRepository.java
src/main/java/com/hospital/blood_plus/repository/BloodTracerRepository.java
src/main/java/com/hospital/blood_plus/repository/HospitalProfileRepository.java
src/main/java/com/hospital/blood_plus/repository/RequestFulfillmentRepository.java
src/main/java/com/hospital/blood_plus/repository/RequestStatusLogRepository.java
src/main/java/com/hospital/blood_plus/repository/StaffProfileRepository.java
src/main/java/com/hospital/blood_plus/repository/UserRepository.java
src/main/java/com/hospital/blood_plus/scheduler/BloodBagScheduler.java
src/main/java/com/hospital/blood_plus/service/AdminProfileService.java
src/main/java/com/hospital/blood_plus/service/AnalyticsService.java
src/main/java/com/hospital/blood_plus/service/AppUserDetails.java
src/main/java/com/hospital/blood_plus/service/AppUserDetailsService.java
src/main/java/com/hospital/blood_plus/service/BloodBagExpiryService.java
src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java
src/main/java/com/hospital/blood_plus/service/BloodBagService.java
src/main/java/com/hospital/blood_plus/service/BloodRequestOcrService.java
src/main/java/com/hospital/blood_plus/service/BloodTracerService.java
src/main/java/com/hospital/blood_plus/service/CloudinaryService.java
src/main/java/com/hospital/blood_plus/service/DashboardService.java
src/main/java/com/hospital/blood_plus/service/DuplicateSerialException.java
src/main/java/com/hospital/blood_plus/service/EmailService.java
src/main/java/com/hospital/blood_plus/service/HospitalProfileService.java
src/main/java/com/hospital/blood_plus/service/HospitalService.java
src/main/java/com/hospital/blood_plus/service/RecentActivityService.java
src/main/java/com/hospital/blood_plus/service/RequestLogsService.java
src/main/java/com/hospital/blood_plus/service/RequestStatusLogService.java
src/main/java/com/hospital/blood_plus/service/StaffService.java
src/main/java/com/hospital/blood_plus/service/TracerOcrService.java
src/main/java/com/hospital/blood_plus/service/UserService.java
src/main/resources/application.properties
src/main/resources/static/admin-login.html
src/main/resources/static/admin-setup.html
src/main/resources/static/admin/admin_dashboard.html
src/main/resources/static/admin/assets/xlsx.full.min.js
src/main/resources/static/admin/css/admin_dashboard.css
src/main/resources/static/admin/js/admin_dashboard.js
src/main/resources/static/admin/receipt/blood-bank-header.png
src/main/resources/static/admin/receipt/blood-release-receipt.html
src/main/resources/static/admin/receipt/blood-request-tracer.html
src/main/resources/static/blood-request-confirmation.html
src/main/resources/static/blood-request.html
src/main/resources/static/css/admin-login.css
src/main/resources/static/css/admin_setup.css
src/main/resources/static/css/blood_request.css
src/main/resources/static/forms/Blood_Request_Form_Adult.pdf
src/main/resources/static/forms/Blood_Request_Form_Pediatric.pdf
src/main/resources/static/hospital/css/hospital-dashboard.css
src/main/resources/static/hospital/hospital-dashboard.html
src/main/resources/static/hospital/js/hospital-dashboard.js
src/main/resources/static/js/AuthGuard.js
src/main/resources/static/js/admin-login.js
src/main/resources/static/js/admin_setup.js
src/main/resources/static/js/blood_request.js
src/main/resources/static/js/blood_request_confirmation.js
src/test/java/com/hospital/blood_plus/BloodPlusApplicationTests.java
summary.md
```
