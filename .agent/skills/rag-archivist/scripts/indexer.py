"""
indexer.py — Geração de embeddings e upsert no Supabase

Chunking: 1500 tokens por chunk
Embedding: Google Gemini text-embedding-004 (768 dimensões)
Upsert: Supabase RLS (service_role)
"""

import os
import json
import hashlib
from typing import List, Dict, Optional, Tuple
from pathlib import Path

import google.generativeai as genai
from supabase import create_client

# Configuração
TABLE_ROUTING = {
    'prd': 'rag_context_strategic',
    'roadmap': 'rag_context_strategic',
    'architecture': 'rag_context_architecture',
    'adr': 'rag_context_architecture',
    'stories': 'rag_context_operational',
    'plan': 'rag_context_operational',
    'session': 'rag_context_conversational',
    'memory': 'rag_context_conversational',
}


def detect_table(source_path: str) -> str:
    """Auto-detect tabela baseado em palavras-chave no path."""
    path_lower = source_path.lower()
    for keyword, table in TABLE_ROUTING.items():
        if keyword in path_lower:
            return table
    return 'rag_context_operational'  # default


def chunk_text(text: str, max_tokens: int = 1500, chunk_overlap: int = 100) -> List[str]:
    """
    Divide texto em chunks com overlap para contexto.

    Estimativa rápida: 1 token ≈ 4 caracteres (aproximação conservadora)
    """
    char_limit = max_tokens * 4
    overlap_chars = chunk_overlap * 4

    if len(text) <= char_limit:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = min(start + char_limit, len(text))
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap_chars  # overlap para context

    return chunks


def generate_embedding(text: str, model: str = "models/text-embedding-004") -> List[float]:
    """
    Gera embedding via Google Gemini.

    Returns:
        Lista de 768 floats (text-embedding-004 dimension)
    """
    try:
        response = genai.embed_content(model=model, content=text)
        embedding = response['embedding']

        if len(embedding) != 768:
            raise ValueError(f"Expected 768 dims, got {len(embedding)}")

        return embedding
    except Exception as e:
        print(f"❌ Embedding generation failed: {str(e)}")
        raise


def compute_hash(source_path: str, content: str) -> str:
    """SHA-256 hash de (source_path + content) para deduplicação."""
    combined = f"{source_path}:::{content}"
    return hashlib.sha256(combined.encode()).hexdigest()


def index_file(
    file_path: str,
    source_env: str = 'claude-code',
    source_event: str = 'manual_sync',
    target_table: Optional[str] = None,
    dry_run: bool = False,
) -> Dict:
    """
    Indexa um arquivo .md no RAG.

    Args:
        file_path: Caminho do arquivo .md
        source_env: 'antigravity' ou 'claude-code'
        source_event: Evento que disparou (ex: 'story_done', 'git_push')
        target_table: Força tabela específica (senão auto-detect)
        dry_run: Simula sem escrever no Supabase

    Returns:
        {created: N, updated: M, skipped: K, errors: []}
    """
    from sanitizer import sanitize

    results = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': []}

    # 1. Ler arquivo
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            raw_content = f.read()
    except FileNotFoundError:
        results['errors'].append(f"File not found: {file_path}")
        return results

    if not raw_content.strip():
        results['skipped'] += 1
        return results

    # 2. Sanitizar
    sanitized_content, redaction_stats = sanitize(raw_content)
    if redaction_stats:
        print(f"⚠️ Redações em {file_path}: {redaction_stats}")

    # 3. Chunking
    chunks = chunk_text(sanitized_content)

    # 4. Detect tabela
    table = target_table or detect_table(file_path)

    # 5. Inicializar Supabase
    if not dry_run:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        if not supabase_url or not supabase_key:
            results['errors'].append("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
            return results
        supabase = create_client(supabase_url, supabase_key)

    # 6. Processar chunks
    for idx, chunk in enumerate(chunks):
        try:
            # Gerar embedding
            embedding = generate_embedding(chunk)

            # Compute hash
            content_hash = compute_hash(file_path, chunk)

            # Preparar metadata
            metadata = {
                'content_hash': content_hash,
                'chunk_index': idx,
                'total_chunks': len(chunks),
                'redactions': redaction_stats or {},
            }

            # Preparar registro
            record = {
                'source_path': file_path,
                'source_env': source_env,
                'source_event': source_event,
                'content': chunk,
                'embedding': embedding,
                'metadata': metadata,
            }

            if dry_run:
                print(f"  [DRY-RUN] Would insert {len(chunk)} chars into {table}")
                results['created'] += 1
            else:
                # Upsert no Supabase (por source_path como chave)
                response = supabase.table(table).upsert(record).execute()
                results['created'] += 1

        except Exception as e:
            results['errors'].append(f"Chunk {idx} failed: {str(e)}")

    return results


if __name__ == "__main__":
    # Teste local
    genai.configure(api_key=os.getenv('GEMINI_API_KEY', ''))

    result = index_file(
        'PLAN-rag-2-0.md',
        dry_run=True  # Teste sem escrever
    )

    print(f"\nResultado: {result}")
