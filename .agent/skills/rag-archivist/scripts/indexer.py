"""
indexer.py — Geração de embeddings e upsert no Supabase

Chunking: 1500 tokens por chunk (overlap de 100)
Embedding: Google Gemini text-embedding-004 (768 dimensões)
Upsert: Supabase via service_role key
"""

import os
import hashlib
from typing import List, Dict, Optional
from pathlib import Path

import google.genai as genai
from google.genai import types as genai_types
from supabase import create_client


# ---------------------------------------------------------------------------
# Configuração de roteamento de tabelas
# ---------------------------------------------------------------------------
TABLE_ROUTING = {
    'prd':          'rag_context_strategic',
    'roadmap':      'rag_context_strategic',
    'architecture': 'rag_context_architecture',
    'adr':          'rag_context_architecture',
    'stories':      'rag_context_operational',
    'plan':         'rag_context_operational',
    'session':      'rag_context_conversational',
    'memory':       'rag_context_conversational',
}

EMBEDDING_MODEL = 'models/gemini-embedding-2-preview'
EMBEDDING_DIMS  = 768


# ---------------------------------------------------------------------------
# Utilitários internos
# ---------------------------------------------------------------------------

def _load_env_files() -> None:
    """
    Carrega variáveis de ambiente de .env e .env.local na raiz do projeto.
    Sobe a árvore de diretórios a partir do script até encontrar package.json ou .git.
    Valores em .env.local sobrescrevem .env (comportamento padrão Next.js/Vite).
    """
    current_dir = Path(__file__).resolve().parent
    root_dir: Optional[Path] = None

    for parent in [current_dir] + list(current_dir.parents):
        if (parent / 'package.json').exists() or (parent / '.git').exists():
            root_dir = parent
            break

    if not root_dir:
        return

    for env_file in ['.env', '.env.local']:
        env_path = root_dir / env_file
        if not env_path.exists():
            continue
        with open(env_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                # Respeita valores já definidos pelo SO / sessão atual
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


def detect_table(source_path: str) -> str:
    """Auto-detecta tabela Supabase com base em palavras-chave no caminho do arquivo."""
    path_lower = source_path.lower()
    for keyword, table in TABLE_ROUTING.items():
        if keyword in path_lower:
            return table
    return 'rag_context_operational'  # default seguro


def chunk_text(text: str, max_tokens: int = 1500, chunk_overlap: int = 100) -> List[str]:
    """
    Divide texto em chunks com overlap para preservar contexto nas bordas.

    Estimativa rápida: 1 token ≈ 4 caracteres.
    Garante que o loop sempre progride (proteção contra MemoryError).
    """
    char_limit    = max_tokens * 4
    overlap_chars = chunk_overlap * 4

    if len(text) <= char_limit:
        return [text]

    chunks: List[str] = []
    start = 0
    while start < len(text):
        end   = min(start + char_limit, len(text))
        chunks.append(text[start:end])

        next_start = end - overlap_chars
        # Garante progressão mínima de 1 caractere
        start = next_start if next_start > start else end

    return chunks


def compute_hash(source_path: str, content: str) -> str:
    """SHA-256 de (source_path + content) para deduplicação idempotente."""
    combined = f"{source_path}:::{content}"
    return hashlib.sha256(combined.encode('utf-8')).hexdigest()


# ---------------------------------------------------------------------------
# API pública
# ---------------------------------------------------------------------------

def generate_embedding(text: str) -> List[float]:
    """
    Gera embedding via Google Gemini text-embedding-004 (768 dimensões).

    Usa o novo SDK 'google-genai'. Requer GEMINI_API_KEY no ambiente.
    """
    _load_env_files()

    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY não encontrada. "
            "Defina no .env ou como variável de ambiente."
        )

    client = genai.Client(api_key=api_key)
    result = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=genai_types.EmbedContentConfig(
            task_type='RETRIEVAL_DOCUMENT',
            output_dimensionality=EMBEDDING_DIMS
        ),
    )
    embedding: List[float] = result.embeddings[0].values

    if len(embedding) != EMBEDDING_DIMS:
        raise ValueError(
            f"Dimensão inesperada: esperado {EMBEDDING_DIMS}, obtido {len(embedding)}"
        )
    return embedding


def index_file(
    file_path: str,
    source_env: str = 'claude-code',
    source_event: str = 'manual_sync',
    target_table: Optional[str] = None,
    dry_run: bool = False,
) -> Dict:
    """
    Indexa um arquivo .md no RAG do Supabase.

    Args:
        file_path:    Caminho do arquivo .md a indexar.
        source_env:   Ambiente de origem ('antigravity' | 'claude-code' | 'manual').
        source_event: Evento disparador (ex: 'story_done', 'manual_sync').
        target_table: Força tabela específica (auto-detect se None).
        dry_run:      Simula sem escrever no Supabase.

    Returns:
        {'created': N, 'updated': M, 'skipped': K, 'errors': [...]}
    """
    _load_env_files()

    # Importa sanitizer do mesmo diretório
    import sys
    sys.path.insert(0, str(Path(__file__).parent))
    from sanitizer import sanitize

    results: Dict = {'created': 0, 'updated': 0, 'skipped': 0, 'errors': []}

    # 1. Ler arquivo
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            raw_content = f.read()
    except FileNotFoundError:
        results['errors'].append(f"Arquivo não encontrado: {file_path}")
        return results

    if not raw_content.strip():
        results['skipped'] += 1
        return results

    # 2. Sanitizar (remove secrets antes de enviar ao Google)
    sanitized_content, redaction_stats = sanitize(raw_content)
    if redaction_stats:
        print(f"⚠️  Redações em {file_path}: {redaction_stats}")

    # 3. Chunking
    chunks = chunk_text(sanitized_content)

    # 4. Detectar tabela alvo
    table = target_table or detect_table(file_path)

    # 5. Inicializar cliente Supabase (apenas se não for dry-run)
    supabase = None
    if not dry_run:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        if not supabase_url or not supabase_key:
            results['errors'].append(
                "Variáveis SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas."
            )
            return results
        supabase = create_client(supabase_url, supabase_key)

    # 6. Processar cada chunk
    for idx, chunk in enumerate(chunks):
        try:
            embedding     = generate_embedding(chunk)
            content_hash  = compute_hash(file_path, chunk)

            metadata = {
                'content_hash': content_hash,
                'chunk_index':  idx,
                'total_chunks': len(chunks),
                'redactions':   redaction_stats or {},
            }

            record = {
                'source_env':   source_env,
                'content':      chunk,
                'embedding':    embedding,
                'metadata':     metadata,
            }
            if table == 'rag_context_conversational':
                record['session_id'] = file_path # Reaproveitando file_path como session_id
            else:
                record['source_path']  = file_path
                record['source_event'] = source_event


            if dry_run:
                print(f"  [DRY-RUN] Chunk {idx+1}/{len(chunks)} — {len(chunk)} chars → {table}")
                results['created'] += 1
            else:
                supabase.table(table).upsert(record).execute()
                results['created'] += 1

        except Exception as e:
            results['errors'].append(f"Chunk {idx} falhou: {str(e)}")

    return results


# ---------------------------------------------------------------------------
# Execução direta para teste rápido
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else '.agent/memory/PROJECT_MEMORY.md'
    result = index_file(path, dry_run=True)
    print(f"\nResultado: {result}")
