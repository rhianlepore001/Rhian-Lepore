
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** Rhian-Lepore-main
- **Date:** 2026-03-07
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Open Dashboard and access detailed Insights from a KPI card
- **Test Code:** [TC001_Open_Dashboard_and_access_detailed_Insights_from_a_KPI_card.py](./TC001_Open_Dashboard_and_access_detailed_Insights_from_a_KPI_card.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway/login UI not rendered: page shows no interactive elements (0 interactive elements) preventing any further actions.
- Current URL is http://localhost:4173/#/login but the SPA did not load the expected UI (gateway cards or login form).
- Multiple recovery attempts (waits and refresh) were performed and did not produce the required interactive elements.
- Unable to click 'Barbearia' or access the login form, so the KPI/dashboard flow cannot be tested.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/8d503088-1b78-419a-a14f-f59a9b584d17
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Dashboard displays core KPI cards (revenue, average ticket, occupancy)
- **Test Code:** [TC002_Dashboard_displays_core_KPI_cards_revenue_average_ticket_occupancy.py](./TC002_Dashboard_displays_core_KPI_cards_revenue_average_ticket_occupancy.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- ASSERTION: Navigation to http://localhost:4173/#/login resulted in a blank page with 0 interactive elements, so the SPA did not render.
- ASSERTION: The gateway screen with the 'Barbearia' card is not present, preventing the required first click to start the login flow.
- ASSERTION: The login form (Email and Senha fields) is not reachable, so credentials cannot be entered and authentication cannot proceed.
- ASSERTION: The page was waited for 3 seconds after navigation and remained empty, indicating the app failed to load within the expected time.
- ASSERTION: Navigation to http://localhost:3000 also returned a blank/placeholder page, suggesting the application server or frontend bundle is not being served correctly.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/99c0eaf1-7adf-47bf-8684-6ffc347da05c
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 Refresh metrics updates Dashboard visuals
- **Test Code:** [TC003_Refresh_metrics_updates_Dashboard_visuals.py](./TC003_Refresh_metrics_updates_Dashboard_visuals.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Dynamic import of login module failed: 'Login-CPILHRLN.js' could not be fetched, causing the application to display an interruption error.
- Gateway/login UI not present; the 'Barbearia' gateway card and login form are not accessible on the page.
- Unable to perform the login sequence (email/password/Entrar) because the application failed to load the login module.
- Refresh metrics and dashboard verification could not be executed because the application did not render the dashboard due to the load failure.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/a3677a91-1cd9-46c7-bc28-74c18ef331c9
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Weekly view shows appointments laid out by time and staff
- **Test Code:** [TC007_Weekly_view_shows_appointments_laid_out_by_time_and_staff.py](./TC007_Weekly_view_shows_appointments_laid_out_by_time_and_staff.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/7202a8ed-db23-476c-9733-a4eb139f51aa
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Create appointment successfully and see it on the calendar
- **Test Code:** [TC008_Create_appointment_successfully_and_see_it_on_the_calendar.py](./TC008_Create_appointment_successfully_and_see_it_on_the_calendar.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway/login UI did not render on the application base URL (http://localhost:4173/#/); the page contains no interactive elements.
- The 'Barbearia' gateway card is not present, preventing access to the two-step login flow required for authentication.
- Login form fields ('Email' and 'Senha') are not visible; authentication cannot be performed.
- Agenda/calendar page cannot be accessed because the authentication step could not be completed.
- Unable to verify appointment creation because the SPA failed to render and no UI elements are available to interact with.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/7cfef1f9-6a37-4214-a9e4-f31ee327e9c5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Create appointment - select service and save
- **Test Code:** [TC009_Create_appointment___select_service_and_save.py](./TC009_Create_appointment___select_service_and_save.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login module failed to load: dynamic import error 'Failed to fetch dynamically imported module: http://localhost:4173/assets/Login-CPILHRLN.js' is displayed on the page.
- Gateway login UI (cards including 'Barbearia') did not render and required interactive elements for the login flow are absent.
- Appointment creation flow could not be executed because the SPA failed to initialize and the necessary UI elements for selecting service/date/time are not available.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/a3c53405-e9de-4f00-b1b3-24ac829631d3
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 After saving, new appointment is visible on the calendar
- **Test Code:** [TC010_After_saving_new_appointment_is_visible_on_the_calendar.py](./TC010_After_saving_new_appointment_is_visible_on_the_calendar.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- SPA at http://localhost:4173/#/login failed to render; no interactive elements were present to continue the test.
- A runtime error 'TypeError: Failed to fetch dynamically imported module' was observed on the page, indicating module loading failure.
- Attempting to reload the app resulted in a browser-level error (ERR_EMPTY_RESPONSE) and only a reload control was visible.
- The gateway cards (including the required 'Barbearia' card) and the login form could not be accessed, preventing the login step.
- Appointment creation and verification steps could not be executed because the application did not reach a usable state.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/46306c3d-6a18-4eaa-94f1-9f5c8ce5b96a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Prevent creating appointment in a conflicting time slot
- **Test Code:** [TC011_Prevent_creating_appointment_in_a_conflicting_time_slot.py](./TC011_Prevent_creating_appointment_in_a_conflicting_time_slot.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway selection cards ('Barbearia' / 'Beauty & Spa') not present on http://localhost:4173/#/login
- Login form fields 'Email' and 'Senha' not found; no interactive elements available
- SPA failed to render; page reports 0 interactive elements
- Unable to perform login and reach the Agenda page to test appointment conflict
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/58ab7a03-27e7-4020-b5bc-6a66d17b69c1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Conflict error message is shown on save attempt
- **Test Code:** [TC012_Conflict_error_message_is_shown_on_save_attempt.py](./TC012_Conflict_error_message_is_shown_on_save_attempt.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway page at http://localhost:4173/#/ did not render: 0 interactive elements detected on the page.
- Login page at http://localhost:4173/#/login did not display the login form (Email/Password fields): 0 interactive elements present.
- Application UI remained empty after multiple navigation and wait attempts, preventing any interaction required to perform the appointment conflict test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/ef3b11b9-759d-41a2-8500-cf412d0981f4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Mark an appointment as completed and see status change
- **Test Code:** [TC013_Mark_an_appointment_as_completed_and_see_status_change.py](./TC013_Mark_an_appointment_as_completed_and_see_status_change.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway/login UI not rendered after navigation to http://localhost:4173/#/login; page shows 0 interactive elements.
- Gateway cards (e.g., 'Barbearia') not present on the page, so the required click to proceed to login cannot be performed.
- Repeated waits (3s and 5s) did not cause the SPA to render, indicating the application may not be serving the expected UI.
- No interactive elements available to enter credentials or click 'ENTRAR', preventing completion of the login flow and subsequent appointment actions.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/7538dfb6-3de2-471b-8b5b-6f6ef8692f1a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC015 Add a customer to the digital queue with required details
- **Test Code:** [TC015_Add_a_customer_to_the_digital_queue_with_required_details.py](./TC015_Add_a_customer_to_the_digital_queue_with_required_details.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Main application did not load after login; onboarding loader ('Carregando...') remains visible and there are 0 interactive elements on the page.
- Expected main/dashboard route ('/' or app navigation such as 'Fila') was not reached; current URL is http://localhost:4173/#/onboarding.
- No 'Fila', 'Adicionar' or other main navigation UI elements are present, preventing the queue-add flow from being executed or verified.
- Multiple waits and a completed login submission (email/password entered, 'ENTRAR' clicked) did not change the page state; the SPA appears stuck in onboarding/loading and is not interactive.
- Unable to verify adding 'Cliente Teste' to the 'Aguardando' queue because the required UI to perform or validate that action is not available.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/62a514c9-3a32-4bee-8ade-b7aa3233fed7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC016 Call next moves the top waiting customer into service
- **Test Code:** [TC016_Call_next_moves_the_top_waiting_customer_into_service.py](./TC016_Call_next_moves_the_top_waiting_customer_into_service.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Post-login onboarding screen 'Carregando...' is displayed at /#/onboarding, preventing access to the main application UI.
- Main navigation item 'Fila' is not present on the current page, so queue operations cannot be performed.
- Controls required to add or call customers (for example 'Adicionar' and 'Chamar próximo') are not available on the current page.
- Multiple waits and navigation attempts did not resolve the loading state; the application remained stuck in onboarding and did not render the post-login UI.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/6d24e57d-e4af-4e08-b7d7-d7d2f6e3f6ca
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC017 Validation error when adding to queue without required fields
- **Test Code:** [TC017_Validation_error_when_adding_to_queue_without_required_fields.py](./TC017_Validation_error_when_adding_to_queue_without_required_fields.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login gateway not available: page loaded with no interactive elements (0 interactive elements present), preventing the login flow.
- Application failed to initialize due to runtime/module load error or empty response (e.g., 'ERR_EMPTY_RESPONSE' or 'Failed to fetch dynamically imported module'), so core UI is not reachable.
- Reload attempts did not recover the application; interactive UI elements like gateway cards or the login form are not present.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/07b7e69d-eea4-40b8-ac83-bef7ccc797c1
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC020 View clients list and open a client profile
- **Test Code:** [TC020_View_clients_list_and_open_a_client_profile.py](./TC020_View_clients_list_and_open_a_client_profile.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Main navigation never appeared after login; 'Clientes' menu item not reachable and clients list cannot be verified.
- Current page contains 0 interactive elements (blank or still onboarding/loading) preventing further interaction.
- Login was submitted (credentials entered and ENTRAR clicked) but the app remained on an onboarding/loading or blank screen and did not render the expected app UI.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/d1dd487a-ed39-4c08-af80-2a2a28e4e1b5
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC021 Search clients by name filters the list
- **Test Code:** [TC021_Search_clients_by_name_filters_the_list.py](./TC021_Search_clients_by_name_filters_the_list.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway/login page did not render: 0 interactive elements present on http://localhost:4173/#/login, preventing any interactions.
- 'Barbearia' card not found on the gateway screen, so the two-step login flow cannot be started.
- Login form did not appear and credentials could not be entered (email/password fields absent), preventing authentication.
- Clients page and client search could not be accessed because the login step could not be completed.
- The client-filtering test was not executed because the application failed to load and render required UI elements.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/595af799-5316-48f0-8359-a4b786092edc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC024 Add client: missing contact shows validation error
- **Test Code:** [TC024_Add_client_missing_contact_shows_validation_error.py](./TC024_Add_client_missing_contact_shows_validation_error.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Onboarding/loading screen is displayed at http://localhost:4173/#/onboarding with a loading spinner and message 'Carregando... / Preparando seu setup', preventing interaction.
- There are 0 interactive elements on the page, so navigation to 'Clientes' and the Add Client form is not possible.
- Multiple login and reload attempts were performed (gateway selection, credentials submitted, 'Recarregar Página' clicked, and several waits) but the application remained in onboarding state.
- Login was submitted (credentials entered and 'ENTRAR' clicked) yet the post-login dashboard did not render, blocking the test flow.
- Cannot reach the '/clientes' page to perform the Add Client validation steps required by the test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/a519eceb-1fe9-4b98-b2ba-175db1eb748a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC027 View cashflow charts on Finance page (daily and monthly)
- **Test Code:** [TC027_View_cashflow_charts_on_Finance_page_daily_and_monthly.py](./TC027_View_cashflow_charts_on_Finance_page_daily_and_monthly.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login gateway not reachable: page displays 'Sistema Interrompido' instead of the expected gateway with 'Barbearia' and 'Beauty & Spa' cards.
- Dynamic import failed: TypeError: Failed to fetch dynamically imported module: http://localhost:4173/assets/Login-CPILHRLN.js.
- Reloading the page via the 'Recarregar Página' button did not restore the application UI; the error persisted.
- Authentication flow could not be executed because the login form never appeared, so Financeiro page and charts could not be verified.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/cc652d15-e7c5-4d49-99cc-c9ce60c36e8f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC028 Open a specific day to view that day's transactions
- **Test Code:** [TC028_Open_a_specific_day_to_view_that_days_transactions.py](./TC028_Open_a_specific_day_to_view_that_days_transactions.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway cards (e.g., 'Barbearia') not found on http://localhost:4173/#/ or /#/login; page shows 0 interactive elements.
- Login form fields 'Email' and 'Senha' are not present, preventing authentication with the provided credentials.
- SPA content did not render after multiple waits and navigations; only a dark background is visible.
- Unable to reach or interact with the 'Financeiro' page because login cannot be performed.
- Current URL is http://localhost:4173/#/ but the page lacks the expected UI elements required by the test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/a3f9004e-548e-4500-acb6-87a4fe27ea36
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC029 Add an Income transaction and verify it appears in the ledger
- **Test Code:** [TC029_Add_an_Income_transaction_and_verify_it_appears_in_the_ledger.py](./TC029_Add_an_Income_transaction_and_verify_it_appears_in_the_ledger.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway/login screen not reachable at http://localhost:4173/#/login: the page currently shows 0 interactive elements.
- Login flow could not be completed because the application repeatedly entered a loading/onboarding or blank state with no actionable UI.
- Post-login UI (navigation including 'Financeiro') never appeared, preventing verification of adding a transaction.
- Attempts to reload and navigate to the gateway did not restore the interactive UI, so the feature could not be exercised.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/f7908aeb-445f-4c54-b568-4a44740c3d3b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC031 Validation: amount required when saving a transaction with empty amount
- **Test Code:** [TC031_Validation_amount_required_when_saving_a_transaction_with_empty_amount.py](./TC031_Validation_amount_required_when_saving_a_transaction_with_empty_amount.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway/login UI did not render on http://localhost:4173/#/login; page shows no interactive elements (0 interactive elements detected).
- Expected gateway cards (e.g., 'Barbearia') were not present on the page.
- Login form fields (Email and Senha) and the 'ENTRAR' button did not appear, preventing continuation of the login flow.

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/38e1dfeb-beac-45e1-b96c-b1b74a743ac4
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC034 Generate a campaign from a template and view generated copy and CTA
- **Test Code:** [TC034_Generate_a_campaign_from_a_template_and_view_generated_copy_and_CTA.py](./TC034_Generate_a_campaign_from_a_template_and_view_generated_copy_and_CTA.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Gateway cards (e.g., 'Barbearia') not found: login/gateway page shows 0 interactive elements on http://localhost:4173/#/login.
- Login form fields 'Email' and 'Senha' are not present, preventing credential entry and authentication.
- The SPA did not render after multiple navigations and waits; the page remained blank/dark indicating required resources failed to load.
- Unable to proceed to application pages (e.g., / or /marketing) because the UI never became interactive.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/611ad115-f8b4-4d5a-9a63-7c119317bd2b
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC035 Apply target audience filter and generate campaign successfully
- **Test Code:** [TC035_Apply_target_audience_filter_and_generate_campaign_successfully.py](./TC035_Apply_target_audience_filter_and_generate_campaign_successfully.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Post-login UI did not render after login: the page shows a loading spinner and reports 0 interactive elements, preventing further interactions.
- The 'Marketing' navigation item could not be found or clicked, so navigation to /marketing could not be performed.
- The target audience filter and the 'Generate campaign' control were not accessible, so generated copy and 'CTA' visibility could not be verified.
- Multiple reload and wait attempts did not recover the application state; the environment prevented completion of the test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/81de623b-d3c5-4cf7-a237-fafbd73a0809
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC036 Generated campaign content is displayed after clicking Generate
- **Test Code:** [TC036_Generated_campaign_content_is_displayed_after_clicking_Generate.py](./TC036_Generated_campaign_content_is_displayed_after_clicking_Generate.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login page failed to load due to runtime error "TypeError: Failed to fetch dynamically imported module: http://localhost:4173/assets/Login-CPILHRLN.js" displayed on the interruption screen.
- 'Barbearia' gateway card not found because the application shows an interruption error instead of the login/gateway UI.
- Generate campaign workflow could not be executed because the application failed to render required JavaScript modules.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/75fc9fa3-f1a7-4f1c-80ff-a040a5ee6c18
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC037 Send campaign and confirm queued success message
- **Test Code:** [TC037_Send_campaign_and_confirm_queued_success_message.py](./TC037_Send_campaign_and_confirm_queued_success_message.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Onboarding page is displayed at 'http://localhost:4173/#/onboarding' with a centered loading spinner and text 'Carregando... / Preparando seu setup', preventing interactions.
- Page contains 0 interactive elements, so the 'Marketing' navigation item cannot be accessed and the campaign flow cannot be executed.
- Login was submitted (ENTRAR clicked) but the authenticated UI (main navigation) did not render after repeated waits.
- Repeated waits (total 5) did not resolve the loading state; the application remains stuck in onboarding and no alternative clickable elements are available to continue the test.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/5e96c928-3af7-4f8f-aaa9-bfe9e6b85ff6
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC039 Generate campaign with insufficient data shows required info error
- **Test Code:** [TC039_Generate_campaign_with_insufficient_data_shows_required_info_error.py](./TC039_Generate_campaign_with_insufficient_data_shows_required_info_error.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- After submitting login credentials, the app remained on the onboarding/loading screen (/#/onboarding) and did not render the main UI.
- The page shows a persistent loading spinner with text 'Carregando... Preparando seu setup' and reports 0 interactive elements, preventing navigation to the Marketing page.
- Unable to reach or interact with the Marketing section to click 'Generate campaign' and verify the expected error message because the application did not complete loading.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/913cb76f-b791-433a-8cde-e82fb16d3063
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC042 View Insights page and confirm revenue and occupancy charts are visible
- **Test Code:** [TC042_View_Insights_page_and_confirm_revenue_and_occupancy_charts_are_visible.py](./TC042_View_Insights_page_and_confirm_revenue_and_occupancy_charts_are_visible.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Login did not complete - the application remained on the onboarding/loading screen with a centered spinner and no interactive elements available for further navigation.
- Main application UI did not render after multiple reloads and waits, preventing access to the main navigation (including 'Insights').
- A dynamic module load error was observed earlier (failed to fetch dynamically imported module), indicating application asset or build issues that block rendering.
- Current page contains 0 interactive elements at URL http://localhost:4173/#/, so UI-driven navigation and verification cannot proceed.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/bb5c2ca5-9198-44a9-be17-ad647257e7ba
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC043 Change timeframe and verify charts update
- **Test Code:** [TC043_Change_timeframe_and_verify_charts_update.py](./TC043_Change_timeframe_and_verify_charts_update.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Insights page not reachable: current URL is http://localhost:4173/#/onboarding and the onboarding loading spinner is displayed instead of Insights content.
- Main navigation and 'Insights' control are not available on the page; 0 interactive elements detected.
- The application remained in a persistent loading state after reload/recovery attempts and did not render the dashboard or Insights content.
- A dynamic module import failure was reported earlier (failed to fetch a dynamically imported module), preventing required components from loading.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/76a80cca-1a53-49e9-9853-ab561f7df716
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC045 Export report flow shows export format options
- **Test Code:** [TC045_Export_report_flow_shows_export_format_options.py](./TC045_Export_report_flow_shows_export_format_options.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Onboarding/module failed to load: dynamic import error 'OnboardingWizard-CM3S4Mif.js' prevented the SPA from rendering required UI.
- The application displays a full-page error 'SISTEMA INTERROMPIDO' which blocks access to the main navigation and app features.
- Only a 'Recarregar Página' button is interactive on the page, so the 'Insights' and 'Exportar' controls cannot be reached to validate export formats.
- The export flow could not be tested because the app did not render post-login content; therefore verification of 'CSV' visibility is not possible.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/7aaada16-b472-48a6-a23b-2d00ee9ae05a
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC046 Select a timeframe with no data and confirm empty-state message
- **Test Code:** [TC046_Select_a_timeframe_with_no_data_and_confirm_empty_state_message.py](./TC046_Select_a_timeframe_with_no_data_and_confirm_empty_state_message.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Onboarding module failed to load: "TypeError: Failed to fetch dynamically imported module: http://localhost:4173/assets/OnboardingWizard-CM3S4Mif.js" is shown on the page.
- The application displays a crash screen "SISTEMA INTERROMPIDO" and the main UI/navigation required for the test is not present.
- Only a 'Recarregar Página' button and a static SVG are interactive; navigation items (including 'Insights') and controls are not available to continue the test.
- Login completed but the app did not render the post-login UI (current URL: http://localhost:4173/#/onboarding) and no further interactions are possible.
- The test cannot proceed because a dynamically imported client bundle failed to load, blocking all remaining test steps.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/a49afce5-9ada-4e3f-b541-cdf755bf1b82
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC048 Join queue successfully and receive status link
- **Test Code:** [TC048_Join_queue_successfully_and_receive_status_link.py](./TC048_Join_queue_successfully_and_receive_status_link.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Public queue join URL (/queue/...) not provided in the test environment or instructions, preventing navigation to the join page.
- Current page http://localhost:3000/ rendered no interactive elements; SPA appears not loaded.
- No navigation links or elements found on the current site that lead to a public /queue/... join page.
- Unable to verify presence of 'Join queue', 'Confirmation', 'Position', or 'View status' UI because the join page could not be reached.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/5915e28d-6bd4-4caa-8784-03191016cb29/fd53be71-b2d4-49df-87ed-ac697359c99e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **3.33** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---