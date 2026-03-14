"""
sanitizer.py — Remoção de segredos e dados sensíveis antes de indexação

Remove: API keys, JWTs, variáveis de ambiente, URLs com credenciais
"""

import re
import sys
import io
from typing import Dict, Tuple

# Force UTF-8 output
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Padrões de redação — ordem importa (mais específico primeiro)
PATTERNS_TO_REDACT = [
    # 1. OpenAI keys (sk-...)
    (r'sk-[A-Za-z0-9]{40,}', '[REDACTED_OPENAI_KEY]'),

    # 2. Google API keys (AIza...)
    (r'AIza[A-Za-z0-9_-]{35}', '[REDACTED_GOOGLE_KEY]'),

    # 3. JWTs (eyJ...eyJ...signature)
    (r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[REDACTED_JWT]'),

    # 4. Supabase URLs com key
    (r'https://[a-z0-9]+\.supabase\.co/rest/v1\?apikey=[A-Za-z0-9._-]+', '[REDACTED_SUPABASE_URL]'),

    # 5. Variáveis de ambiente com valor (ENV_VAR=value)
    (r'[A-Z_]{3,}=\S+', '[REDACTED_ENV_VAR]'),

    # 6. API Keys genéricas (32+ chars alfanuméricos)
    (r'(?<![A-Za-z0-9])[A-Za-z0-9_-]{32,}(?![A-Za-z0-9])', '[REDACTED_API_KEY]'),
]


def sanitize(content: str) -> Tuple[str, Dict[str, int]]:
    """
    Remove segredos do conteúdo.

    Args:
        content: Texto bruto com potenciais segredos

    Returns:
        (content_sanitized, redaction_stats)
        redaction_stats: {"pattern_name": count, ...}
    """
    if not content:
        return content, {}

    stats = {}
    sanitized = content

    for pattern, replacement in PATTERNS_TO_REDACT:
        matches = re.findall(pattern, sanitized)
        if matches:
            pattern_name = replacement.replace('[REDACTED_', '').replace(']', '')
            stats[pattern_name] = len(matches)
            sanitized = re.sub(pattern, replacement, sanitized)

    return sanitized, stats


def log_redactions(stats: Dict[str, int], file_path: str = "") -> str:
    """Log de redações realizadas."""
    if not stats:
        return f"✓ Sem redações necessárias{f' ({file_path})' if file_path else ''}"

    lines = [f"⚠️ Redações realizadas{f' ({file_path})' if file_path else ''}:"]
    for secret_type, count in stats.items():
        lines.append(f"  - {secret_type}: {count}")
    return "\n".join(lines)


if __name__ == "__main__":
    # Teste local
    test_content = """
    API_KEY=sk-1234567890abcdefghijklmnop
    SUPABASE_URL=https://example.supabase.co/rest/v1?apikey=eyJhbGc
    JWT_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
    GOOGLE_KEY=AIzaSyDGFJCe-k5qOxAUg
    """

    cleaned, stats = sanitize(test_content)
    print(log_redactions(stats))
    print("\nConteúdo limpo:")
    print(cleaned)
