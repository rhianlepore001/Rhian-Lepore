"""
verify_embeddings.py — Validação de integridade do RAG 2.0

Verifica:
  - Contagem de registros por tabela
  - Embeddings NULL (falhas de indexação)
  - Distribuição por source_env
  - Dimensão dos embeddings (deve ser 768)
"""

import os
import sys
import io
from typing import Dict, List, Tuple
from collections import defaultdict

# Force UTF-8 output
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from supabase import create_client


TABLES = [
    'rag_context_strategic',
    'rag_context_architecture',
    'rag_context_operational',
    'rag_context_conversational',
]


def get_supabase_client():
    """Inicializa cliente Supabase."""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    return create_client(url, key)


def verify_table(supabase, table: str) -> Dict:
    """Verifica integridade de uma tabela RAG."""
    results = {
        'table': table,
        'total': 0,
        'with_embedding': 0,
        'null_embeddings': 0,
        'by_env': defaultdict(int),
        'dimension_check': True,
        'errors': [],
    }

    try:
        # Contar total
        response = supabase.table(table).select('id', count='exact').execute()
        results['total'] = response.count

        if results['total'] == 0:
            return results

        # Buscar todos os registros para análise
        response = supabase.table(table).select('*').execute()
        records = response.data

        with_embedding = 0
        by_env = defaultdict(int)

        for record in records:
            embedding = record.get('embedding')
            env = record.get('source_env', 'unknown')

            # Contar por source_env
            by_env[env] += 1

            # Verificar embedding
            if embedding:
                with_embedding += 1

                # Validar dimensão (768 para text-embedding-004)
                if isinstance(embedding, list) and len(embedding) != 768:
                    results['dimension_check'] = False
                    results['errors'].append(
                        f"Record {record['id']}: Expected 768 dims, got {len(embedding)}"
                    )

        results['with_embedding'] = with_embedding
        results['null_embeddings'] = results['total'] - with_embedding
        results['by_env'] = dict(by_env)

    except Exception as e:
        results['errors'].append(f"Table query failed: {str(e)}")

    return results


def print_summary(all_results: List[Dict]):
    """Imprime sumário de validação."""
    print("\n" + "=" * 70)
    print("🔍 RAG 2.0 — Verificação de Integridade de Embeddings")
    print("=" * 70)

    total_records = 0
    total_embeddings = 0
    total_null = 0
    all_envs = defaultdict(int)
    has_errors = False

    for result in all_results:
        table = result['table']
        total = result['total']
        with_emb = result['with_embedding']
        null_emb = result['null_embeddings']

        total_records += total
        total_embeddings += with_emb
        total_null += null_emb

        # Por ambiente
        for env, count in result['by_env'].items():
            all_envs[env] += count

        # Status da tabela
        status = "✅" if null_emb == 0 else "⚠️"
        print(f"\n{status} {table}")
        print(f"   Total: {total}")
        print(f"   Com embedding: {with_emb}")
        print(f"   NULL: {null_emb}")

        if result['by_env']:
            for env, count in result['by_env'].items():
                print(f"     - {env}: {count}")

        # Erros
        if result['errors']:
            has_errors = True
            print(f"   ❌ Erros:")
            for error in result['errors'][:3]:  # Mostrar primeiros 3
                print(f"      - {error}")
            if len(result['errors']) > 3:
                print(f"      ... e {len(result['errors']) - 3} mais")

        # Dimensão
        if not result['dimension_check']:
            print(f"   ⚠️ Verificação de dimensão falhou!")

    # Sumário geral
    print(f"\n" + "=" * 70)
    print("📊 Sumário Geral")
    print(f"   Total de registros: {total_records}")
    print(f"   Com embeddings: {total_embeddings}")
    print(f"   NULL: {total_null}")

    if total_records > 0:
        coverage = (total_embeddings / total_records) * 100
        print(f"   Cobertura: {coverage:.1f}%")

    if all_envs:
        print(f"\n   Por ambiente:")
        for env, count in sorted(all_envs.items()):
            print(f"     - {env}: {count}")

    # Status final
    final_status = "✅ PASSED" if not has_errors and total_null == 0 else "❌ FAILED"
    print(f"\n   Status: {final_status}")
    print("=" * 70 + "\n")

    return not has_errors and total_null == 0


def main():
    """Executa verificação completa."""
    try:
        supabase = get_supabase_client()
    except ValueError as e:
        print(f"❌ Erro de configuração: {str(e)}")
        return 1

    # Verificar todas as tabelas
    results = []
    for table in TABLES:
        print(f"🔍 Verificando {table}...", end=" ", flush=True)
        result = verify_table(supabase, table)
        results.append(result)
        print("✓")

    # Imprimir sumário
    success = print_summary(results)

    return 0 if success else 1


if __name__ == "__main__":
    exit(main())
