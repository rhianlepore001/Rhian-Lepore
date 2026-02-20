import requests

SUPABASE_URL = "https://lcqwrngscsziysyfhpfj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def test_dashboard_and_reports_data():
    timeout = 30

    # 1. Test create_secure_booking RPC
    create_booking_payload = {
        "date": "2026-01-30",
        "customer_id": 1,
        "service_id": 1,
        "staff_id": 1,
        "start_time": "10:00:00",
        "end_time": "11:00:00"
    }
    try:
        resp_booking = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/create_secure_booking",
            headers=HEADERS,
            json=create_booking_payload,
            timeout=timeout,
        )
        assert resp_booking.status_code == 200, f"create_secure_booking failed: {resp_booking.text}"
        booking_result = resp_booking.json()
        assert "id" in booking_result, "Booking creation response missing booking id"
        booking_id = booking_result["id"]

        # 2. Test update_finance_stats RPC
        update_finance_payload = {
            "establishment_id": 1,
            "date": "2026-01-30"
        }
        resp_finance = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/update_finance_stats",
            headers=HEADERS,
            json=update_finance_payload,
            timeout=timeout,
        )
        assert resp_finance.status_code == 200, f"update_finance_stats failed: {resp_finance.text}"
        finance_result = resp_finance.json()
        assert isinstance(finance_result, dict), "Finance stats response is not a dict"
        # Validations on expected keys for KPIs, revenue, ticket size, occupancy
        expected_keys = ["total_revenue", "average_ticket_size", "occupancy_rate"]
        for key in expected_keys:
            assert key in finance_result, f"Finance stats missing key {key}"
            assert isinstance(finance_result[key], (int, float)), f"{key} is not a number"

        # 3. Test calculate_commissions RPC
        calculate_commissions_payload = {"period": "2026-01"}
        resp_commissions = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/calculate_commissions",
            headers=HEADERS,
            json=calculate_commissions_payload,
            timeout=timeout,
        )
        assert resp_commissions.status_code == 200, f"calculate_commissions failed: {resp_commissions.text}"
        commissions_result = resp_commissions.json()
        # Expect commissions_result to be a list or dict with commissions data
        assert commissions_result is not None, "Commissions result is None"
        # If list, check at least one entry, else if dict, check keys
        if isinstance(commissions_result, list):
            assert len(commissions_result) > 0, "Commissions list is empty"
            for commission in commissions_result:
                assert "professional_id" in commission and "commission_amount" in commission, "Commission entry missing expected keys"
        elif isinstance(commissions_result, dict):
            # Expect keys like total_commissions
            assert "total_commissions" in commissions_result, "Commission dict missing total_commissions key"
        else:
            assert False, "Unexpected commissions result type"

    finally:
        # Cleanup - delete the created booking to maintain test isolation
        if 'booking_id' in locals():
            resp_delete = requests.delete(
                f"{SUPABASE_URL}/rest/v1/bookings?id=eq.{booking_id}",
                headers=HEADERS,
                timeout=timeout,
            )
            # It's recommended but don't assert here to avoid masking original exceptions
            if resp_delete.status_code not in [200, 204]:
                print(f"Warning: Failed to delete booking id {booking_id}: {resp_delete.text}")

test_dashboard_and_reports_data()