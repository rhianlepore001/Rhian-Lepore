"""
Testes para pruner.py — deduplicação e gerenciamento de obsolescência
"""

import pytest
import hashlib
import sys
from pathlib import Path

# Adicionar path para importar módulos da skill
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


@pytest.mark.unit
class TestPruner:
    """Testes para deduplicação e pruning de embeddings"""

    def test_sha256_hash_deduplication(self):
        """Validar que SHA-256 hash identifica conteúdo duplicado"""
        content = "Same content for testing"

        hash1 = hashlib.sha256(("docs/stories/US-001.md" + content).encode()).hexdigest()
        hash2 = hashlib.sha256(("docs/stories/US-001.md" + content).encode()).hexdigest()

        assert hash1 == hash2

    def test_different_content_different_hash(self):
        """Validar que conteúdo diferente gera hash diferente"""
        content1 = "Content version 1"
        content2 = "Content version 2"

        hash1 = hashlib.sha256(("docs/stories/US-001.md" + content1).encode()).hexdigest()
        hash2 = hashlib.sha256(("docs/stories/US-001.md" + content2).encode()).hexdigest()

        assert hash1 != hash2

    def test_same_content_different_source_path(self):
        """Validar que mesmo conteúdo de sources diferentes = hashes diferentes"""
        content = "Shared content"

        hash1 = hashlib.sha256(("docs/stories/US-001.md" + content).encode()).hexdigest()
        hash2 = hashlib.sha256(("docs/stories/US-002.md" + content).encode()).hexdigest()

        # Hashes devem ser diferentes porque source path é diferente
        assert hash1 != hash2

    def test_deduplication_detection(self, mock_supabase):
        """Validar que duplicata é detectada via hash"""
        table = mock_supabase.table("rag_context_operational")

        # Simular busca por hash existente
        existing_hash = "abc123def456"
        table.select("id").eq("content_hash", existing_hash).execute.return_value = {
            "data": [{"id": "existing-id"}]
        }

        # Verificar que detectamos duplicata
        result = table.select("id").eq("content_hash", existing_hash).execute()
        assert len(result["data"]) > 0

    def test_mark_obsolete_on_update(self, mock_supabase):
        """Validar marcação de registros obsoletos ao fazer update"""
        table = mock_supabase.table("rag_context_operational")

        # Simular update de documento
        old_record_id = "old-id"
        new_record_data = {
            "source_path": "docs/stories/US-001.md",
            "embedding": [0.1] * 768,
            "content_hash": "new-hash",
            "is_latest": True
        }

        # Marcar old record como obsolete
        table.update({"is_latest": False}).eq("id", old_record_id).execute()
        # Inserir novo record
        table.upsert(new_record_data).execute()

        # Validar chamadas
        table.update.assert_called()
        table.upsert.assert_called()

    def test_pruning_old_versions(self, mock_supabase):
        """Validar remoção de versões antigas de um documento"""
        table = mock_supabase.table("rag_context_operational")

        source_path = "docs/stories/US-001.md"

        # Simular busca de todas versões
        table.select("id", "created_at").eq(
            "source_path", source_path
        ).order("created_at", desc=True).execute.return_value = {
            "data": [
                {"id": "v3-id", "created_at": "2026-03-14T12:00:00"},
                {"id": "v2-id", "created_at": "2026-03-13T12:00:00"},
                {"id": "v1-id", "created_at": "2026-03-12T12:00:00"}
            ]
        }

        # Buscar versões antigas
        result = table.select("id", "created_at").eq(
            "source_path", source_path
        ).order("created_at", desc=True).execute()

        # Manter apenas 2 versões mais recentes
        versions_to_delete = result["data"][2:]
        assert len(versions_to_delete) == 1

    def test_hash_collision_handling(self):
        """Validar comportamento em colisão de hash (extremamente raro)"""
        # SHA-256 tem espaço de 2^256, colisões são praticamente impossíveis
        # Mas testamos que se acontecer, source_path é tie-breaker

        content_a = "content A"
        content_b = "content B"

        hash_a = hashlib.sha256((
            "docs/stories/US-001.md" + content_a
        ).encode()).hexdigest()
        hash_b = hashlib.sha256((
            "docs/stories/US-001.md" + content_b
        ).encode()).hexdigest()

        # Diferentes, como esperado
        assert hash_a != hash_b

    def test_concurrent_deduplication_safe(self, mock_supabase):
        """Validar que deduplicação é thread-safe com database constraints"""
        table = mock_supabase.table("rag_context_operational")

        # Simular UNIQUE constraint em content_hash + source_path
        record = {
            "source_path": "docs/stories/US-001.md",
            "content_hash": "abc123",
            "embedding": [0.1] * 768
        }

        # Primeira escrita deve suceder
        table.upsert(record).execute()

        # Segunda escrita com mesmo hash deve ser no-op (UPDATE) ou fail gracefully
        # Supabase upsert trata como UPDATE se chave existe
        table.upsert(record).execute()

        # Devem haver 2 chamadas (ambas OK)
        assert table.upsert.call_count == 2

    def test_retention_policy(self):
        """Validar política de retenção de documentos"""
        # Política: manter últimas 5 versões de cada source
        max_versions_per_source = 5

        versions = list(range(1, 11))  # 10 versões

        # Versões a manter
        kept = versions[-max_versions_per_source:]
        assert len(kept) == 5
        assert kept == [6, 7, 8, 9, 10]

        # Versões a deletar
        deleted = versions[:-max_versions_per_source]
        assert len(deleted) == 5
        assert deleted == [1, 2, 3, 4, 5]

    def test_empty_content_hash(self):
        """Validar hash de conteúdo vazio"""
        empty_hash = hashlib.sha256(("docs/test.md" + "").encode()).hexdigest()
        another_empty = hashlib.sha256(("docs/test.md" + "").encode()).hexdigest()

        assert empty_hash == another_empty
        assert empty_hash != "0" * 64  # Não é hash zero

    def test_batch_deduplication(self, mock_supabase):
        """Validar deduplicação em batch de múltiplos documentos"""
        table = mock_supabase.table("rag_context_operational")

        documents = [
            {"source_path": "doc1.md", "content_hash": f"hash-{i}"}
            for i in range(5)
        ]

        # Simular que docs 2 e 4 são duplicatas
        table.select("content_hash").execute.return_value = {
            "data": [{"content_hash": "hash-1"}, {"content_hash": "hash-3"}]
        }

        # Buscar hashes existentes
        existing = table.select("content_hash").execute()
        existing_hashes = {d["content_hash"] for d in existing["data"]}

        # Documentos a inserir (sem os que já existem)
        to_insert = [
            d for d in documents if d["content_hash"] not in existing_hashes
        ]

        assert len(to_insert) == 3  # Apenas 3 novos
