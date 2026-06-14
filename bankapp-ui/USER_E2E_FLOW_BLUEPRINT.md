# User E2E Banking Flow Blueprint

## 1) Purpose {tags: scope:purpose}

This document defines the **complete end-to-end user flow** for `bankapp-ui` so it reaches and exceeds legacy `frontend` behavior while using modern banking UX patterns, resilient APIs, and production-grade backend contracts.

Goals:
- Preserve all user capabilities already proven in legacy.
- Remove regressions/gaps currently present in `bankapp-ui`.
- Standardize API contracts and response envelopes.
- Add modern banking expectations: safer transfers, richer account visibility, auditable operations, and realtime reliability.

Primary systems:
- New UI: `/home/spanexx/Shared/Projects/banking-system/bankapp-ui`
- Legacy UI (reference baseline): `/home/spanexx/Shared/Projects/banking-system/frontend`
- Backend API: `/home/spanexx/Shared/Projects/banking-system/backend`

## 2) Legacy User API Inventory {tags: api:legacy-inventory}

The following endpoints are consumed by legacy user flows (directly or through user-facing facades).

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET /api/auth/logout`
- `POST /api/auth/forgot-password`
- `PUT /api/auth/reset-password/:token`
- `POST /api/auth/refresh-token`

Expected behavior:
- Persist session token and user profile.
- Role-based navigation after login (`admin` vs `user`).
- Password reset request and completion are first-class flows.

### Accounts
- `GET /api/accounts`
- `POST /api/accounts`
- `GET /api/accounts/:id`
- `GET /api/accounts/user/:userId`
- `GET /api/accounts/all` (legacy mixed in some places; user UIs should prefer scoped account reads)
- `GET /api/accounts/count`
- `GET /api/accounts/active/count`
- `GET /api/accounts/balance-change`

Expected behavior:
- User can see account list/details and create account.
- Dashboard can calculate total balance and balance change.

### Transactions
- `GET /api/transactions`
- `POST /api/transactions`
- `GET /api/transactions/all`
- `GET /api/transactions/user/:userId`
- `PUT /api/transactions/:transactionId/status`
- `GET /api/transactions/by-request/:requestId`
- `POST /api/transactions/card`
- `POST /api/transactions/cancel-transfer`

Expected behavior:
- Regular transaction history and monthly summaries.
- Date-filter support in statements.
- Card transaction inclusion in overall timeline.

### Transfer Requests (Two-step verification flow)
- `POST /api/transfer-requests`
- `POST /api/transfer-requests/verify`

Legacy admin-side lifecycle also exists (`manage`, `delete`, listing), but user flow depends on:
- Create transfer request.
- Verify request with OTP/code before funds are finalized.

### Cards
- `GET /api/cards/:accountId`
- `POST /api/cards/request`
- `PUT /api/cards/:cardId/freeze`
- `PUT /api/cards/:cardId/settings`
- `GET /api/cards/:cardId/transactions`
- `GET /api/cards/:cardId/available-credit`
- `GET /api/cards/:cardId/credit-limit`
- `POST /api/card-requests` (legacy alternative path still used in places)

Expected behavior:
- Request card against selected account.
- Freeze/unfreeze card.
- Update spending/usage settings.
- See card transaction history and card metrics.

### Notifications
- `GET /api/notifications`
- `GET /api/notifications/:id`
- `GET /api/notifications/user/:userId`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/mark-all-read`
- `DELETE /api/notifications/:id`

Realtime:
- Socket namespace notifications with user authentication and push events (`notification` and compatibility with `new_notification`).

### Support & Open Account
- `POST /api/support/guest` (open-account guest application with file upload)
- `POST /api/support/tickets`
- `GET /api/support/tickets`
- `GET /api/support/tickets/:id`
- `POST /api/support/messages`
- `GET /api/uploads/:filename` (legacy image retrieval path)

Expected behavior:
- Guest can submit open-account request with KYC image.
- Authenticated user can create and track support tickets.
- Ticket thread supports replies.

