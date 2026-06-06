# Sprint-Aligned User Stories and Feature Commit Map

This plan is built from:
- `docs/03-chapter-3-methods/a-institutional-framework.md` to `h-validation-plan.md`
- Current implementation in this repository (`blood-plus/blood-plus`)

Use this as the source of truth for what to commit per feature in the new repository, so your sprint-by-sprint audit trail stays believable and consistent with your manuscript.

## 1. Audit-Trail Rules (Apply to Every Story)

1. Create one GitHub issue per backlog story ID (`#01` to `#29`).
2. Create one feature branch per story: `feature/s{n}-us{id}-{slug}`.
3. Keep one PR per story (do not bundle multiple stories in one PR).
4. Keep 3 to 6 commits per story in this order:
   - model/schema
   - service logic
   - API/controller
   - frontend wiring
   - tests/docs/evidence
5. Close a story only after Definition of Done and validation evidence are complete.

## 2. Manuscript-to-Code Mapping Notes

| Manuscript Term | Current Code Mapping | Recommendation for New Repo |
| --- | --- | --- |
| `staff_authorization_codes` table | `StaffProfile.uniqueCode` and `StaffProfileRepository.findByUniqueCode(...)` | Keep as-is for code parity, or split into a dedicated entity in Sprint 1 or 2 if you need strict schema matching |
| `pending_confirmation` status | `BloodBagRequest.RequestStatus.NEEDS_CONFIRMATION` | Keep enum name but document equivalence in README |
| `blood_tracer_documents` | `blood_tracers` table via `BloodTracer` entity | Keep as-is for code parity, or rename table/entity in Sprint 3 for manuscript alignment |
| Ward nurse portal role wording | Implemented through public request path + required `staffUniqueCode` | Keep this behavior, then label it as “Authorized Request Portal” in docs/UI copy |

## 3. Story Point Distribution (Matches Sprint Structure)

| Sprint | Story IDs | Planned Points |
| --- | --- | --- |
| Sprint 0 | `#01-#02` | Foundation sprint (no velocity target in chapter table) |
| Sprint 1 | `#03-#11` | 18 |
| Sprint 2 | `#12-#19` | 16 |
| Sprint 3 | `#20-#26` | 18 |
| Sprint 4 | `#27-#29` | 11 |

## 4. Sprint 0 Commit Plan

| ID | SP | Branch | User Story Focus | Primary Commit Scope (Classes/Files) |
| --- | --- | --- | --- | --- |
| S0-FND | - | `feature/s0-foundation-bootstrap` | Project bootstrap, environment, integrations, security baseline | `pom.xml`<br>`src/main/resources/application.properties`<br>`src/main/java/com/hospital/blood_plus/BloodPlusApplication.java`<br>`src/main/java/com/hospital/blood_plus/config/{DotenvConfig.java,SecurityConfig.java,RedirectIfLoggedInFilter.java}`<br>`src/main/java/com/hospital/blood_plus/service/{CloudinaryService.java,EmailService.java,BloodRequestOcrService.java,TracerOcrService.java}` |
| #01 | 3 | `feature/s0-us01-admin-bootstrap` | System initialization and first-admin bootstrap path | `src/main/java/com/hospital/blood_plus/model/AppUser.java`<br>`src/main/java/com/hospital/blood_plus/repository/UserRepository.java`<br>`src/main/java/com/hospital/blood_plus/service/UserService.java`<br>`src/main/java/com/hospital/blood_plus/controller/AuthController.java`<br>`src/main/java/com/hospital/blood_plus/config/AdminCheck.java`<br>`src/main/resources/static/{admin-setup.html,js/admin_setup.js,js/AuthGuard.js}` |
| #02 | 2 | `feature/s0-us02-admin-credential-hardening` | Admin credential update/hardening after setup | `src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/service/AdminProfileService.java`<br>`src/main/java/com/hospital/blood_plus/dto/request/ChangePasswordRequestDTO.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |

## 5. Sprint 1 Commit Plan (18 Points)

