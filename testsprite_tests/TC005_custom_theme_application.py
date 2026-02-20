import requests

SUPABASE_URL = "https://lcqwrngscsziysyfhpfj.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

def test_custom_theme_application():
    # Primeiro, criamos um estabelecimento para testar a aplicação e troca de temas
    est_data = {
        "name": "Teste Tema Estabelecimento",
        "address": "Av. Teste, 123",
        "phone": "999999999",
        "preferences": {}  # Pode variar conforme schema real - assumido vazio para iniciar
    }
    try:
        # Criação do estabelecimento
        create_res = requests.post(
            f"{SUPABASE_URL}/rest/v1/establishments",
            headers=HEADERS,
            json=est_data,
            timeout=30,
        )
        assert create_res.status_code == 201 or create_res.status_code == 200, f"Falha ao criar estabelecimento: {create_res.text}"
        establishment = create_res.json()[0] if isinstance(create_res.json(), list) else create_res.json()
        est_id = establishment.get("id")
        assert est_id, "ID do estabelecimento não retornado."

        # 1. Aplicar tema 'Barber' e verificar retorno
        barber_theme_body = {
            "establishment_id": est_id,
            "theme": "Barber",
            "mode": "manual"
        }
        res_barber = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/apply_theme",
            headers=HEADERS,
            json=barber_theme_body,
            timeout=30,
        )
        assert res_barber.status_code == 200, f"Erro ao aplicar tema Barber: {res_barber.text}"
        barber_resp = res_barber.json()
        assert barber_resp.get("applied_theme") == "Barber", "Tema Barber não foi aplicado corretamente."

        # 2. Aplicar tema 'Beauty' e verificar retorno
        beauty_theme_body = {
            "establishment_id": est_id,
            "theme": "Beauty",
            "mode": "manual"
        }
        res_beauty = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/apply_theme",
            headers=HEADERS,
            json=beauty_theme_body,
            timeout=30,
        )
        assert res_beauty.status_code == 200, f"Erro ao aplicar tema Beauty: {res_beauty.text}"
        beauty_resp = res_beauty.json()
        assert beauty_resp.get("applied_theme") == "Beauty", "Tema Beauty não foi aplicado corretamente."

        # 3. Testar troca automática com preferência do estabelecimento
        auto_theme_body = {
            "establishment_id": est_id,
            "mode": "automatic"
        }
        res_auto = requests.post(
            f"{SUPABASE_URL}/rest/v1/rpc/apply_theme",
            headers=HEADERS,
            json=auto_theme_body,
            timeout=30,
        )
        assert res_auto.status_code == 200, f"Erro ao aplicar tema automático: {res_auto.text}"
        auto_resp = res_auto.json()
        # A resposta deve indicar o tema aplicado baseado na preferência do estabelecimento
        assert auto_resp.get("applied_theme") in ["Barber", "Beauty"], "Tema automático não respeitou preferência do estabelecimento."

    finally:
        # Limpar dados - deletar estabelecimento criado
        if 'est_id' in locals():
            del_res = requests.delete(
                f"{SUPABASE_URL}/rest/v1/establishments?id=eq.{est_id}",
                headers=HEADERS,
                timeout=30,
            )
            # Pode ser 204 No Content ou 200 OK, aceitável também 404 (já deletado)
            assert del_res.status_code in [200, 204, 404], f"Falha ao deletar estabelecimento: {del_res.text}"

test_custom_theme_application()