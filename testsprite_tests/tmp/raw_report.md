
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** Rhian-Lepore-main
- **Date:** 2026-02-18
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 user authentication flows
- **Test Code:** [TC001_user_authentication_flows.py](./TC001_user_authentication_flows.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 109, in <module>
  File "<string>", line 58, in test_user_authentication_flows
AssertionError: Falha no pedido de recuperação de senha: {"code":400,"error_code":"email_address_invalid","msg":"Email address \"testuser-98e722ec@example.com\" is invalid"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/2c8b28f6-67be-4a99-bb62-191a1a48a354
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 appointment scheduling system
- **Test Code:** [TC002_appointment_scheduling_system.py](./TC002_appointment_scheduling_system.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 126, in <module>
  File "<string>", line 52, in test_appointment_scheduling_system
AssertionError: Falha ao criar agendamento seguro: {"code":"23503","details":"Key (business_id)=(19268b19-39d1-434f-a9f4-19fb673faba9) is not present in table \"profiles\".","hint":null,"message":"insert or update on table \"public_bookings\" violates foreign key constraint \"public_bookings_business_id_fkey\""}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/b5850336-bb8d-4e4e-b964-aeb4973ffa8e
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 financial management endpoints
- **Test Code:** [TC003_financial_management_endpoints.py](./TC003_financial_management_endpoints.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 29, in test_financial_management_endpoints
AssertionError: create_secure_booking falhou com status 404

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 81, in <module>
  File "<string>", line 35, in test_financial_management_endpoints
AssertionError: Erro ao executar create_secure_booking: create_secure_booking falhou com status 404

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/cf0d647f-c28a-41c7-9b50-e0f6dd45ffdc
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 dashboard and reports data
- **Test Code:** [TC004_dashboard_and_reports_data.py](./TC004_dashboard_and_reports_data.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 91, in <module>
  File "<string>", line 31, in test_dashboard_and_reports_data
AssertionError: create_secure_booking failed: {"code":"PGRST202","details":"Searched for the function public.create_secure_booking with parameters customer_id, date, end_time, service_id, staff_id, start_time or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.","hint":null,"message":"Could not find the function public.create_secure_booking(customer_id, date, end_time, service_id, staff_id, start_time) in the schema cache"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/3a04d150-d64a-43c4-840c-0c8d8969a523
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 custom theme application
- **Test Code:** [TC005_custom_theme_application.py](./TC005_custom_theme_application.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 91, in <module>
  File "<string>", line 27, in test_custom_theme_application
AssertionError: Falha ao criar estabelecimento: {"code":"PGRST205","details":null,"hint":"Perhaps you meant the table 'public.appointments'","message":"Could not find the table 'public.establishments' in the schema cache"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/1fe944f9-0b13-48a3-9aee-38dd9eacf57f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 mobile responsive ui
- **Test Code:** [TC006_mobile_responsive_ui.py](./TC006_mobile_responsive_ui.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 28, in test_mobile_responsive_ui
  File "/var/task/requests/models.py", line 1024, in raise_for_status
    raise HTTPError(http_error_msg, response=self)
requests.exceptions.HTTPError: 404 Client Error: Not Found for url: https://lcqwrngscsziysyfhpfj.supabase.co/rest/v1/rpc/create_secure_booking

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 112, in <module>
  File "<string>", line 32, in test_mobile_responsive_ui
AssertionError: Erro na RPC create_secure_booking: 404 Client Error: Not Found for url: https://lcqwrngscsziysyfhpfj.supabase.co/rest/v1/rpc/create_secure_booking

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/328db5b3-3a6b-4331-908c-fc2f099c1365
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 security and data isolation
- **Test Code:** [TC007_security_and_data_isolation.py](./TC007_security_and_data_isolation.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 125, in <module>
  File "<string>", line 74, in test_security_and_data_isolation
AssertionError: Erro ao criar booking tenant 1: {"code":"PGRST202","details":"Searched for the function public.create_secure_booking with parameters booking_id, customer_name, end_time, professional_id, service_id, start_time, tenant_id or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.","hint":null,"message":"Could not find the function public.create_secure_booking(booking_id, customer_name, end_time, professional_id, service_id, start_time, tenant_id) in the schema cache"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/14351080-7338-450d-9bb4-263da306a5d7
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 queue management system
- **Test Code:** [TC008_queue_management_system.py](./TC008_queue_management_system.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 85, in <module>
  File "<string>", line 34, in test_queue_management_system
AssertionError: create_secure_booking falhou: {"code":"PGRST202","details":"Searched for the function public.create_secure_booking with parameter json or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.","hint":null,"message":"Could not find the function public.create_secure_booking(json) in the schema cache"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/d7e67ff4-4edb-487a-968d-2f0b384ca45f
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 onboarding wizard functionality
- **Test Code:** [TC009_onboarding_wizard_functionality.py](./TC009_onboarding_wizard_functionality.py)
- **Test Error:** Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 75, in <module>
  File "<string>", line 30, in test_onboarding_wizard_functionality
AssertionError: Falha RPC create_secure_booking: {"code":"PGRST202","details":"Searched for the function public.create_secure_booking with parameters appointment_datetime, client_name, service_id or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.","hint":null,"message":"Could not find the function public.create_secure_booking(appointment_datetime, client_name, service_id) in the schema cache"}

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/4ab064d4-be72-497e-98ca-da75826f7815
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 external api integrations
- **Test Code:** [TC010_external_api_integrations.py](./TC010_external_api_integrations.py)
- **Test Error:** Traceback (most recent call last):
  File "<string>", line 31, in test_external_api_integrations
AssertionError: create_secure_booking falhou com status 404

During handling of the above exception, another exception occurred:

Traceback (most recent call last):
  File "/var/task/handler.py", line 258, in run_with_retry
    exec(code, exec_env)
  File "<string>", line 105, in <module>
  File "<string>", line 37, in test_external_api_integrations
AssertionError: Erro na chamada create_secure_booking: create_secure_booking falhou com status 404

- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/e1f06907-5f94-4227-a017-9e85e24b5ca2/94677e5e-9eb8-42be-b6de-26ee6e3e60c4
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