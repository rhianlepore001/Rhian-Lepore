import requests
import uuid
from datetime import datetime, timedelta

SUPABASE_URL = "https://lcqwrngscsziysyfhpfj.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug"
HEADERS = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    'Content-Type': 'application/json'
}
TIMEOUT = 30

def test_onboarding_wizard_functionality():
    # 1. Create a new secure booking via RPC create_secure_booking
    # Payload wrapped in a single unnamed JSON parameter (dict) as required by Supabase RPC
    booking_payload = {
        "service_id": str(uuid.uuid4()),
        "client_name": "Test Client",
        "appointment_datetime": (datetime.utcnow() + timedelta(days=1)).isoformat() + 'Z'
    }
    try:
        # Call create_secure_booking RPC with single param JSON
        res_booking = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/create_secure_booking",
            json=booking_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert res_booking.status_code in (200, 201), f"Falha RPC create_secure_booking: {res_booking.text}"
        res_booking_json = res_booking.json()
        # The response should be a dict containing at least an 'id' for the booking
        assert isinstance(res_booking_json, dict), "Resposta create_secure_booking não é um dicionário"
        booking_id = res_booking_json.get("id")
        assert booking_id, "ID do booking não retornado"

        # 2. Update finance stats via RPC update_finance_stats
        finance_payload = {
            "booking_id": booking_id,
            "amount": 150.75,
            "currency": "BRL"
        }
        res_finance = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/update_finance_stats",
            json=finance_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert res_finance.status_code == 200, f"Falha RPC update_finance_stats: {res_finance.text}"
        finance_res_json = res_finance.json()
        # The response expected to contain a 'success' key set to True
        assert isinstance(finance_res_json, dict), "Resposta update_finance_stats não é um dicionário"
        assert finance_res_json.get("success") is True, "update_finance_stats não retornou sucesso"

        # 3. Calculate commissions via RPC calculate_commissions
        commissions_payload = {
            "booking_id": booking_id
        }
        res_commissions = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/calculate_commissions",
            json=commissions_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert res_commissions.status_code == 200, f"Falha RPC calculate_commissions: {res_commissions.text}"
        commissions_json = res_commissions.json()
        # Expected to contain 'commissions' key with commission details
        assert isinstance(commissions_json, dict), "Resposta calculate_commissions não é um dicionário"
        assert "commissions" in commissions_json, "Resposta calculate_commissions não contém 'commissions'"

    except requests.exceptions.RequestException as e:
        assert False, f"Erro na requisição HTTP: {e}"


test_onboarding_wizard_functionality()
