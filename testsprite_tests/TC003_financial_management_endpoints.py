import requests
import json

SUPABASE_URL = "https://lcqwrngscsziysyfhpfj.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug"

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

def test_financial_management_endpoints():
    # Test create_secure_booking RPC
    create_booking_payload = {
        "customer_email": "teste@teste.com",
        "service_id": 1,
        "professional_id": 1,
        "booking_time": "2026-02-01T15:00:00Z",
        "duration": 60
    }
    try:
        response_booking = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/create_secure_booking",
            headers=HEADERS,
            data=json.dumps(create_booking_payload),
            timeout=30
        )
        assert response_booking.status_code == 200 or response_booking.status_code == 201, f"create_secure_booking falhou com status {response_booking.status_code}"
        booking_result = response_booking.json()
        assert isinstance(booking_result, dict), "create_secure_booking não retornou um objeto JSON"
        assert "id" in booking_result, "create_secure_booking não retornou id do agendamento"
        booking_id = booking_result.get("id")
    except Exception as e:
        raise AssertionError(f"Erro ao executar create_secure_booking: {e}")

    # Test update_finance_stats RPC
    update_finance_payload = {
        "establishment_id": 1,
        "date": "2026-02-01",
        "total_sales": 1500.0,
        "cash_flow": 700.0,
        "card_flow": 800.0
    }
    try:
        response_finance = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/update_finance_stats",
            headers=HEADERS,
            data=json.dumps(update_finance_payload),
            timeout=30
        )
        assert response_finance.status_code == 200, f"update_finance_stats falhou com status {response_finance.status_code}"
        finance_result = response_finance.json()
        assert isinstance(finance_result, list), "update_finance_stats não retornou uma lista JSON"
    except Exception as e:
        raise AssertionError(f"Erro ao executar update_finance_stats: {e}")

    # Test calculate_commissions RPC
    calculate_commissions_payload = {
        "professional_id": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-01-31"
    }
    try:
        response_commissions = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/calculate_commissions",
            headers=HEADERS,
            data=json.dumps(calculate_commissions_payload),
            timeout=30
        )
        assert response_commissions.status_code == 200, f"calculate_commissions falhou com status {response_commissions.status_code}"
        commissions_result = response_commissions.json()
        assert isinstance(commissions_result, list), "calculate_commissions não retornou uma lista JSON"
        # Caso haja dados no resultado, verificar campos esperados
        if commissions_result:
            assert "commission_amount" in commissions_result[0], "calculate_commissions: falta commission_amount no resultado"
            assert isinstance(commissions_result[0]["commission_amount"], (int, float)), "commission_amount deve ser numérico"
    except Exception as e:
        raise AssertionError(f"Erro ao executar calculate_commissions: {e}")

test_financial_management_endpoints()