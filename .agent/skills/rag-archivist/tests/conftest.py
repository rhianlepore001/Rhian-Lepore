"""
Configuração e Fixtures compartilhadas para testes do RAG 2.0
"""

import pytest
from unittest.mock import MagicMock, patch
import json
from pathlib import Path


@pytest.fixture
def mock_supabase():
    """Mock do cliente Supabase"""
    client = MagicMock()

    # Mock table operations
    table_mock = MagicMock()
    client.table.return_value = table_mock

    # Mock upsert chain
    upsert_mock = MagicMock()
    table_mock.upsert.return_value = upsert_mock
    upsert_mock.execute.return_value = {"data": [{"id": "test-id"}]}

    # Mock select chain
    select_mock = MagicMock()
    table_mock.select.return_value = select_mock
    select_mock.execute.return_value = {"data": []}

    return client


@pytest.fixture
def mock_embeddings():
    """Mock de embeddings com 768 dimensões (text-embedding-004)"""
    def generate_embedding(text):
        # Embeddings fake determinísticos baseados no hash do texto
        import hashlib
        hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
        return [(hash_val + i) % 1000 / 1000.0 for i in range(768)]

    return generate_embedding


@pytest.fixture
def mock_genai():
    """Mock do google.generativeai para embeddings"""
    with patch('google.generativeai.embed_content') as mock_embed:
        def embed_side_effect(text, model):
            import hashlib
            hash_val = int(hashlib.sha256(text.encode()).hexdigest(), 16)
            embedding = [(hash_val + i) % 1000 / 1000.0 for i in range(768)]
            return {"embedding": embedding}

        mock_embed.side_effect = embed_side_effect
        yield mock_embed


@pytest.fixture
def sample_story_content():
    """Conteúdo de sample story para testes"""
    return """---
id: US-001
título: Sample Story
status: done
---

# Sample User Story

Este é um story de exemplo para testes do RAG 2.0.

## Descrição

This story contains some technical details that should be indexed.

## Decisões Técnicas

- Usar PostgreSQL para persistência
- Implementar cache com Redis
- Usar Supabase RLS para segurança

## Próximos Passos

- Testar em produção
- Monitorar performance
"""


@pytest.fixture
def sample_memory_content():
    """Conteúdo de sample MEMORY.md para testes"""
    return """# Project Memory - RAG 2.0

## Decisões Arquiteturais

### ADR-001: Vector Database Choice

- **Decision:** Use Supabase with pgvector for RAG embeddings
- **Rationale:** Native PostgreSQL support, built-in RLS, cost-effective
- **Alternatives Considered:** Pinecone, Weaviate, Qdrant
- **Date:** 2026-03-14

## Padrões Encontrados

### Pattern: Graceful Degradation

Todos os sistemas RAG falham silenciosamente sem credentials, nunca bloqueando fluxo de trabalho.

### Pattern: Dual-Environment Sync

Claude Code e Antigravity compartilham mesma memória via Supabase RAG.

## Gotchas Aprendidas

- Não fazer requisições de embedding em testes, sempre mockar
- Sanitização deve acontecer ANTES de qualquer escrita
- Deduplicação via source_path é critical para evitar duplicatas
"""


@pytest.fixture
def temp_test_dir(tmp_path):
    """Diretório temporário para testes"""
    test_dir = tmp_path / "test_rag"
    test_dir.mkdir()

    # Criar arquivos de teste
    stories_dir = test_dir / "stories"
    stories_dir.mkdir()

    memory_dir = test_dir / ".agent" / "memory"
    memory_dir.mkdir(parents=True)

    return test_dir


@pytest.fixture
def exclusions_list():
    """Lista de padrões de exclusão"""
    return """
package-lock.json
node_modules/**
.eslintrc*
.eslintignore
vite.config.*
tsconfig*.json
*.lock
dist/**
coverage/**
__pycache__/**
.git/**
.env*
"""


@pytest.fixture
def test_embeddings_data():
    """Dados de teste para busca vetorial"""
    return {
        "documents": [
            {
                "id": "doc-1",
                "title": "RAG Implementation Strategy",
                "content": "RAG systems retrieve relevant context and augment generation with retrieved knowledge.",
                "embedding": [0.1] * 768
            },
            {
                "id": "doc-2",
                "title": "Vector Database Patterns",
                "content": "Vector databases enable similarity search using embeddings and distance metrics.",
                "embedding": [0.2] * 768
            },
            {
                "id": "doc-3",
                "title": "Deduplication Techniques",
                "content": "Deduplication uses SHA-256 hashing to detect and prevent duplicate content indexing.",
                "embedding": [0.3] * 768
            },
            {
                "id": "doc-4",
                "title": "Supabase PostgreSQL",
                "content": "Supabase provides PostgreSQL with pgvector extension for vector operations.",
                "embedding": [0.4] * 768
            },
            {
                "id": "doc-5",
                "title": "API Key Security",
                "content": "Never store API keys in indexed content. Sanitize before any embedding operation.",
                "embedding": [0.5] * 768
            }
        ],
        "queries": [
            {
                "query": "RAG implementation strategy",
                "expected_top_match": "doc-1",
                "min_similarity": 0.7
            },
            {
                "query": "vector database search",
                "expected_top_match": "doc-2",
                "min_similarity": 0.7
            },
            {
                "query": "how to deduplicate",
                "expected_top_match": "doc-3",
                "min_similarity": 0.7
            }
        ]
    }


@pytest.fixture(autouse=True)
def reset_mocks():
    """Reset all mocks before each test"""
    yield
    # Cleanup happens automatically with unittest.mock


# Markers para organizar testes
def pytest_configure(config):
    """Registrar custom markers"""
    config.addinivalue_line("markers", "unit: testes unitários")
    config.addinivalue_line("markers", "integration: testes de integração")
    config.addinivalue_line("markers", "e2e: testes end-to-end")
    config.addinivalue_line("markers", "slow: testes lentos")
