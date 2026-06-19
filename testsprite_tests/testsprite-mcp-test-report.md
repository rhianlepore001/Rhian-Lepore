# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata

- **Project Name:** Rhian-Lepore-main (AgendiX)
- **Date:** 2026-06-10
- **Prepared by:** TestSprite AI Team
- **Environment:** `http://localhost:3000` (Vite production preview)
- **Test scope:** Frontend E2E — 24 test cases (codebase)
- **Account:** Rhian Lepore — Free plan (150 credits)

---

## 2️⃣ Requirement Validation Summary

### Requirement: Login Gateway

**Description:** Users choose barber or beauty experience before the login form appears.

#### Test TC023 — Choose the barber login path

- **Test Code:** [TC023_Choose_the_barber_login_path.py](./TC023_Choose_the_barber_login_path.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/92870a67-8839-4763-b10c-96227b847101
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Gateway correctly reveals the barber-themed email/password form after selecting the Barbearias card.

#### Test TC024 — Choose the beauty login path

- **Test Code:** [TC024_Choose_the_beauty_login_path.py](./TC024_Choose_the_beauty_login_path.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/b0579e80-9e19-4e80-8d3e-a3b3e93353c3
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Beauty segment selection works and shows the alternate login styling as expected.

---

### Requirement: User Login

**Description:** Email/password authentication via Supabase with gateway, validation, and rate limiting.

#### Test TC001 — Access the dashboard after signing in

- **Test Code:** [TC001_Access_the_dashboard_after_signing_in.py](./TC001_Access_the_dashboard_after_signing_in.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/13daa59b-09d1-4cf3-980b-9718c76c0ddc
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Owner login through gateway reaches the dashboard after valid credentials.

#### Test TC002 — Sign in and reach the dashboard

- **Test Code:** [TC002_Sign_in_and_reach_the_dashboard.py](./TC002_Sign_in_and_reach_the_dashboard.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/d449a812-cbc2-4749-a839-806be69353a7
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Duplicate login happy-path confirms consistent behavior across barber card entry.

#### Test TC005 — View the dashboard after logging in

- **Test Code:** [TC005_View_the_dashboard_after_logging_in.py](./TC005_View_the_dashboard_after_logging_in.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/66094710-f40b-4cbf-957d-1e348e8e7c2e
- **Status:** ⛔ BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Blocked by login rate limit (`Muitas tentativas de login. Por segurança, aguarde 1 minuto.`). Security feature works but blocks parallel E2E runs against the same account.

#### Test TC007 — Open the agenda from the dashboard

- **Test Code:** [TC007_Open_the_agenda_from_the_dashboard.py](./TC007_Open_the_agenda_from_the_dashboard.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/8b5ecf3c-1be7-420b-b0b1-2e07dab182fc
- **Status:** ⛔ BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Same rate-limit lockout prevented login; sidebar Agenda link never became available.

#### Test TC011 — Sign in and continue to onboarding

- **Test Code:** [TC011_Sign_in_and_continue_to_onboarding.py](./TC011_Sign_in_and_continue_to_onboarding.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/92977dea-4386-4e48-ba39-13a346d33e87
- **Status:** ⛔ BLOCKED
- **Severity:** LOW
- **Analysis / Findings:** Onboarding redirect could not be verified because login was rate-limited mid-suite.

#### Test TC020 — Show an error for invalid login credentials

- **Test Code:** [TC020_Show_an_error_for_invalid_login_credentials.py](./TC020_Show_an_error_for_invalid_login_credentials.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/4da3e05d-ceb5-4595-b4f8-d6140871cebf
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Invalid credentials surface a clear error message without exposing sensitive details.

---

### Requirement: Dashboard

**Description:** Authenticated home screen with metrics and navigation.

_No additional tests beyond login-group TC001, TC002, TC005, TC007 — see User Login section._

---

### Requirement: Agenda (Scheduling)

**Description:** Calendar view, appointment creation, status updates, and detail inspection.

#### Test TC004 — Create an appointment from the agenda

- **Test Code:** [TC004_Create_an_appointment_from_the_agenda.py](./TC004_Create_an_appointment_from_the_agenda.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/ce4196b4-bb11-495c-b8d6-74853eb52eea
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Full flow (client selection → service → professional → time → confirm) completes successfully.

#### Test TC006 — Update an appointment status from the agenda

- **Test Code:** [TC006_Update_an_appointment_status_from_the_agenda.py](./TC006_Update_an_appointment_status_from_the_agenda.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/8690cf2a-0e84-42a3-81ac-99cf3ab3b1a9
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Status transitions on existing appointments work from the agenda UI.

#### Test TC008 — Open an appointment from the calendar

- **Test Code:** [TC008_Open_an_appointment_from_the_calendar.py](./TC008_Open_an_appointment_from_the_calendar.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/90ea476c-6250-4514-b92b-bd67f3a6f863
- **Status:** ❌ Failed
- **Severity:** MEDIUM
- **Analysis / Findings:** Login and agenda navigation succeeded, but no appointments existed for the test date (`Nenhum agendamento para hoje`). Test data seeding is required to verify detail inspection. Recommendation: seed at least one appointment before this test or run it after TC004 in the same session.

---

### Requirement: Public Booking

**Description:** Unauthenticated clients book via public slug URL.

#### Test TC003 — Book an appointment publicly

- **Test Code:** [TC003_Book_an_appointment_publicly.py](./TC003_Book_an_appointment_publicly.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/4bf0e7d4-4447-4de6-9430-45b8fb318c78
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Public booking entry path and confirmation flow work end-to-end.

#### Test TC013 — See a pending reservation after public booking

- **Test Code:** [TC013_See_a_pending_reservation_after_public_booking.py](./TC013_See_a_pending_reservation_after_public_booking.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/71ff683c-80ec-4aa7-883f-aa9759986d95
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Pending reservation appears in owner view after public booking — good integration between public and authenticated flows.

---

### Requirement: Queue Management

**Description:** Owner manages live walk-in queue.

#### Test TC009 — Owner advances a queued client

- **Test Code:** [TC009_Owner_advances_a_queued_client.py](./TC009_Owner_advances_a_queued_client.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/ba84ceb0-0290-422f-8462-0c810fb51f0d
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Queue advance action updates client status correctly.

#### Test TC010 — Owner removes a client from the queue

- **Test Code:** [TC010_Owner_removes_a_client_from_the_queue.py](./TC010_Owner_removes_a_client_from_the_queue.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/d178b48b-42a2-4447-9042-cf8bd40b3dd4
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Remove-from-queue action works without UI regressions.

---

### Requirement: Client Management (CRM)

**Description:** Search clients and open CRM detail records.

#### Test TC012 — Search and open a client record

- **Test Code:** [TC012_Search_and_open_a_client_record.py](./TC012_Search_and_open_a_client_record.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/c9991f08-67fe-44e5-994d-c2b8f9e155fc
- **Status:** ⛔ BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Client list empty (`Nenhum cliente ainda.`); search for "Silva" returned no results. Empty state is correct but blocks open-record verification.

#### Test TC016 — Review client CRM details after browsing the list

- **Test Code:** [TC016_Review_client_CRM_details_after_browsing_the_list.py](./TC016_Review_client_CRM_details_after_browsing_the_list.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/ae9967aa-616a-4c90-9744-71de32845d56
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** CRM detail view renders when clients exist in the list (test account had data at execution time).

#### Test TC021 — Handle an empty client search result

- **Test Code:** [TC021_Handle_an_empty_client_search_result.py](./TC021_Handle_an_empty_client_search_result.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/191a7c74-a073-4a32-b4d8-607fc236cde6
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Empty search results show appropriate feedback without errors.

---

### Requirement: Finance

**Description:** Revenue summaries, transaction filters, and checkout modal.

#### Test TC014 — Owner opens the finance overview

- **Test Code:** [TC014_Owner_opens_the_finance_overview.py](./TC014_Owner_opens_the_finance_overview.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/eed8cb3a-2fcf-4fd3-ae6b-9c25ec4b6a57
- **Status:** ⛔ BLOCKED
- **Severity:** MEDIUM
- **Analysis / Findings:** Login rate limit prevented reaching `/#/financeiro`.

#### Test TC018 — Owner filters finance transactions by period

- **Test Code:** [TC018_Owner_filters_finance_transactions_by_period.py](./TC018_Owner_filters_finance_transactions_by_period.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/0c305b61-5030-47be-a41f-6a4335634a8a
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Period filter updates the transaction list as expected.

#### Test TC019 — Owner opens the payment checkout modal from finance

- **Test Code:** [TC019_Owner_opens_the_payment_checkout_modal_from_finance.py](./TC019_Owner_opens_the_payment_checkout_modal_from_finance.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/273c5fe1-e34d-4bca-be0b-9c0ce015a581
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Checkout modal opens from finance view without navigation issues.

---

### Requirement: Settings — Service Catalog

**Description:** Owners configure services (add, edit, validate, toggle active).

#### Test TC015 — Owner adds a service to the catalog

- **Test Code:** [TC015_Owner_adds_a_service_to_the_catalog.py](./TC015_Owner_adds_a_service_to_the_catalog.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/5e62d50d-9d46-4208-ae83-25a9fff76385
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** New service creation persists and appears in the catalog list.

#### Test TC017 — Owner edits a service and changes its active status

- **Test Code:** [TC017_Owner_edits_a_service_and_changes_its_active_status.py](./TC017_Owner_edits_a_service_and_changes_its_active_status.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/4063d97d-febb-40fd-b9e2-159f7503903f
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Edit modal and active toggle work correctly.

#### Test TC022 — Owner sees service validation when required fields are incomplete

- **Test Code:** [TC022_Owner_sees_service_validation_when_required_fields_are_incomplete.py](./TC022_Owner_sees_service_validation_when_required_fields_are_incomplete.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537/60cdf37f-6b68-46f7-b347-4b4cd78e9276
- **Status:** ✅ Passed
- **Severity:** LOW
- **Analysis / Findings:** Form validation blocks submit when required fields are missing.

---

## 3️⃣ Coverage & Matching Metrics

- **75%** of tests passed (18 / 24)
- **1** failed, **5** blocked (environment/data/rate-limit — not necessarily product bugs)

| Requirement              | Total Tests | ✅ Passed | ❌ Failed | ⛔ Blocked |
|--------------------------|-------------|-----------|-----------|------------|
| Login Gateway            | 2           | 2         | 0         | 0          |
| User Login               | 6           | 3         | 0         | 3          |
| Agenda (Scheduling)      | 3           | 2         | 1         | 0          |
| Public Booking           | 2           | 2         | 0         | 0          |
| Queue Management         | 2           | 2         | 0         | 0          |
| Client Management (CRM)  | 3           | 2         | 0         | 1          |
| Finance                  | 3           | 2         | 0         | 1          |
| Settings — Services      | 3           | 3         | 0         | 0          |

---

## 4️⃣ Key Gaps / Risks

> **75% pass rate** on first TestSprite run. Core flows (login, agenda creation, public booking, queue, finance filters, service catalog) are solid.

**Risks and recommendations:**

1. **Login rate limiting vs. E2E parallelism** — Multiple concurrent login attempts triggered `Muitas tentativas de login` and blocked 4 tests. For CI/TestSprite reruns: use a dedicated test user, increase cooldown between login tests, or whitelist test IPs in non-production environments.

2. **Test data dependency** — TC008 failed because no appointments existed for today; TC012 blocked on empty client list. Seed fixtures (appointment + client) before suite run, or chain dependent tests in order.

3. **HashRouter paths** — All routes require `/#/` prefix (e.g. `http://localhost:3000/#/login`). Document this in test instructions to avoid navigation failures.

4. **Login gateway step** — Tests must click barber or beauty card before the email/password form appears; already handled in generated Playwright scripts.

5. **Credentials in config** — Login credentials live in `testsprite_tests/tmp/config.json`. Do not commit real passwords to git; use `.env` or CI secrets for production pipelines.

**Dashboard:** Full results with videos — https://www.testsprite.com/dashboard/mcp/tests/97d7df69-41cc-4325-8f38-307ca7976537

---
