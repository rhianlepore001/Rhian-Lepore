"""
pruner.py — Deduplicação e limpeza de conteúdo obsoleto

Previne indexação duplicada usando SHA-256 hash de (source_path + content)
Detecta e marca conteúdo obsoleto quando arquivo é substituído
"""

import os
import hashlib
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

from supabase import create_client


def compute_hash(source_path: str, content: str) -> str:
    """SHA-256 hash de (source_path + content) para deduplicação."""
    combined = f"{source_path}:::{content}"
    return hashlib.sha256(combined.encode()).hexdigest()


def check_duplicate(
    source_path: str,
    content: str,
    table: str,
) -> Tuple[bool, Optional[str]]:
    """
    Verifica se conteúdo já foi indexado.

    Args:
        source_path: Caminho do arquivo
        content: Conteúdo a ser verificado
        table: Tabela alvo no Supabase

    Returns:
        (is_duplicate, existing_id)
        Se True: conteúdo já existe com este hash
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if not supabase_url or not supabase_key:
        return False, None

    supabase = create_client(supabase_url, supabase_key)
    content_hash = compute_hash(source_path, content)

    try:
        # Buscar por source_path e hash no metadata
        response = supabase.table(table).select('id').eq(
            'source_path', source_path
        ).execute()

        for record in response.data:
            metadata = record.get('metadata', {})
            if metadata.get('content_hash') == content_hash:
                return True, record['id']

        return False, None

    except Exception as e:
        print(f"❌ Duplicate check failed: {str(e)}")
        return False, None


def mark_obsolete(
    source_path: str,
    table: str,
    exclude_hash: Optional[str] = None,
) -> int:
    """
    Marca registros antigos como obsoletos quando arquivo é re-indexado.

    Args:
        source_path: Caminho do arquivo
        table: Tabela alvo
        exclude_hash: Hash a NÃO marcar (versão nova)

    Returns:
        Número de registros marcados como obsoletos
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if not supabase_url or not supabase_key:
        return 0

    supabase = create_client(supabase_url, supabase_key)

    try:
        # Buscar todos os registros do arquivo
        response = supabase.table(table).select('*').eq(
            'source_path', source_path
        ).execute()

        marked_count = 0
        for record in response.data:
            metadata = record.get('metadata', {})
            content_hash = metadata.get('content_hash')

            # Skip se é a versão nova (exclude_hash)
            if exclude_hash and content_hash == exclude_hash:
                continue

            # Marcar como obsoleto
            updated_metadata = metadata.copy()
            updated_metadata['obsolete'] = True
            updated_metadata['obsolete_at'] = datetime.utcnow().isoformat()

            supabase.table(table).update({
                'metadata': updated_metadata
            }).eq('id', record['id']).execute()

            marked_count += 1

        return marked_count

    except Exception as e:
        print(f"❌ Mark obsolete failed: {str(e)}")
        return 0


def cleanup_old_embeddings(
    table: str,
    days_old: int = 30,
) -> int:
    """
    Remove embeddings nulos e muito antigos (optional cleanup).

    Args:
        table: Tabela alvo
        days_old: Remover registros anteriores a N dias

    Returns:
        Número de registros removidos
    """
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if not supabase_url or not supabase_key:
        return 0

    supabase = create_client(supabase_url, supabase_key)
    cutoff_date = (datetime.utcnow() - timedelta(days=days_old)).isoformat()

    try:
        # Query embeddings nulos
        response = supabase.table(table).select('id').is_('embedding', None).execute()
        null_count = len(response.data)

        if null_count > 0:
            # Deletar embeddings nulos
            supabase.table(table).delete().is_('embedding', None).execute()

        # Query obsoletos antigos
        response = supabase.table(table).select('id, created_at').execute()
        old_count = 0
        for record in response.data:
            if record.get('created_at', '') < cutoff_date:
                metadata = record.get('metadata', {})
                if metadata.get('obsolete'):
                    supabase.table(table).delete().eq('id', record['id']).execute()
                    old_count += 1

        return null_count + old_count

    except Exception as e:
        print(f"⚠️ Cleanup failed: {str(e)}")
        return 0


if __name__ == "__main__":
    # Teste local
    source_path = "test/file.md"
    content = "Test content"
    table = "rag_context_operational"

    # Teste 1: Verificar duplicata
    is_dup, dup_id = check_duplicate(source_path, content, table)
    print(f"Is duplicate: {is_dup}, ID: {dup_id}")

    # Teste 2: Marcar obsoletos (sem modificar)
    # marked = mark_obsolete(source_path, table)
    # print(f"Marked obsolete: {marked}")
