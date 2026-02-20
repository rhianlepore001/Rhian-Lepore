import requests
import uuid

SUPABASE_URL = "https://lcqwrngscsziysyfhpfj.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcXdybmdzY3N6aXlzeWZocGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MzYwNzMsImV4cCI6MjA3OTQxMjA3M30.Kpb-focSL2eny9gJkNjtDACl-J4jlGZoNPEgnTG-5Ug"
HEADERS = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}
TIMEOUT = 30


def test_user_authentication_flows():
    # Generate email and password with hyphen instead of underscore for valid email
    email = f"testuser-{uuid.uuid4().hex[:8]}@example.com"
    password = "Test@12345"

    user_id = None
    access_token = None
    refresh_token = None

    try:
        # User sign up
        signup_resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers=HEADERS,
            json={"email": email, "password": password},
            timeout=TIMEOUT
        )
        assert signup_resp.status_code == 200, f"Falha no registro: {signup_resp.text}"
        signup_data = signup_resp.json()
        assert "user" in signup_data, "User não retornado no signup"
        user_id = signup_data["user"]["id"]
        assert signup_data["user"]["email"] == email.lower()
        assert "access_token" in signup_data and "refresh_token" in signup_data
        access_token = signup_data["access_token"]
        refresh_token = signup_data["refresh_token"]

        # User login
        login_resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=HEADERS,
            json={"email": email, "password": password},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Falha no login: {login_resp.text}"
        login_data = login_resp.json()
        assert "access_token" in login_data and "refresh_token" in login_data

        # Password recovery request
        recovery_resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/recover",
            headers=HEADERS,
            json={"email": email.lower()},
            timeout=TIMEOUT
        )
        assert recovery_resp.status_code in [200, 204], f"Falha no pedido de recuperação de senha: {recovery_resp.text}"

        # Profile update
        update_headers = HEADERS.copy()
        update_headers["Authorization"] = f"Bearer {access_token}"
        profile_update_payload = {
            "data": {
                "full_name": "Usuário Teste Automatizado",
                "phone": "+5511999999999"
            }
        }
        update_resp = requests.post(
            f"{SUPABASE_URL}/rest/v1/users?id=eq.{user_id}",
            headers={**update_headers, "Prefer": "return=representation"},
            json=profile_update_payload,
            timeout=TIMEOUT
        )
        if update_resp.status_code not in [200, 204]:
            rpc_resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/rpc/update_user_profile",
                headers=update_headers,
                json={"user_id": user_id, "full_name": profile_update_payload["data"]["full_name"], "phone": profile_update_payload["data"]["phone"]},
                timeout=TIMEOUT
            )
            assert rpc_resp.status_code in [200, 204], f"Falha na atualização do perfil via RPC: {rpc_resp.text}"
        else:
            assert update_resp.status_code in [200, 204], f"Falha na atualização do perfil via REST: {update_resp.text}"

        # Verify updated user info
        userinfo_resp = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=update_headers,
            timeout=TIMEOUT
        )
        assert userinfo_resp.status_code == 200, f"Falha ao buscar info do usuário: {userinfo_resp.text}"
        userinfo = userinfo_resp.json()
        assert userinfo["email"] == email.lower()
        assert "user_metadata" in userinfo and ("full_name" in userinfo["user_metadata"] or "phone" in userinfo["user_metadata"])

        # Logout
        logout_resp = requests.post(
            f"{SUPABASE_URL}/auth/v1/logout",
            headers=update_headers,
            timeout=TIMEOUT
        )
        assert logout_resp.status_code in [200, 204], f"Falha no logout: {logout_resp.text}"

    finally:
        pass


test_user_authentication_flows()
