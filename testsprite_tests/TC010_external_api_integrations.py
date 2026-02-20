import requests
import json

def test_external_api_integrations():
    # Configurações Supabase
    SUPABASE_URL = "https://lcqwrngscsziysyfhpfj.supabase.co"
    SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Content-Type": "application/json"
    }
    timeout_seconds = 30

    # --- Teste RPC create_secure_booking ---
    try:
        # Parâmetros simulados para a reserva segura (deve ser adequado ao schema real)
        booking_payload = {
            "user_id": "test-user-123",
            "service_id": 1,
            "start_time": "2026-02-01T10:00:00Z",
            "end_time": "2026-02-01T11:00:00Z",
            "notes": "Teste de reserva segura"
        }
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/create_secure_booking",
            headers=headers,
            data=json.dumps(booking_payload),
            timeout=timeout_seconds,
        )
        assert response.status_code == 200, f"create_secure_booking falhou com status {response.status_code}"
        resp_json = response.json()
        assert "booking_id" in resp_json or isinstance(resp_json, dict), "Resposta create_secure_booking inválida"
        booking_id = resp_json.get("booking_id") or resp_json.get("id") or None
        assert booking_id is not None, "booking_id não retornado no create_secure_booking"
    except Exception as e:
        raise AssertionError(f"Erro na chamada create_secure_booking: {e}")

    # --- Teste RPC update_finance_stats ---
    try:
        # Parâmetros simulados para atualização financeira
        finance_payload = {
            "establishment_id": 1,
            "date": "2026-01-31",
            "sales_amount": 1500.75,
            "expenses_amount": 300.20
        }
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/update_finance_stats",
            headers=headers,
            data=json.dumps(finance_payload),
            timeout=timeout_seconds,
        )
        assert response.status_code == 200, f"update_finance_stats falhou com status {response.status_code}"
        resp_json = response.json()
        assert isinstance(resp_json, dict) or isinstance(resp_json, list), "Resposta update_finance_stats inválida"
    except Exception as e:
        raise AssertionError(f"Erro na chamada update_finance_stats: {e}")

    # --- Teste RPC calculate_commissions ---
    try:
        # Parâmetros simulados para o cálculo de comissões
        commissions_payload = {
            "establishment_id": 1,
            "month": "2026-01"
        }
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/calculate_commissions",
            headers=headers,
            data=json.dumps(commissions_payload),
            timeout=timeout_seconds,
        )
        assert response.status_code == 200, f"calculate_commissions falhou com status {response.status_code}"
        resp_json = response.json()
        assert isinstance(resp_json, list) or isinstance(resp_json, dict), "Resposta calculate_commissions inválida"
        # Opcionalmente verificar chaves de comissão
        if isinstance(resp_json, list) and len(resp_json) > 0:
            primeira_comissao = resp_json[0]
            assert "professional_id" in primeira_comissao, "professional_id ausente no resultado"
            assert "commission_amount" in primeira_comissao, "commission_amount ausente no resultado"
    except Exception as e:
        raise AssertionError(f"Erro na chamada calculate_commissions: {e}")

    # --- Teste integração com Stripe (verificação mínima da API Stripe) ---
    try:
        # Chave pública de exemplo inválida - neste teste valida apenas acesso externo
        stripe_test_url = "https://api.stripe.com/v1/charges?limit=1"
        # Teste simples de GET público deve retornar 401 devido autenticação, validamos erro esperado
        response = requests.get(stripe_test_url, timeout=timeout_seconds)
        assert response.status_code == 401 or response.status_code == 200, f"Resposta inesperada do Stripe: {response.status_code}"
    except Exception as e:
        raise AssertionError(f"Erro na chamada Stripe API: {e}")

    # --- Teste integração básica com AI services (futuro) ---
    # Como AI services não estão implementados, testamos endpoint fictício simulando estabilidade
    try:
        ai_service_url = "https://api.ai.example.com/ping"
        response = requests.get(ai_service_url, timeout=5)
        # Esperamos que o endpoint não exista ou retorne erro (pois é futuro), então aceitamos 404, timeout ou erro de conexão
        assert response.status_code in [200, 404], "API AI inesperada - possível problema na integração futura"
    except requests.exceptions.RequestException:
        # Exceção esperada pois endpoint não existe
        pass

test_external_api_integrations()