import requests
import json

# Configurações Supabase
SUPABASE_URL = "https://lcqwrngscsziysyfhpfj.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug"
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

def test_queue_management_system():
    # Teste focado nas RPCs: create_secure_booking, update_finance_stats e calculate_commissions

    try:
        ## 1. testando create_secure_booking
        # Dados de entrada para create_secure_booking (payload wrapped in a single json parameter)
        create_secure_booking_payload = {
            "json": {
                "client_id": "client_test_123",
                "service_id": "service_test_123",
                "scheduled_time": "2026-02-01T14:00:00Z",
                "notes": "Teste reserva segura via API"
            }
        }

        create_booking_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/create_secure_booking",
            headers=HEADERS,
            data=json.dumps(create_secure_booking_payload),
            timeout=30
        )
        assert create_booking_response.status_code == 200, f"create_secure_booking falhou: {create_booking_response.text}"
        booking_result = create_booking_response.json()
        assert booking_result and "id" in booking_result, "create_secure_booking: id da reserva não retornado"

        booking_id = booking_result["id"]

        ## 2. testando update_finance_stats
        update_finance_stats_payload = {
            "booking_id": booking_id,
            "amount": 150.00,
            "payment_method": "cash",
            "status": "completed"
        }

        update_finance_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/update_finance_stats",
            headers=HEADERS,
            data=json.dumps(update_finance_stats_payload),
            timeout=30
        )
        assert update_finance_response.status_code == 200, f"update_finance_stats falhou: {update_finance_response.text}"
        finance_result = update_finance_response.json()
        assert finance_result and finance_result.get("success") is True, "update_finance_stats não retornou sucesso"

        ## 3. testando calculate_commissions
        calculate_commissions_payload = {
            "booking_id": booking_id
        }

        calculate_commissions_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/calculate_commissions",
            headers=HEADERS,
            data=json.dumps(calculate_commissions_payload),
            timeout=30
        )
        assert calculate_commissions_response.status_code == 200, f"calculate_commissions falhou: {calculate_commissions_response.text}"
        commissions_result = calculate_commissions_response.json()
        assert commissions_result and "total_commission" in commissions_result, "calculate_commissions não retornou total_commission"

    finally:
        # Limpar dados criados para o teste (delete booking)
        if 'booking_id' in locals():
            # Supomos que exista endpoint para deletar booking no Supabase
            # Caso não exista, desconsiderar.
            delete_response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/bookings?id=eq.{booking_id}",
                headers=HEADERS,
                timeout=30
            )
            assert delete_response.status_code in (200, 204), f"Falha ao deletar booking pós-teste: {delete_response.text}"

test_queue_management_system()