| ID | SP | Branch | User Story Focus | Primary Commit Scope (Classes/Files) |
| --- | --- | --- | --- | --- |
| #03 | 3 | `feature/s1-us03-staff-appuser-registration` | Register staff with dashboard access | `src/main/java/com/hospital/blood_plus/model/{AppUser.java,StaffProfile.java}`<br>`src/main/java/com/hospital/blood_plus/dto/request/StaffDTOs.java`<br>`src/main/java/com/hospital/blood_plus/repository/{UserRepository.java,StaffProfileRepository.java}`<br>`src/main/java/com/hospital/blood_plus/service/{StaffService.java,EmailService.java}`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/resources/static/admin/{admin_dashboard.html,js/admin_dashboard.js}` |
| #04 | 2 | `feature/s1-us04-staff-status-toggle` | Activate/deactivate staff access | `src/main/java/com/hospital/blood_plus/service/StaffService.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/model/AppUser.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #05 | 3 | `feature/s1-us05-ward-nurse-code-issuance` | Register staff without AppUser and issue authorization code | `src/main/java/com/hospital/blood_plus/model/StaffProfile.java`<br>`src/main/java/com/hospital/blood_plus/service/{StaffService.java,EmailService.java}`<br>`src/main/java/com/hospital/blood_plus/repository/StaffProfileRepository.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #06 | 2 | `feature/s1-us06-ward-nurse-code-regeneration` | Revoke/regenerate ward nurse authorization code | `src/main/java/com/hospital/blood_plus/service/{StaffService.java,EmailService.java}`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/repository/StaffProfileRepository.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #07 | 3 | `feature/s1-us07-hospital-account-management` | Register/manage external hospital accounts | `src/main/java/com/hospital/blood_plus/model/{HospitalProfile.java,AppUser.java}`<br>`src/main/java/com/hospital/blood_plus/dto/request/HospitalDTOs.java`<br>`src/main/java/com/hospital/blood_plus/repository/{HospitalProfileRepository.java,UserRepository.java}`<br>`src/main/java/com/hospital/blood_plus/service/{HospitalService.java,EmailService.java}`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #08 | 2 | `feature/s1-us08-auth-role-routing` | Login and role-based route protection | `src/main/java/com/hospital/blood_plus/controller/AuthController.java`<br>`src/main/java/com/hospital/blood_plus/config/SecurityConfig.java`<br>`src/main/java/com/hospital/blood_plus/service/{AppUserDetailsService.java,AppUserDetails.java}`<br>`src/main/resources/static/{admin-login.html,js/admin-login.js,js/AuthGuard.js}` |
| #09 | 1 | `feature/s1-us09-blood-bag-encoding` | Manual blood bag encoding and save | `src/main/java/com/hospital/blood_plus/model/BloodBag.java`<br>`src/main/java/com/hospital/blood_plus/dto/request/BloodBankIntakeRequest.java`<br>`src/main/java/com/hospital/blood_plus/repository/BloodBagRepository.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagService.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #10 | 1 | `feature/s1-us10-ocr-assisted-encoding` | OCR-assisted stock form intake (suggestion only) | `src/main/java/com/hospital/blood_plus/service/TracerOcrService.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminTracerOcrController.java`<br>`src/main/java/com/hospital/blood_plus/dto/response/{TracerOcrResponseDTO.java,TracerOcrRowDTO.java}`<br>`src/main/java/com/hospital/blood_plus/service/DuplicateSerialException.java`<br>`src/main/resources/static/admin/{admin_dashboard.html,js/admin_dashboard.js}` |
| #11 | 1 | `feature/s1-us11-inventory-dashboard` | Inventory view by blood type/component/status | `src/main/java/com/hospital/blood_plus/service/{BloodBagService.java,DashboardService.java}`<br>`src/main/java/com/hospital/blood_plus/dto/response/{AdminDashboardResponse.java,AdminDashboardDTO.java}`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/resources/static/admin/{admin_dashboard.html,js/admin_dashboard.js}` |

## 6. Sprint 2 Commit Plan (16 Points)

