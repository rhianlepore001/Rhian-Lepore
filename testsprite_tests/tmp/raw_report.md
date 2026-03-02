
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** Rhian-Lepore-main
- **Date:** 2026-03-01
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Successful registration redirects to onboarding
- **Test Code:** [TC001_Successful_registration_redirects_to_onboarding.py](./TC001_Successful_registration_redirects_to_onboarding.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Registration form not found on /register — page displays category selection buttons (e.g., 'Barbearia') instead of inputs for business name, email, password and a Register button.
- Clicking the category button navigated to the login view (URL contains '#/login') instead of revealing a registration form or progressing to an onboarding flow.
- Unable to complete the registration test and reach '/onboarding' because the required registration UI elements are missing from the /register page.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/96639c42-3d3a-4939-8771-4bd3e8d9f724/3f3a7717-8823-4a84-b592-c6e694cca2ab
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Registration with already-registered email shows error
- **Test Code:** [TC002_Registration_with_already_registered_email_shows_error.py](./TC002_Registration_with_already_registered_email_shows_error.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Form submission did not reach the server because client-side required-field validation prevented submission: 'Please fill out this field.' tooltip is displayed for the 'Seu Nome' input.
- Expected server-side error message for an already-used email (containing 'already') was not observed because the form was not submitted.
- Expected text 'account' was not found on the page after the submit attempt.
- The test objective to verify that the system blocks registration for existing emails cannot be validated without a successful form submission to the server.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/96639c42-3d3a-4939-8771-4bd3e8d9f724/52b32d01-4461-4c73-a8ab-f5c477d612ad
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Request password reset with a registered email shows confirmation message
- **Test Code:** [TC009_Request_password_reset_with_a_registered_email_shows_confirmation_message.py](./TC009_Request_password_reset_with_a_registered_email_shows_confirmation_message.py)
- **Test Error:** TEST FAILURE

ASSERTIONS:
- Forgot-password page not found at /forgot-password — page displays selection cards (Barbearia, Beauty & Spa) instead of a forgot password form.
- Email input field not present on the page — cannot enter username rleporesilva@gmail.com.
- 'Send reset link' button not found on the page — cannot submit forgot password request.
- Page title or heading does not contain 'Forgot' — expected heading missing.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/96639c42-3d3a-4939-8771-4bd3e8d9f724/122802fb-67cb-4648-bc47-65e3e92ce7ff
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **0.00** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---