### Loans
- `GET /api/loans/applications`
- `POST /api/loans/applications`
- `GET /api/loans/applications/:applicationId`
- `PUT /api/loans/applications/:applicationId`
- `DELETE /api/loans/applications/:applicationId`
- `GET /api/loans/offers`
- `GET /api/loans/:id/repayments`
- `POST /api/loans/:id/pay`

Expected behavior:
- User submits loan application.
- User tracks status and repayment schedule.
- User makes payments.

### Users (for transfer recipient lookup and user context)
- `GET /api/users`
- `GET /api/users/:id`

Expected behavior:
- User recipient discovery (should be constrained/safe for privacy).

### Activity
- `GET /api/activity-logs`
- `POST /api/activities`
- `GET /api/activities/user`

Expected behavior:
- User activity timeline and audit visibility.

## 3) Current New UI Coverage vs Gaps {tags: gap:matrix}

### Implemented in `bankapp-ui` (present)
- Auth login/register/profile/logout.
- Dashboard accounts + recent transactions.
- Transfers: internal direct transfer and external transfer request.
- Cards: list, request, freeze toggle.
- Loans: apply/list/pay.
- Notifications list/read/delete.
- Support tickets list/create.
- Open-account guest submission.

### Missing or incomplete vs legacy/target
- Forgot/reset password flow is not implemented as user journey (route redirects to login).
- Transfer verification step (`POST /transfer-requests/verify`) is absent from new user journey.
- User account module parity missing:
  - No dedicated `/user/accounts`, `/user/accounts/detail`, `/user/accounts/create`.
- Transactions journey lacks:
  - Date-range filtering wired to API.
  - Account-specific statement filtering.
  - PDF statement export.
  - Explicit card-transaction merge strategy from card endpoints.
- Cards journey lacks:
  - Card settings update (`PUT /cards/:cardId/settings`).
  - Available credit and credit limit API usage.
- Notifications detail route/page missing.
- Support detail/thread reply flow missing (`GET /tickets/:id`, `POST /support/messages`).
- Loans journey lacks dedicated:
  - Offer-to-application prefill flow.
  - Repayment schedule page with per-loan drilldown.
- Realtime notifications are not consistently integrated into UI lists/state reconciliation.
- User recipient search currently uses broad `/users`; needs safer, banking-grade beneficiary model.
- Route map has compatibility redirects but not full functional routes for all legacy user screens.

## 4) Target End-to-End User Flow {tags: flow:target}

### Flow A: Authentication & Session Lifecycle
1. User opens app and authenticates with `POST /api/auth/login`.
2. UI stores token securely and loads profile via `GET /api/auth/me`.
3. On app startup, auth rehydration re-validates profile.
4. User can request reset via `POST /api/auth/forgot-password`.
5. User can complete reset via `PUT /api/auth/reset-password/:token`.
6. Logout invalidates session via `GET /api/auth/logout` and local cleanup.

Required behavior:
- Graceful handling of expired sessions (automatic redirect + toast).
- Retry-safe login and profile load.
- Route guards driven by actual auth state, not stale local cache.

### Flow B: Accounts & Balance Intelligence
1. Load user accounts via `GET /api/accounts` (or user-scoped canonical endpoint).
2. Show account detail view using `GET /api/accounts/:id`.
3. Allow account opening/creation where applicable via `POST /api/accounts`.
4. Compute dashboard analytics from:
  - `GET /api/accounts/balance-change`
  - account aggregates.

Required behavior:
- Never expose other users' accounts.
- Support empty state and recoverable API failures.
- Show status badges, account masks, and last update timestamp.

### Flow C: Transactions & Statements
1. Fetch timeline from `GET /api/transactions` and/or `GET /api/transactions/user/:userId`.
2. Support date filters (`startDate`, `endDate`) and account filters.
3. Merge card transaction feed (`GET /api/cards/:cardId/transactions`) where backend canonical list is insufficient.
4. Export statement PDF with proper signed amounts and summary totals.

Required behavior:
- Deterministic sign model (credit/debit).
- Sort by event timestamp descending.
- No duplication when merging multiple sources.

### Flow D: Transfers (Internal + External with Verification)
1. Internal transfer:
  - Submit immediate transaction using `POST /api/transactions`.