| ID | SP | Branch | User Story Focus | Primary Commit Scope (Classes/Files) |
| --- | --- | --- | --- | --- |
| #12 | 2 | `feature/s2-us12-bag-status-management` | Update bag status (reserved/dispensed/discarded) | `src/main/java/com/hospital/blood_plus/model/{BloodBag.java,BloodBagDispatch.java,RequestFulfillment.java}`<br>`src/main/java/com/hospital/blood_plus/repository/{BloodBagRepository.java,BloodBagDispatchRepository.java,RequestFulfillmentRepository.java}`<br>`src/main/java/com/hospital/blood_plus/service/{BloodBagService.java,BloodBagRequestService.java}`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #13 | 2 | `feature/s2-us13-near-expiry-alerts` | Near-expiry alert logic and scheduled updates | `src/main/java/com/hospital/blood_plus/scheduler/BloodBagScheduler.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagExpiryService.java`<br>`src/main/java/com/hospital/blood_plus/repository/BloodBagRepository.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagService.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #14 | 1 | `feature/s2-us14-low-stock-alerts` | Low-stock detection and dashboard notifications | `src/main/java/com/hospital/blood_plus/service/BloodBagService.java`<br>`src/main/java/com/hospital/blood_plus/repository/BloodBagRepository.java`<br>`src/main/java/com/hospital/blood_plus/controller/{AdminController.java,HospitalController.java}`<br>`src/main/resources/static/{admin/js/admin_dashboard.js,hospital/js/hospital-dashboard.js}` |
| #15 | 3 | `feature/s2-us15-ward-nurse-request-submission` | Ward nurse request submission using authorization code | `src/main/java/com/hospital/blood_plus/dto/request/BloodBagRequestDTO.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java`<br>`src/main/java/com/hospital/blood_plus/repository/{StaffProfileRepository.java,BloodBagRequestRepository.java}`<br>`src/main/java/com/hospital/blood_plus/controller/BloodRequestController.java`<br>`src/main/resources/static/{blood-request.html,js/blood_request.js,css/blood_request.css}` |
| #16 | 2 | `feature/s2-us16-physician-authorization-enforcement` | Require physician authorization upload (Cloudinary) | `src/main/java/com/hospital/blood_plus/service/CloudinaryService.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java`<br>`src/main/java/com/hospital/blood_plus/model/BloodBagRequest.java`<br>`src/main/java/com/hospital/blood_plus/controller/{BloodRequestController.java,HospitalController.java}`<br>`src/main/resources/static/{js/blood_request.js,hospital/js/hospital-dashboard.js}` |
| #17 | 2 | `feature/s2-us17-request-status-tracking` | Reference number tracking and lifecycle visibility | `src/main/java/com/hospital/blood_plus/controller/BloodRequestController.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java`<br>`src/main/java/com/hospital/blood_plus/repository/BloodBagRequestRepository.java`<br>`src/main/java/com/hospital/blood_plus/model/BloodBagRequest.java`<br>`src/main/resources/static/js/blood_request.js` |
| #18 | 2 | `feature/s2-us18-hospital-request-submission` | Hospital dashboard request submission | `src/main/java/com/hospital/blood_plus/controller/HospitalController.java`<br>`src/main/java/com/hospital/blood_plus/service/{BloodBagRequestService.java,HospitalProfileService.java}`<br>`src/main/java/com/hospital/blood_plus/model/{HospitalProfile.java,BloodBagRequest.java}`<br>`src/main/java/com/hospital/blood_plus/dto/request/{BloodBagRequestDTO.java,UpdateHospitalProfileDTO.java}`<br>`src/main/resources/static/hospital/{hospital-dashboard.html,js/hospital-dashboard.js}` |
| #19 | 2 | `feature/s2-us19-hospital-request-history` | Hospital-side request history and status timeline | `src/main/java/com/hospital/blood_plus/controller/HospitalController.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java`<br>`src/main/java/com/hospital/blood_plus/repository/BloodBagRequestRepository.java`<br>`src/main/resources/static/hospital/js/hospital-dashboard.js` |

## 7. Sprint 3 Commit Plan (18 Points)

