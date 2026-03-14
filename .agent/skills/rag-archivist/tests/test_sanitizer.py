"""
Testes para sanitizer.py — remoção de segredos antes de indexação
"""

import pytest
import sys
from pathlib import Path

# Adicionar path para importar módulos da skill
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


@pytest.mark.unit
class TestSanitizer:
    """Testes para sanitização de segredos"""

    def test_remove_openai_keys(self):
        """Validar remoção de OpenAI keys (sk-...)"""
        from sanitizer import sanitize_content

        text = """
        Usar OpenAI com sk-proj-abcdef123456 para chamadas
        Outro método com sk-123abc para teste
        """

        sanitized = sanitize_content(text)

        assert "sk-proj-" not in sanitized
        assert "sk-123abc" not in sanitized
        assert "[REDACTED_OPENAI_KEY]" in sanitized or "***" in sanitized

    def test_remove_jwt_tokens(self):
        """Validar remoção de JWTs (eyJ...)"""
        from sanitizer import sanitize_content

        jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
        text = f"Token de teste: {jwt} usado para autenticação"

        sanitized = sanitize_content(text)

        assert jwt not in sanitized
        assert "[REDACTED_JWT]" in sanitized or "***" in sanitized

    def test_remove_env_variables(self):
        """Validar remoção de variáveis de ambiente (KEY=value)"""
        from sanitizer import sanitize_content

        text = """
        GEMINI_API_KEY=AIzaSyD1x_key123abc
        SUPABASE_URL=https://project.supabase.co
        DB_PASSWORD=super_secret_password
        """

        sanitized = sanitize_content(text)

        assert "AIzaSyD1x_key123abc" not in sanitized
        assert "super_secret_password" not in sanitized
        # URLs podem ser parcialmente redacted
        assert "supabase.co" not in sanitized or "[REDACTED" in sanitized

    def test_remove_google_api_keys(self):
        """Validar remoção de Google API keys (AIza...)"""
        from sanitizer import sanitize_content

        key = "AIzaSyD_key_example_1234567890"
        text = f"Usar Google API com chave {key} para embeddings"

        sanitized = sanitize_content(text)

        assert key not in sanitized
        assert "[REDACTED_GOOGLE_KEY]" in sanitized or "***" in sanitized

    def test_remove_supabase_urls_with_keys(self):
        """Validar remoção de Supabase URLs com credenciais"""
        from sanitizer import sanitize_content

        text = """
        URL: https://project.supabase.co
        Service Role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        """

        sanitized = sanitize_content(text)

        # Service role e anon keys devem ser removidas
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in sanitized

    def test_preserve_legitimate_content(self):
        """Validar que conteúdo legítimo não é alterado"""
        from sanitizer import sanitize_content

        text = """
        # Story: Implementar Autenticação

        ## Descrição
        Usar OAuth 2.0 com Supabase Auth para segurança.

        ## Requisitos
        - Validação de email
        - Two-factor authentication
        - Rate limiting em endpoints
        """

        sanitized = sanitize_content(text)

        # Conteúdo deve ser preservado (sem chaves reais)
        assert "Story: Implementar Autenticação" in sanitized
        assert "OAuth 2.0" in sanitized
        assert "Two-factor authentication" in sanitized

    def test_multiple_secrets_in_one_text(self):
        """Validar remoção de múltiplos segredos em um texto"""
        from sanitizer import sanitize_content

        text = """
        Configuração:
        - GEMINI_API_KEY=AIzaSyD_test_key
        - JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        - DB_PASSWORD=postgres_password_123
        - OpenAI_Key=sk-proj-123abc456def
        """

        sanitized = sanitize_content(text)

        # Nenhuma chave deve estar visível
        assert "AIzaSyD_test_key" not in sanitized
        assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" not in sanitized
        assert "postgres_password_123" not in sanitized
        assert "sk-proj-123abc456def" not in sanitized

    def test_empty_content(self):
        """Validar comportamento com conteúdo vazio"""
        from sanitizer import sanitize_content

        assert sanitize_content("") == ""
        assert sanitize_content(None) is None or sanitize_content(None) == ""

    def test_idempotent_sanitization(self):
        """Validar que sanitização é idempotente (rodar 2x = mesmo resultado)"""
        from sanitizer import sanitize_content

        text = "Conteúdo com GEMINI_API_KEY=AIzaSyD_test_key"

        sanitized_once = sanitize_content(text)
        sanitized_twice = sanitize_content(sanitized_once)

        assert sanitized_once == sanitized_twice

    def test_case_insensitive_key_detection(self):
        """Validar detecção insensível a maiúsculas/minúsculas"""
        from sanitizer import sanitize_content

        text = """
        gemini_api_key=AIzaSyD_test
        GEMINI_API_KEY=AIzaSyD_test
        Gemini_Api_Key=AIzaSyD_test
        """

        sanitized = sanitize_content(text)

        # Todas as variações devem ser tratadas
        assert text.count("AIzaSyD_test") > sanitized.count("AIzaSyD_test")
