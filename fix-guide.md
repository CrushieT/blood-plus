# BloodPlus Memory Crash Fix Guide (Railway)

This guide targets the current memory crash pattern in your repo: unpaginated backend endpoints + very frequent frontend polling.

## 1) Emergency Stabilization (Do This First)

1. Slow polling immediately.
2. Stop returning full-table payloads from admin endpoints.
3. Deploy, verify memory drops, then continue refactor.

### 1.1 Frontend polling hotfix

In `src/main/resources/static/admin/js/admin_dashboard.js`:

- Change:
  - `const REFRESH_INTERVAL = 1000;`
- To:
  - `const REFRESH_INTERVAL = 30000;` (or `60000`)

In `src/main/resources/static/hospital/js/hospital-dashboard.js`:

- Change:
  - `setInterval(..., 5000);`
- To:
  - `setInterval(..., 30000);`

Also skip refresh when tab is hidden:

```js
if (document.hidden) return;
```

inside each refresh interval callback.

## 2) Highest-Impact Backend Fixes

## 2.1 Paginate blood bags endpoint

Current issue:
- `/api/admin/blood-bank/bags` returns all rows via `bloodBagRepository.findAll()`.

Fix:
1. Add paged endpoint:
   - `GET /api/admin/blood-bank/bags?page=1&size=25&status=AVAILABLE&search=...`
2. Return `PaginatedResponse<BloodBagResponse>`.
3. Repository uses `Pageable`, not `findAll()`.

## 2.2 Paginate blood requests endpoint

Current issue:
- `/api/admin/blood-requests` returns full list + per-request enrichment.

Fix:
1. Replace with paged query in `BloodBagRequestRepository`.
2. Add filters (`status`, `search`, date range).
3. Return lightweight list DTO for table view.
4. Load detail/reserved bags only when opening row modal.

## 2.3 Fix served logs memory explosion

Current issue:
- `RequestLogsService.buildServedSummaries()` calls `fulfillmentRepository.findAll()` then groups in memory.

Fix:
1. Query by date/search at DB level with pagination.
2. Aggregate in SQL (or paged JPQL projection), not Java full-list grouping.
3. Keep export endpoints separate and guarded by strict date range.

## 3) Export Endpoint Safety

Export endpoints can still OOM if unbounded.

Apply guardrails:

1. Require `startDate` + `endDate`.
2. Reject range > 31 days for sync export.
3. If larger range needed, implement async export job and download link.
4. Return DTOs only (no full entity graph).

## 4) Dashboard Query Optimization

In `DashboardService`, multiple methods fetch all `AVAILABLE` bags repeatedly.

Fix pattern:
1. Replace repeated `findByStatusOrderByExpiresAtAsc(AVAILABLE)` with aggregate queries:
   - count by type
   - sum volume
   - expiring soon count
   - open system count
2. Use one query per metric (or combined native query).
3. Avoid materializing all `BloodBag` rows for simple counts.

## 5) Railway Runtime Hardening

While refactoring, add temporary safeguards:

1. Set `JAVA_TOOL_OPTIONS` in Railway:
   - `-XX:MaxRAMPercentage=70 -XX:+UseG1GC`
2. Keep one app instance while profiling memory.
3. Enable request/response size monitoring.

Note: runtime tuning helps, but root fix is query/payload size.

## 6) Suggested Implementation Order

1. Polling interval hotfix (`admin_dashboard.js`, `hospital-dashboard.js`)
2. Paginate `/blood-bank/bags`
3. Paginate `/blood-requests`
4. Rewrite served logs aggregation path
5. Add export guardrails
6. Optimize dashboard aggregates

## 7) Verification Checklist

After each deploy, verify:

1. Admin page loads first screen in < 2s with large dataset.
2. Memory usage no longer climbs continuously while dashboard is open.
3. `/api/admin/blood-bank/bags` response size is page-limited.
4. `/api/admin/blood-requests` response size is page-limited.
5. Served logs work without loading all fulfillments.
6. Export with huge range is rejected or async.

## 8) Nice-to-Have Improvements

1. Add DB indexes for common filters/sorts:
   - `blood_bags(status, expires_at, blood_type)`
   - `blood_bag_requests(status, requested_at, reference_number)`
   - `request_fulfillments(fulfilled_at, request_id)`
2. Add API rate limiting for logs/export endpoints.
3. Add server-side caching for dashboard summary (15-30 seconds).

---

If you want, next step I can implement Phase 1 and 2 directly in code (polling hotfix + paginated bags endpoint) so you can redeploy quickly.
