import requests
import uuid
from datetime import datetime, timedelta

SUPABASE_URL = "https://lcqwrngscsziysyfhpfj.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug"

HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json",
}

def test_appointment_scheduling_system():
    """
    Test as per TC002:
    Validar as RPCs do sistema de agendamento: create_secure_booking, update_finance_stats, calculate_commissions.
    Também verificar o bloqueio de horários, links públicos de agendamento e gerenciamento de fila.
    """

    # Prepare parameters for create_secure_booking in expected format
    appointment_time = "2026-02-01T14:00:00Z"
    duration_min = 60
    service_id = str(uuid.uuid4())
    professional_id = str(uuid.uuid4())
    business_id = str(uuid.uuid4())  # assuming needed
    client_id = None  # public booking, so no client id

    booking_payload = {
        "p_appointment_time": appointment_time,
        "p_business_id": business_id,
        "p_client_id": client_id,
        "p_custom_service_name": None,
        "p_customer_email": None,
        "p_customer_name": "Cliente Teste",
        "p_customer_phone": "+5511999999999",
        "p_duration_min": duration_min,
        "p_notes": "Agendamento de teste automático",
        "p_professional_id": professional_id,
        "p_service_ids": [service_id],
        "p_status": "pending",
        "p_total_price": 100.0
    }

    try:
        create_booking_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/create_secure_booking",
            headers=HEADERS,
            json=booking_payload,
            timeout=30
        )
        assert create_booking_response.status_code == 200 or create_booking_response.status_code == 201, \
            f"Falha ao criar agendamento seguro: {create_booking_response.text}"
        booking_result = create_booking_response.json()
        assert "booking_id" in booking_result, "Resposta não contém booking_id"
        booking_id = booking_result["booking_id"]

        blocked_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/blocked_times",
            headers=HEADERS,
            params={
                "professional_id": f"eq.{professional_id}",
                "time_range_start": f"gte.{appointment_time}",
                "time_range_end": f"lte.{(datetime.strptime(appointment_time, '%Y-%m-%dT%H:%M:%SZ') + timedelta(minutes=duration_min)).strftime('%Y-%m-%dT%H:%M:%SZ')}"
            },
            timeout=30
        )
        assert blocked_response.status_code == 200, f"Erro ao obter horários bloqueados: {blocked_response.text}"
        blocked_times = blocked_response.json()
        assert any(
            (bt['start_datetime'] <= appointment_time <= bt['end_datetime']) or
            (bt['start_datetime'] <= (datetime.strptime(appointment_time, '%Y-%m-%dT%H:%M:%SZ') + timedelta(minutes=duration_min)).strftime('%Y-%m-%dT%H:%M:%SZ') <= bt['end_datetime'])
            for bt in blocked_times
        ), "Horário não está bloqueado após agendamento"

        finance_payload = {
            "booking_id": booking_id,
            "amount": 100.0,
            "payment_status": "pending"
        }
        finance_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/update_finance_stats",
            headers=HEADERS,
            json=finance_payload,
            timeout=30
        )
        assert finance_response.status_code == 200, f"Erro ao atualizar estatísticas financeiras: {finance_response.text}"
        finance_result = finance_response.json()
        assert "status" in finance_result and finance_result["status"] == "ok", "Falha na atualização das estatísticas financeiras"

        commissions_payload = {
            "professional_id": professional_id,
            "period_start": "2026-02-01",
            "period_end": "2026-02-28"
        }
        commissions_response = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/calculate_commissions",
            headers=HEADERS,
            json=commissions_payload,
            timeout=30
        )
        assert commissions_response.status_code == 200, f"Erro ao calcular comissões: {commissions_response.text}"
        commissions_result = commissions_response.json()
        assert "total_commission" in commissions_result, "Resultado do cálculo de comissões inválido"

        queue_response = requests.get(
            f"{SUPABASE_URL}/rest/v1/queue_status",
            headers=HEADERS,
            params={"professional_id": f"eq.{professional_id}"},
            timeout=30
        )
        assert queue_response.status_code == 200, f"Erro ao consultar status da fila: {queue_response.text}"
        queue_data = queue_response.json()
        assert isinstance(queue_data, list), "Status da fila deve ser uma lista"

    finally:
        if 'booking_id' in locals():
            delete_response = requests.delete(
                f"{SUPABASE_URL}/rest/v1/bookings",
                headers=HEADERS,
                params={"id": f"eq.{booking_id}"},
                timeout=30
            )
            assert delete_response.status_code in [200, 204], f"Falha ao deletar agendamento de teste: {delete_response.text}"

test_appointment_scheduling_system()