2. External transfer:
  - Create request with `POST /api/transfer-requests`.
  - Route to verification screen.
  - Confirm with `POST /api/transfer-requests/verify`.
  - Track settlement through transaction reference (`GET /api/transactions/by-request/:requestId`).

Required behavior:
- Validation: account ownership, recipient format, available balance, velocity limits.
- Explicit pending/verified/failed transfer states in UI.
- User-visible error reasons (code expired, invalid code, insufficient funds).

### Flow E: Cards
1. List cards for selected account with `GET /api/cards/:accountId`.
2. Request new card (`POST /api/cards/request` or unified card-request path).
3. Freeze/unfreeze via `PUT /api/cards/:cardId/freeze`.
4. Update card controls via `PUT /api/cards/:cardId/settings`.
5. Display card analytics:
  - `GET /api/cards/:cardId/transactions`
  - `GET /api/cards/:cardId/available-credit`
  - `GET /api/cards/:cardId/credit-limit`.

Required behavior:
- Card state updates reflect immediately after mutation.
- Distinguish debit vs credit behavior in UI and limits.

### Flow F: Notifications (Realtime + Inbox)
1. Initial inbox load: `GET /api/notifications`.
2. Realtime subscription via socket namespace + user room auth.
3. Mark one/all read:
  - `PUT /api/notifications/:id/read`
  - `PUT /api/notifications/mark-all-read`.
4. Delete notification `DELETE /api/notifications/:id`.
5. Open detail route with `GET /api/notifications/:id`.

Required behavior:
- Reconcile push events with existing list (dedupe by id).
- Support both event names (`notification`, `new_notification`) during transition.

### Flow G: Support & Ticketing
1. Authenticated user opens ticket: `POST /api/support/tickets`.
2. User views ticket list: `GET /api/support/tickets`.
3. User opens ticket detail: `GET /api/support/tickets/:id`.
4. User replies in thread: `POST /api/support/messages`.
5. Status changes reflected from backend updates/replies.

Required behavior:
- Ticket timeline format (messages, actors, timestamps).
- Reliable handling of pending/resolved/reopened statuses.

### Flow H: Open Account (Guest KYC)
1. Guest submits onboarding request using `POST /api/support/guest` with multipart payload.
2. UI validates file type/size and required fields before send.
3. Success state includes tracking hint and next expected communication.

Required behavior:
- Image/file upload robustness.
- Defensive handling of partial payload and server validation feedback.

### Flow I: Loans
1. User checks offers `GET /api/loans/offers`.
2. User submits application `POST /api/loans/applications`.
3. User views application and status `GET /api/loans/applications` and `GET /api/loans/applications/:id`.
4. User opens repayment schedule `GET /api/loans/:id/repayments`.
5. User makes payment `POST /api/loans/:id/pay`.

Required behavior:
- Status journey clarity (pending, under_review, approved, rejected, active, paid, defaulted).
- Payment confirmation and balance refresh after pay action.

### Flow J: Activity & Audit Visibility
1. Load recent activity via `GET /api/activity-logs` or user-scoped activity endpoint.
2. Show human-readable timeline in dashboard/support contexts.

Required behavior:
- User sees only own activity unless admin context.
- Action metadata remains understandable and safe to display.

## 5) Backend Modernization Requirements {tags: backend:optimization}

These are required to make the new UI behave like a modern banking product while keeping legacy parity.

### Contract and response consistency
- Standardize envelope shape:
  - success: `{ success: true, data: ... }`
  - error: `{ success: false, message, code, details? }`.
- Normalize pagination contract:
  - query: `page`, `limit`, `sort`, filters
  - response: `data`, `meta.total`, `meta.page`, `meta.limit`.

### Transfer security and correctness
- Enforce OTP verification lifecycle for external transfers before final posting.
- Add idempotency key support on money-movement endpoints.
- Add anti-duplicate window for rapid re-submission.
- Expose transfer status endpoint for polling/fallback.

### Beneficiary model (critical)
- Replace broad user listing dependency for recipients with:
  - beneficiary CRUD,
  - validated recipient identifiers,
  - optional aliasing and bank metadata.