| ID | SP | Branch | User Story Focus | Primary Commit Scope (Classes/Files) |
| --- | --- | --- | --- | --- |
| #20 | 2 | `feature/s3-us20-urgency-request-queue` | Request queue with urgency ordering and review context | `src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java`<br>`src/main/java/com/hospital/blood_plus/repository/BloodBagRequestRepository.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #21 | 4 | `feature/s3-us21-approve-remarks-decline` | Approve / approve-with-remarks / decline workflow + notifications | `src/main/java/com/hospital/blood_plus/dto/request/ApproveRequestDTO.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/service/{BloodBagRequestService.java,EmailService.java,RequestStatusLogService.java}`<br>`src/main/java/com/hospital/blood_plus/model/BloodBagRequest.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #22 | 3 | `feature/s3-us22-requestor-confirmation-flow` | Tokenized requestor confirmation for remarks/alternatives | `src/main/java/com/hospital/blood_plus/dto/request/EmailConfirmationRequest.java`<br>`src/main/java/com/hospital/blood_plus/controller/BloodRequestController.java`<br>`src/main/java/com/hospital/blood_plus/service/{BloodBagRequestService.java,EmailService.java}`<br>`src/main/java/com/hospital/blood_plus/model/BloodBagRequest.java`<br>`src/main/resources/static/{blood-request-confirmation.html,js/blood_request_confirmation.js}` |
| #23 | 3 | `feature/s3-us23-abo-rh-compatibility-filter` | ABO/Rh compatibility filtering for available bags | `src/main/java/com/hospital/blood_plus/service/BloodBagService.java`<br>`src/main/java/com/hospital/blood_plus/dto/response/BloodBagAvailableDTO.java`<br>`src/main/java/com/hospital/blood_plus/repository/BloodBagRepository.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #24 | 2 | `feature/s3-us24-staff-bag-selection-confirmation` | Staff-reviewed bag selection before dispensing | `src/main/java/com/hospital/blood_plus/dto/request/AllocateRequestDTO.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java`<br>`src/main/java/com/hospital/blood_plus/model/{BloodBagRequest.java,BloodBag.java}`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #25 | 2 | `feature/s3-us25-release-fulfillment-recording` | Release/dispense workflow, inventory deduction, fulfillment records | `src/main/java/com/hospital/blood_plus/service/BloodBagRequestService.java`<br>`src/main/java/com/hospital/blood_plus/model/{RequestFulfillment.java,BloodBag.java,BloodBagDispatch.java}`<br>`src/main/java/com/hospital/blood_plus/repository/{RequestFulfillmentRepository.java,BloodBagRepository.java,BloodBagDispatchRepository.java}`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/service/RequestLogsService.java` |
| #26 | 2 | `feature/s3-us26-tracer-generation-printing` | Save and print blood tracer documents per release | `src/main/java/com/hospital/blood_plus/model/BloodTracer.java`<br>`src/main/java/com/hospital/blood_plus/repository/BloodTracerRepository.java`<br>`src/main/java/com/hospital/blood_plus/service/BloodTracerService.java`<br>`src/main/java/com/hospital/blood_plus/dto/request/BloodTracerSaveDTO.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/resources/static/admin/{js/admin_dashboard.js,receipt/blood-request-tracer.html,receipt/blood-release-receipt.html}` |

## 8. Sprint 4 Commit Plan (11 Points)

| ID | SP | Branch | User Story Focus | Primary Commit Scope (Classes/Files) |
| --- | --- | --- | --- | --- |
| #27 | 4 | `feature/s4-us27-analytics-dashboard` | Analytics dashboard for stock, requests, fulfillment, expiry/wastage | `src/main/java/com/hospital/blood_plus/service/AnalyticsService.java`<br>`src/main/java/com/hospital/blood_plus/dto/request/AnalyticsDTO.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/repository/{BloodBagRepository.java,BloodBagRequestRepository.java,BloodBagDispatchRepository.java}`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |
| #28 | 3 | `feature/s4-us28-inventory-dispensing-reports` | Printable/exportable inventory and dispensing reports | `src/main/java/com/hospital/blood_plus/service/RequestLogsService.java`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/java/com/hospital/blood_plus/dto/response/{LogsSummaryResponse.java,PaginatedResponse.java,ServedRequestSummaryResponse.java,InsideServedSummaryRow.java,OutsideServedSummaryRow.java,ServedBagDetailResponse.java}`<br>`src/main/resources/static/admin/{js/admin_dashboard.js,assets/xlsx.full.min.js}` |
| #29 | 4 | `feature/s4-us29-audit-trail-status-logging` | Full audit trail for status changes and dispatch/fulfillment events | `src/main/java/com/hospital/blood_plus/model/{RequestStatusLog.java,RequestFulfillment.java,BloodBagDispatch.java}`<br>`src/main/java/com/hospital/blood_plus/repository/{RequestStatusLogRepository.java,RequestFulfillmentRepository.java,BloodBagDispatchRepository.java}`<br>`src/main/java/com/hospital/blood_plus/service/{RequestStatusLogService.java,RequestLogsService.java,BloodBagRequestService.java}`<br>`src/main/java/com/hospital/blood_plus/controller/AdminController.java`<br>`src/main/resources/static/admin/js/admin_dashboard.js` |

## 9. Per-Story DoD Evidence Checklist

For each story, attach these artifacts in the PR:

1. Functional test notes with input and output.
2. Screenshots or short screen recording.
3. Proof of external integration when relevant:
   - Brevo email log (authorization codes, status emails, confirmation links)
   - Cloudinary URL/key saved on request
   - OCR suggestion-only behavior (no save before confirmation)
4. Audit trail evidence when story changes data:
   - `request_status_logs` entry (old/new status, actor, timestamp)
   - fulfillment/dispatch records for release or discard operations
5. README or documentation update aligned to the implemented behavior.

## 10. Recommended Commit Message Pattern

