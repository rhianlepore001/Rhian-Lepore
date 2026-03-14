"""
sync_memory.py — Ponto de entrada CLI para sincronização de memória

Uso:
  python sync_memory.py --path PLAN-rag-2-0.md
  python sync_memory.py --dir docs/stories/
  python sync_memory.py --path FILE.md --dry-run
"""

import argparse
import os
from pathlib import Path
from typing import List, Dict

import google.generativeai as genai

from indexer import index_file, detect_table
from pruner import check_duplicate, mark_obsolete
from sanitizer import sanitize, log_redactions


def collect_markdown_files(directory: str) -> List[Path]:
    """Coleta todos os .md de um diretório recursivamente."""
    path = Path(directory)
    if not path.is_dir():
        print(f"❌ Directory not found: {directory}")
        return []

    md_files = list(path.rglob('*.md'))
    print(f"📁 Encontrados {len(md_files)} arquivos .md em {directory}")
    return md_files


def sync_file(
    file_path: str,
    source_env: str = 'claude-code',
    source_event: str = 'manual_sync',
    target_table: str = None,
    dry_run: bool = False,
) -> Dict:
    """Sincroniza um arquivo único."""
    print(f"\n📄 Processando: {file_path}")

    # Ler e sanitizar
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"❌ Arquivo não encontrado: {file_path}")
        return {'skipped': 1, 'errors': 1}

    if not content.strip():
        print(f"⏭️ Arquivo vazio, pulando")
        return {'skipped': 1}

    sanitized, redactions = sanitize(content)
    if redactions:
        print(log_redactions(redactions, file_path))

    # Verificar duplicata
    table = target_table or detect_table(file_path)
    is_duplicate, dup_id = check_duplicate(file_path, sanitized, table)

    if is_duplicate:
        print(f"⏭️ Conteúdo duplicado (ID: {dup_id}), pulando")
        return {'skipped': 1}

    # Indexar
    result = index_file(
        file_path,
        source_env=source_env,
        source_event=source_event,
        target_table=table,
        dry_run=dry_run,
    )

    # Marcar obsoletos (se não for dry-run)
    if result.get('created', 0) > 0 and not dry_run:
        from indexer import compute_hash
        content_hash = compute_hash(file_path, sanitized)
        marked = mark_obsolete(file_path, table, exclude_hash=content_hash)
        if marked:
            print(f"🧹 Marcado {marked} registros como obsoletos")

    return result


def main():
    parser = argparse.ArgumentParser(
        description='RAG 2.0 — Sincroniza conhecimento para vetorização'
    )
    parser.add_argument(
        '--path',
        type=str,
        help='Caminho para arquivo único (.md)'
    )
    parser.add_argument(
        '--dir',
        type=str,
        help='Diretório para sincronizar recursivamente'
    )
    parser.add_argument(
        '--table',
        type=str,
        help='Força tabela específica (senão auto-detect)'
    )
    parser.add_argument(
        '--env',
        type=str,
        default='claude-code',
        choices=['claude-code', 'antigravity', 'manual'],
        help='Ambiente de origem (padrão: claude-code)'
    )
    parser.add_argument(
        '--event',
        type=str,
        default='manual_sync',
        help='Evento disparador (padrão: manual_sync)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simula sem escrever no Supabase'
    )

    args = parser.parse_args()

    # Validar input
    if not args.path and not args.dir:
        parser.print_help()
        print("\n❌ Erro: use --path ou --dir")
        return 1

    # Inicializar Gemini
    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        print("❌ GEMINI_API_KEY não configurada")
        return 1
    genai.configure(api_key=gemini_key)

    # Coletar arquivos
    files_to_process = []
    if args.path:
        files_to_process = [args.path]
    elif args.dir:
        files_to_process = [str(f) for f in collect_markdown_files(args.dir)]

    if not files_to_process:
        print("❌ Nenhum arquivo encontrado")
        return 1

    # Processar
    stats = {
        'total_files': len(files_to_process),
        'created': 0,
        'updated': 0,
        'skipped': 0,
        'errors': 0,
    }

    mode_str = "[DRY-RUN]" if args.dry_run else ""
    print(f"\n🚀 Iniciando sincronização {mode_str}")
    print(f"   Ambiente: {args.env}")
    print(f"   Evento: {args.event}")

    for file_path in files_to_process:
        result = sync_file(
            file_path,
            source_env=args.env,
            source_event=args.event,
            target_table=args.table,
            dry_run=args.dry_run,
        )
        stats['created'] += result.get('created', 0)
        stats['updated'] += result.get('updated', 0)
        stats['skipped'] += result.get('skipped', 0)
        stats['errors'] += len(result.get('errors', []))

    # Resumo
    print(f"\n✅ Sincronização completa!")
    print(f"   Arquivos processados: {stats['total_files']}")
    print(f"   Embeddings criados: {stats['created']}")
    print(f"   Atualizados: {stats['updated']}")
    print(f"   Pulados: {stats['skipped']}")
    print(f"   Erros: {stats['errors']}")

    return 0 if stats['errors'] == 0 else 1


if __name__ == "__main__":
    exit(main())