- Prevent unnecessary PII exposure from `/api/users`.

### Observability and tracing
- Return correlation/request IDs on sensitive mutations.
- Emit auditable activity entries for auth, transfer, card lock/unlock, loan payment.

### Notification reliability
- Support canonical event + compatibility event during migration.
- Include deterministic event payload IDs for dedupe.
- Optionally add replay endpoint since-last-timestamp.

### Performance and resilience
- Add list endpoint pagination where missing (transactions, notifications, tickets).
- Add selective field projection to reduce payload size.
- Validate and bound date-range filters.

## 6) Required New UI Deliverables {tags: ui:deliverables}

1. Restore missing auth flows:
   - forgot-password page
   - reset-password page
2. Add user accounts module parity:
   - list, detail, create/update actions.
3. Implement transfer verification journey:
   - create request -> verify code -> completion state.
4. Upgrade transactions:
   - filters, account scope, statement export, merged card events.
5. Upgrade cards:
   - settings update, limit/available-credit visuals.
6. Add notification details page and realtime reconciliation.
7. Expand support:
   - ticket detail + threaded replies.
8. Expand loans:
   - offers page and repayment schedule page.
9. Ensure route parity with legacy user navigation targets.
10. Standardize error handling and loading skeletons across all pages.

## 7) Acceptance Criteria (End-to-End) {tags: qa:acceptance}

Functional:
- All legacy user journeys are executable in `bankapp-ui` without dead ends.
- No user-facing action depends on admin-only endpoint access.
- External transfer requires verification and surfaces clear status.

API:
- All user APIs have deterministic request/response behavior and typed contracts.
- Critical endpoints expose meaningful domain errors (not generic 500/400 only).

Security:
- No cross-user data leakage from recipient/account/notification APIs.
- Token/session invalidation is respected across guarded routes.

UX:
- Every async path has loading, success, and error state.
- Notifications update in near-realtime and remain consistent after reload.

Quality:
- Unit/integration tests for services and critical pages.
- E2E smoke coverage for login, transfer verify, card lock, support ticket, loan payment.

## 8) API Reference for Implementation Planning {tags: api:target-map}

Authentication:
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/auth/logout`
- `POST /api/auth/forgot-password`
- `PUT /api/auth/reset-password/:token`

Accounts:
- `GET /api/accounts`
- `GET /api/accounts/:id`
- `POST /api/accounts`
- `GET /api/accounts/balance-change`

Transactions:
- `GET /api/transactions`
- `GET /api/transactions/user/:userId`
- `POST /api/transactions`
- `GET /api/transactions/by-request/:requestId`

Transfers:
- `POST /api/transfer-requests`
- `POST /api/transfer-requests/verify`

Cards:
- `GET /api/cards/:accountId`
- `POST /api/cards/request`
- `PUT /api/cards/:cardId/freeze`
- `PUT /api/cards/:cardId/settings`
- `GET /api/cards/:cardId/transactions`
- `GET /api/cards/:cardId/available-credit`
- `GET /api/cards/:cardId/credit-limit`

Notifications:
- `GET /api/notifications`
- `GET /api/notifications/:id`
- `PUT /api/notifications/:id/read`
- `PUT /api/notifications/mark-all-read`
- `DELETE /api/notifications/:id`

Support:
- `POST /api/support/tickets`
- `GET /api/support/tickets`
- `GET /api/support/tickets/:id`
- `POST /api/support/messages`
- `POST /api/support/guest`

Loans:
- `GET /api/loans/offers`
- `GET /api/loans/applications`
- `POST /api/loans/applications`
- `GET /api/loans/applications/:id`
- `GET /api/loans/:id/repayments`
- `POST /api/loans/:id/pay`

Activity:
- `GET /api/activity-logs`

## 9) Delivery Note {tags: delivery:note}

Implementation must be executed as a dedicated phase in Task Manager with milestones for:
- Auth and Route Parity
- Accounts and Transactions Parity
- Transfer Verification and Beneficiary Safety
- Cards and Notifications Modernization
- Support and Loans Completion
- Backend Contract/Optimization upgrades
- Cross-cutting QA + E2E hardening

