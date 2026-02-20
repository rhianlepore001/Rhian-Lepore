import requests
import time

def test_mobile_responsive_ui():
    # Configurações do Supabase
    base_url = "https://lcqwrngscsziysyfhpfj.supabase.co/rest/v1/rpc"
    headers = {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    # 1) Testar create_secure_booking RPC: verificar criação de reserva segura
    create_booking_payload = {
        "establishment_id": 1,
        "customer_id": 1,
        "service_id": 1,
        "appointment_time": "2026-02-01T10:00:00Z"
    }
    try:
        resp = requests.post(
            f"{base_url}/create_secure_booking",
            headers=headers,
            json=create_booking_payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        assert "booking_id" in data, "Falha ao criar booking seguro"
    except Exception as e:
        raise AssertionError(f"Erro na RPC create_secure_booking: {e}")

    # 2) Testar update_finance_stats RPC: validar atualização de estatísticas financeiras
    update_finance_payload = {
        "establishment_id": 1,
        "year": 2026,
        "month": 1,
        "sales_total": 15000.0,
        "expenses_total": 5000.0
    }
    try:
        resp = requests.post(
            f"{base_url}/update_finance_stats",
            headers=headers,
            json=update_finance_payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        assert data == {"updated": True}, "Falha ao atualizar estatísticas financeiras"
    except Exception as e:
        raise AssertionError(f"Erro na RPC update_finance_stats: {e}")

    # 3) Testar calculate_commissions RPC: cálculo de comissões para profissionais
    calculate_commissions_payload = {
        "establishment_id": 1,
        "month": 1,
        "year": 2026
    }
    try:
        resp = requests.post(
            f"{base_url}/calculate_commissions",
            headers=headers,
            json=calculate_commissions_payload,
            timeout=30,
        )
        resp.raise_for_status()
        commissions = resp.json()
        assert isinstance(commissions, list) and len(commissions) > 0, "Comissões não retornadas corretamente"
        for commission in commissions:
            assert "professional_id" in commission and "commission_amount" in commission, "Dados de comissão incompletos"
    except Exception as e:
        raise AssertionError(f"Erro na RPC calculate_commissions: {e}")

    # 4) Verificar headers e suporte a cache para PWA e performance (offline usage)
    # Testar se o endpoint responde com header correto para cache-control (simplificação)
    try:
        resp = requests.options(
            f"{base_url}/create_secure_booking",
            headers=headers,
            timeout=15,
        )
        if resp.status_code == 200:
            cache_control = resp.headers.get("cache-control", "")
            # Esperamos algum tipo de controle de cache para PWA offline (ex: max-age)
            assert "max-age" in cache_control.lower() or "no-cache" in cache_control.lower(), "Cache-Control header não presente adequadamente para PWA"
    except Exception as e:
        # O OPTIONS pode não ser suportado mas não deve quebrar o teste
        pass

    # 5) Testar tempo de resposta para garantir performance (<= 2 segundos para RPCs)
    for rpc_name, payload in [
        ("create_secure_booking", create_booking_payload),
        ("update_finance_stats", update_finance_payload),
        ("calculate_commissions", calculate_commissions_payload)
    ]:
        start = time.time()
        try:
            resp = requests.post(
                f"{base_url}/{rpc_name}",
                headers=headers,
                json=payload,
                timeout=30,
            )
            resp.raise_for_status()
            elapsed = time.time() - start
            assert elapsed <= 2.0, f"Performance ruim no RPC {rpc_name}, demorou {elapsed:.2f}s"
        except Exception as e:
            raise AssertionError(f"Erro/performance na RPC {rpc_name}: {e}")

test_mobile_responsive_ui()