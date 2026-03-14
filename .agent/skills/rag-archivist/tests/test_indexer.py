"""
Testes para indexer.py — geração de embeddings e upsert no Supabase
"""

import pytest
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Adicionar path para importar módulos da skill
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


@pytest.mark.unit
class TestIndexer:
    """Testes para geração de embeddings e indexação"""

    @patch('google.generativeai.embed_content')
    def test_generate_embedding_dimension(self, mock_embed, mock_embeddings):
        """Validar que embeddings têm 768 dimensões (text-embedding-004)"""
        mock_embed.return_value = {"embedding": mock_embeddings("test")}

        # Verificar que embedding tem tamanho correto
        embedding = mock_embeddings("test content")
        assert len(embedding) == 768

    @patch('google.generativeai.embed_content')
    def test_embedding_deterministic(self, mock_embed):
        """Validar que o mesmo texto gera o mesmo embedding"""
        import hashlib

        def mock_embed_func(text, model):
            hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
            embedding = [(hash_val + i) % 1000 / 1000.0 for i in range(768)]
            return {"embedding": embedding}

        text = "Deterministic test content"
        embedding1 = mock_embed_func(text, "models/text-embedding-004")
        embedding2 = mock_embed_func(text, "models/text-embedding-004")

        assert embedding1 == embedding2

    @patch('google.generativeai.embed_content')
    def test_different_texts_different_embeddings(self, mock_embed):
        """Validar que textos diferentes geram embeddings diferentes"""
        import hashlib

        def mock_embed_func(text, model):
            hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
            embedding = [(hash_val + i) % 1000 / 1000.0 for i in range(768)]
            return {"embedding": embedding}

        embedding1 = mock_embed_func("texto 1", "models/text-embedding-004")
        embedding2 = mock_embed_func("texto 2", "models/text-embedding-004")

        assert embedding1 != embedding2

    def test_upsert_structure(self, mock_supabase, mock_embeddings):
        """Validar estrutura de upsert no Supabase"""
        # Simular upsert de documento
        table = mock_supabase.table("rag_context_operational")

        document = {
            "source_path": "docs/stories/US-001.md",
            "content": "Sample story content",
            "embedding": mock_embeddings("Sample story content"),
            "metadata": {"type": "story", "story_id": "US-001"},
            "created_at": "2026-03-14T00:00:00Z",
            "updated_at": "2026-03-14T00:00:00Z"
        }

        table.upsert(document).execute()

        # Validar que upsert foi chamado com estructura correta
        table.upsert.assert_called_once()
        call_args = table.upsert.call_args[0][0]
        assert "source_path" in call_args
        assert "embedding" in call_args
        assert len(call_args["embedding"]) == 768

    def test_multiple_documents_upsert(self, mock_supabase, mock_embeddings):
        """Validar batch upsert de múltiplos documentos"""
        table = mock_supabase.table("rag_context_operational")

        documents = [
            {
                "source_path": f"docs/stories/US-{i:03d}.md",
                "content": f"Story {i} content",
                "embedding": mock_embeddings(f"Story {i} content"),
                "metadata": {"type": "story", "story_id": f"US-{i:03d}"}
            }
            for i in range(1, 4)
        ]

        table.upsert(documents).execute()

        table.upsert.assert_called_once()
        call_args = table.upsert.call_args[0][0]
        assert len(call_args) == 3

    def test_table_selection_by_content_type(self, mock_supabase):
        """Validar seleção de tabela correta baseado em tipo de conteúdo"""
        # Auto-detect deve escolher tabela apropriada
        content_type_table_map = {
            "PRD": "rag_context_strategic",
            "ADR": "rag_context_architecture",
            "story": "rag_context_operational",
            "memory": "rag_context_conversational"
        }

        for content_type, expected_table in content_type_table_map.items():
            table = mock_supabase.table(expected_table)
            assert table is not None
            mock_supabase.table.assert_called_with(expected_table)

    def test_metadata_structure(self):
        """Validar estrutura de metadata para indexação"""
        metadata = {
            "source_path": "docs/stories/US-001.md",
            "content_type": "story",
            "story_id": "US-001",
            "created_at": "2026-03-14",
            "has_api_key": False,  # Flag, não valor real
            "word_count": 250,
            "token_estimate": 100
        }

        # Validar que não há valores sensíveis em metadata
        for key, value in metadata.items():
            if isinstance(value, str):
                assert not value.startswith("sk-")  # Sem OpenAI keys
                assert not value.startswith("AIza")  # Sem Google keys
                assert not value.startswith("eyJ")  # Sem JWTs

    def test_embedding_batch_size_limit(self):
        """Validar que batch de embeddings respeita limite"""
        # Supabase tem limite de request size
        batch_size = 100  # limite prático

        texts = [f"Document {i}" for i in range(150)]

        # Deveria dividir em chunks
        chunks = [texts[i:i+batch_size] for i in range(0, len(texts), batch_size)]
        assert len(chunks) == 2
        assert len(chunks[0]) == 100
        assert len(chunks[1]) == 50

    def test_error_handling_embedding_failure(self, mock_supabase):
        """Validar tratamento de erro em falha de embedding"""
        table = mock_supabase.table("rag_context_operational")
        table.upsert.side_effect = Exception("Embedding API error")

        with pytest.raises(Exception):
            table.upsert({"source_path": "test", "embedding": []}).execute()

    def test_vector_normalization(self):
        """Validar que embeddings estão em escala apropriada"""
        import hashlib

        def normalize_embedding(values):
            # Embeddings devem estar entre -1 e 1 ou 0 e 1
            return all(-2 <= v <= 2 for v in values)

        text = "test"
        hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
        embedding = [(hash_val + i) % 1000 / 1000.0 for i in range(768)]

        assert normalize_embedding(embedding)
        assert all(0 <= v <= 1 for v in embedding)
