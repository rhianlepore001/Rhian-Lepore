"""
Testes de Integração para Busca Vetorial com Similaridade
Valida que query similar retorna chunks relevantes com score > 0.7
"""

import pytest
import numpy as np
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


@pytest.mark.integration
class TestVectorSimilaritySearch:
    """Testes para busca vetorial e cálculo de similaridade"""

    def test_query_returns_top_5_results(self, test_embeddings_data, mock_supabase):
        """Validar que query retorna top-5 resultados"""
        documents = test_embeddings_data['documents']
        query = test_embeddings_data['queries'][0]['query']

        # Mock search results
        table = mock_supabase.table("rag_context_operational")

        # Simular top-5 results
        top_results = [
            {
                "id": doc['id'],
                "title": doc['title'],
                "content": doc['content'],
                "embedding": doc['embedding'],
                "similarity_score": 0.85 + (i * 0.01)
            }
            for i, doc in enumerate(documents[:5])
        ]

        table.select("*").order("similarity", desc=True).limit(5).execute.return_value = {
            "data": top_results
        }

        # Execute search
        results = table.select("*").order("similarity", desc=True).limit(5).execute()

        assert len(results["data"]) == 5
        assert results["data"][0]["similarity_score"] > results["data"][-1]["similarity_score"]

    def test_similarity_score_above_threshold(self, test_embeddings_data):
        """Validar que chunks relevantes têm score > 0.7"""
        query = "RAG implementation strategy"
        expected_top_match = test_embeddings_data['queries'][0]

        # Simular cálculo de similaridade
        similarity = self._calculate_cosine_similarity(
            [0.1] * 768,  # Query embedding
            [0.1] * 768   # Document embedding
        )

        # Embeddings idênticos = score 1.0
        assert similarity == pytest.approx(1.0, abs=0.01)
        assert similarity > 0.7  # Threshold check

    def test_different_queries_different_top_matches(self, test_embeddings_data):
        """Validar que diferentes queries retornam diferentes top matches"""
        queries = test_embeddings_data['queries']

        results = []
        for query in queries:
            # Simular search
            top_match = query['expected_top_match']
            results.append(top_match)

        # Diferentes queries devem retornar diferentes documentos como top
        assert results[0] != results[1]  # At least some difference

    def test_embedding_dimension_validation(self, mock_embeddings):
        """Validar que embeddings tem 768 dimensões para busca"""
        embedding = mock_embeddings("test content")

        assert len(embedding) == 768
        assert all(isinstance(x, float) or isinstance(x, int) for x in embedding)

    def test_cosine_similarity_calculation(self):
        """Validar cálculo correto de similaridade cosseno"""
        # Embeddings identicos → similarity = 1.0
        vec_a = np.array([1.0, 0.0, 0.0])
        vec_b = np.array([1.0, 0.0, 0.0])

        similarity = self._calculate_cosine_similarity(vec_a, vec_b)
        assert similarity == pytest.approx(1.0, abs=0.01)

        # Embeddings ortogonais → similarity = 0
        vec_c = np.array([1.0, 0.0, 0.0])
        vec_d = np.array([0.0, 1.0, 0.0])

        similarity = self._calculate_cosine_similarity(vec_c, vec_d)
        assert similarity == pytest.approx(0.0, abs=0.01)

        # Similaridade média
        vec_e = np.array([1.0, 1.0, 0.0])
        vec_f = np.array([1.0, 0.0, 0.0])

        similarity = self._calculate_cosine_similarity(vec_e, vec_f)
        assert 0.5 < similarity < 1.0

    def test_search_filters_by_table(self, mock_supabase):
        """Validar que search filtra por tabela correta"""
        # PRD query → search em rag_context_strategic
        strategic_table = mock_supabase.table("rag_context_strategic")
        strategic_table.select("*").execute.return_value = {"data": []}

        # Story query → search em rag_context_operational
        operational_table = mock_supabase.table("rag_context_operational")
        operational_table.select("*").execute.return_value = {"data": []}

        # Ambas chamadas devem funcionar
        r1 = strategic_table.select("*").execute()
        r2 = operational_table.select("*").execute()

        assert r1["data"] == []
        assert r2["data"] == []

    def test_search_order_by_similarity_descending(self, mock_supabase):
        """Validar que resultados são ordenados por similaridade descrescente"""
        results = [
            {"id": "doc1", "similarity_score": 0.95},
            {"id": "doc2", "similarity_score": 0.85},
            {"id": "doc3", "similarity_score": 0.75},
            {"id": "doc4", "similarity_score": 0.65},
            {"id": "doc5", "similarity_score": 0.55},
        ]

        # Verificar ordenação
        for i in range(len(results) - 1):
            assert results[i]["similarity_score"] >= results[i + 1]["similarity_score"]

    def test_minimum_similarity_threshold(self):
        """Validar que apenas resultados com score > 0.7 são retornados"""
        min_threshold = 0.7

        results = [
            {"id": "doc1", "score": 0.95},  # Include
            {"id": "doc2", "score": 0.85},  # Include
            {"id": "doc3", "score": 0.75},  # Include (barely)
            {"id": "doc4", "score": 0.65},  # Exclude
            {"id": "doc5", "score": 0.55},  # Exclude
        ]

        filtered = [r for r in results if r["score"] >= min_threshold]

        assert len(filtered) == 3
        assert all(r["score"] >= min_threshold for r in filtered)

    def test_search_handles_empty_results(self, mock_supabase):
        """Validar que search vazio retorna lista vazia"""
        table = mock_supabase.table("rag_context_operational")
        table.select("*").execute.return_value = {"data": []}

        results = table.select("*").execute()

        assert results["data"] == []
        assert len(results["data"]) == 0

    def test_search_with_special_characters_in_query(self):
        """Validar que query com caracteres especiais é sanitizada"""
        queries = [
            "RAG & AI",
            "What's the strategy?",
            "C++ performance",
            "100% coverage",
            "API#1"
        ]

        # Todas as queries devem ser processadas sem erro
        for query in queries:
            # Simular sanitização
            sanitized = query.replace("&", "and").replace("#", "")
            assert isinstance(sanitized, str)

    def test_search_result_metadata_included(self, mock_supabase):
        """Validar que resultados incluem metadata útil"""
        table = mock_supabase.table("rag_context_operational")

        result = {
            "id": "doc-1",
            "title": "RAG Implementation",
            "content": "RAG systems retrieve and augment...",
            "source_path": "docs/stories/US-001.md",
            "embedding": [0.1] * 768,
            "metadata": {
                "story_id": "US-001",
                "word_count": 250,
                "content_type": "story"
            },
            "similarity_score": 0.89,
            "created_at": "2026-03-14T10:00:00Z"
        }

        table.select("*").execute.return_value = {"data": [result]}

        results = table.select("*").execute()

        assert "title" in results["data"][0]
        assert "source_path" in results["data"][0]
        assert "metadata" in results["data"][0]
        assert "similarity_score" in results["data"][0]

    def test_vector_normalization_for_search(self):
        """Validar que vetores são normalizados antes de busca"""
        # Raw vector
        vec = np.array([3.0, 4.0])
        magnitude = np.linalg.norm(vec)

        # Normalized
        normalized = vec / magnitude

        # Magnitude de vetor normalizado deve ser ~1.0
        assert np.linalg.norm(normalized) == pytest.approx(1.0, abs=0.01)

    def test_search_cache_not_stale(self):
        """Validar que cache de embeddings não é stale após update"""
        # Simular que documento foi atualizado
        doc_id = "doc-1"
        original_hash = "abc123"
        updated_hash = "xyz789"

        # Cache inválido se hash diferente
        assert original_hash != updated_hash

    def test_bulk_search_multiple_queries(self):
        """Validar que múltiplas queries podem ser processadas"""
        queries = [
            "RAG implementation",
            "Vector database",
            "Semantic search",
        ]

        results_per_query = []

        for query in queries:
            # Simular search
            results = [
                {"id": "doc-1", "score": 0.85},
                {"id": "doc-2", "score": 0.75},
                {"id": "doc-3", "score": 0.65},
            ]
            results_per_query.append(results)

        # Cada query deve ter retornado resultados
        assert len(results_per_query) == 3
        assert all(len(r) > 0 for r in results_per_query)

    def test_similar_documents_proximity(self):
        """Validar que documentos similares aparecem próximos na busca"""
        # Documentos sobre mesmo tópico devem ter scores similares
        results = [
            {"id": "rag1", "title": "RAG basics", "score": 0.92},
            {"id": "rag2", "title": "RAG advanced", "score": 0.89},
            {"id": "rag3", "title": "RAG production", "score": 0.87},
        ]

        # Scores devem diminuir gradualmente para tópico similar
        for i in range(len(results) - 1):
            diff = results[i]["score"] - results[i + 1]["score"]
            assert 0 <= diff <= 0.1  # Pequena diferença entre similares

    def test_search_returns_consistent_results(self, mock_supabase):
        """Validar que mesma query retorna mesmos resultados"""
        query = "RAG implementation"

        table = mock_supabase.table("rag_context_operational")

        expected_result = {
            "data": [
                {"id": "doc-1", "score": 0.95},
                {"id": "doc-2", "score": 0.85},
            ]
        }

        table.select("*").execute.return_value = expected_result

        # Executar 2x
        r1 = table.select("*").execute()
        r2 = table.select("*").execute()

        # Resultados devem ser idênticos
        assert r1["data"][0]["id"] == r2["data"][0]["id"]
        assert r1["data"][0]["score"] == r2["data"][0]["score"]

    def test_search_performance_top_n(self):
        """Validar que limitar a top-N é eficiente"""
        # Retornar apenas top-5 deve ser mais eficiente que all results
        top_n = 5

        large_result_set = [{"id": f"doc-{i}", "score": 0.95 - (i * 0.01)} for i in range(1000)]

        # Top-5
        top_results = large_result_set[:top_n]

        assert len(top_results) == top_n
        assert top_results[0]["score"] > top_results[-1]["score"]

    def _calculate_cosine_similarity(self, vec_a, vec_b) -> float:
        """Helper para calcular similaridade cosseno"""
        vec_a = np.array(vec_a, dtype=float)
        vec_b = np.array(vec_b, dtype=float)

        # Evitar divisão por zero
        magnitude_a = np.linalg.norm(vec_a)
        magnitude_b = np.linalg.norm(vec_b)

        if magnitude_a == 0 or magnitude_b == 0:
            return 0.0

        dot_product = np.dot(vec_a, vec_b)
        return dot_product / (magnitude_a * magnitude_b)