Use this exact pattern so history stays clean:

- `feat(us-15): validate ward nurse authorization code before request submit`
- `feat(us-15): persist request with reference number and cloudinary doctors note`
- `feat(us-15): wire public request form to staffUniqueCode validation errors`
- `test(us-15): add manual test evidence for invalid/revoked code cases`
- `docs(us-15): update sprint evidence and acceptance checklist`

## 11. Commit-Level LOC Budget Per Story

Use this when splitting each story into commits.  
`LOC` below means `added + deleted` lines from git diff/stat.

| ID | C1 `model/schema` LOC | C2 `service` LOC | C3 `API/controller` LOC | C4 `frontend` LOC | C5 `tests/docs/evidence` LOC | Total LOC Target |
| --- | --- | --- | --- | --- | --- | --- |
| S0-FND | 40-100 | 70-160 | 35-90 | 30-80 | 20-50 | 195-480 |
| #01 | 25-60 | 45-110 | 25-70 | 30-90 | 15-35 | 140-365 |
| #02 | 10-25 | 30-80 | 20-60 | 20-70 | 10-25 | 90-260 |
| #03 | 25-60 | 60-140 | 30-90 | 35-110 | 15-35 | 165-435 |
| #04 | 10-25 | 30-80 | 20-60 | 20-70 | 10-25 | 90-260 |
| #05 | 20-50 | 50-120 | 25-70 | 25-80 | 10-30 | 130-350 |
| #06 | 10-25 | 30-80 | 20-60 | 20-60 | 10-25 | 90-250 |
| #07 | 20-55 | 55-130 | 30-85 | 25-85 | 10-30 | 140-385 |
| #08 | 15-40 | 35-90 | 30-80 | 30-90 | 10-30 | 120-330 |
| #09 | 10-25 | 25-65 | 20-50 | 20-70 | 10-25 | 85-235 |
| #10 | 10-25 | 30-75 | 20-55 | 25-90 | 10-25 | 95-270 |
| #11 | 10-25 | 25-70 | 20-50 | 20-80 | 10-25 | 85-250 |
| #12 | 15-40 | 40-110 | 25-70 | 20-70 | 10-30 | 110-320 |
| #13 | 10-30 | 30-80 | 15-45 | 15-55 | 10-25 | 80-235 |
| #14 | 10-25 | 20-60 | 15-45 | 20-70 | 10-20 | 75-220 |
| #15 | 20-50 | 55-130 | 30-85 | 35-130 | 15-35 | 155-430 |
| #16 | 15-35 | 40-100 | 25-70 | 25-90 | 10-30 | 115-325 |
| #17 | 10-25 | 30-80 | 20-60 | 20-70 | 10-25 | 90-260 |
| #18 | 15-40 | 40-105 | 30-80 | 30-110 | 10-30 | 125-365 |
| #19 | 10-25 | 25-70 | 20-60 | 20-80 | 10-25 | 85-260 |
| #20 | 10-25 | 35-90 | 20-65 | 25-90 | 10-25 | 100-295 |
| #21 | 20-50 | 65-160 | 35-100 | 35-130 | 15-40 | 170-480 |
| #22 | 15-40 | 50-130 | 30-85 | 30-95 | 10-30 | 135-380 |
| #23 | 20-45 | 55-140 | 25-75 | 25-90 | 10-30 | 135-380 |
| #24 | 10-30 | 35-95 | 20-65 | 25-80 | 10-25 | 100-295 |
| #25 | 15-40 | 45-120 | 20-65 | 20-70 | 10-25 | 110-320 |
| #26 | 15-45 | 40-110 | 25-70 | 35-120 | 10-30 | 125-375 |
| #27 | 20-50 | 65-170 | 35-100 | 40-150 | 15-40 | 175-510 |
| #28 | 15-40 | 45-120 | 25-80 | 35-130 | 15-35 | 135-405 |
| #29 | 20-50 | 55-145 | 30-90 | 25-90 | 15-35 | 145-410 |

### 11.1 Commit Size Guardrails

1. Keep each commit between `20` and `220` LOC when possible.
2. If a commit exceeds `220` LOC, split it by layer (`service` vs `controller`, or `UI logic` vs `UI markup`).
3. Keep PR total for one story within its target range in the table above.
4. For `SP=1` stories, target `3-4` commits; for `SP=3/4` stories, target full `5` commits.

### 11.2 Quick Check Command Before Opening PR

Use this to verify per-commit LOC is believable:

```bash
git log --oneline --stat --decorate -n 8
```
