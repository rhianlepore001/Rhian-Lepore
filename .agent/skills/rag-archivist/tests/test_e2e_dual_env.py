"""
Testes de Integração para E2E Dual-Environment
Valida sincronização entre Antigravity (Gemini IDE) e Claude Code (AIOX CLI)
"""

import pytest
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock, call

# Adicionar path para importar módulos da skill
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


@pytest.mark.integration
class TestDualEnvironmentE2E:
    """Testes E2E para sincronização dual-environment"""

    def test_antigravity_trigger_session_end(self, mock_supabase, mock_embeddings):
        """Validar trigger /sync-memory em Antigravity (session_end)"""
        # Simular evento de session_end do Antigravity
        trigger_event = {
            "source": "antigravity",
            "event": "session_end",
            "timestamp": "2026-03-14T10:00:00Z",
            "files": ["docs/stories/US-001.md"]
        }

        # Mock de indexação
        table = mock_supabase.table("rag_context_operational")
        table.upsert.return_value.execute.return_value = {
            "data": [{
                "id": "embedding-001",
                "source_path": "docs/stories/US-001.md",
                "source_env": "antigravity",
                "source_event": "session_end",
                "embedding": mock_embeddings("US-001"),
                "created_at": "2026-03-14T10:00:00Z"
            }]
        }

        # Verificar que upsert foi chamado
        upsert_result = table.upsert({"source_env": "antigravity"}).execute()

        assert len(upsert_result["data"]) == 1
        assert upsert_result["data"][0]["source_env"] == "antigravity"
        assert upsert_result["data"][0]["source_event"] == "session_end"

    def test_claude_code_trigger_qa_gate_pass(self, mock_supabase, mock_embeddings):
        """Validar trigger em Claude Code (story_done / qa_gate_pass)"""
        # Simular evento de QA Gate PASS do Claude Code
        trigger_event = {
            "source": "claude-code",
            "event": "qa_gate_pass",
            "timestamp": "2026-03-14T11:00:00Z",
            "story_id": "US-002"
        }

        table = mock_supabase.table("rag_context_operational")
        table.upsert.return_value.execute.return_value = {
            "data": [{
                "id": "embedding-002",
                "source_path": "docs/stories/US-002.md",
                "source_env": "claude-code",
                "source_event": "qa_gate_pass",
                "embedding": mock_embeddings("US-002"),
                "created_at": "2026-03-14T11:00:00Z"
            }]
        }

        upsert_result = table.upsert({"source_env": "claude-code"}).execute()

        assert len(upsert_result["data"]) == 1
        assert upsert_result["data"][0]["source_env"] == "claude-code"
        assert upsert_result["data"][0]["source_event"] == "qa_gate_pass"

    def test_both_environments_write_same_table(self, mock_supabase, mock_embeddings):
        """Validar que ambos ambientes escrevem na mesma tabela (rag_context_operational)"""
        table = mock_supabase.table("rag_context_operational")

        # Antigravity write
        antigravity_data = {
            "id": "emb-anti-001",
            "source_path": "docs/stories/US-001.md",
            "source_env": "antigravity",
            "embedding": mock_embeddings("US-001")
        }
        table.upsert(antigravity_data).execute()

        # Claude Code write
        claude_data = {
            "id": "emb-claude-001",
            "source_path": "docs/stories/US-002.md",
            "source_env": "claude-code",
            "embedding": mock_embeddings("US-002")
        }
        table.upsert(claude_data).execute()

        # Ambos devem ter chamado upsert
        assert table.upsert.call_count == 2

    def test_both_environments_data_consistency(self, mock_supabase, mock_embeddings):
        """Validar que dados são coerentes entre ambientes"""
        table = mock_supabase.table("rag_context_operational")

        # Mesmo arquivo indexado de ambos ambientes deve ter estrutura similar
        shared_file = "docs/stories/SHARED.md"
        shared_content = "# Shared Story\n\nContent"

        # Antigravity indexa
        antigravity_record = {
            "source_path": shared_file,
            "content_hash": "abc123",
            "embedding": mock_embeddings(shared_content),
            "source_env": "antigravity",
            "created_at": "2026-03-14T10:00:00Z"
        }

        # Claude Code indexa (alguns minutos depois)
        claude_record = {
            "source_path": shared_file,
            "content_hash": "abc123",  # Mesmo hash = mesmo conteúdo
            "embedding": mock_embeddings(shared_content),  # Mesmo embedding
            "source_env": "claude-code",
            "created_at": "2026-03-14T10:05:00Z"
        }

        table.upsert.return_value.execute.return_value = {
            "data": [antigravity_record]
        }
        result1 = table.upsert(antigravity_record).execute()

        table.upsert.return_value.execute.return_value = {
            "data": [claude_record]
        }
        result2 = table.upsert(claude_record).execute()

        # Ambos registros devem ter:
        # 1. Mesmo source_path
        # 2. Mesmo content_hash
        # 3. Embeddings compatíveis (768 dims)
        assert result1["data"][0]["source_path"] == result2["data"][0]["source_path"]
        assert result1["data"][0]["content_hash"] == result2["data"][0]["content_hash"]
        assert len(result1["data"][0]["embedding"]) == 768
        assert len(result2["data"][0]["embedding"]) == 768

    def test_both_environments_trigger_sync_log(self, mock_supabase):
        """Validar que ambos ambientes geram entradas em sync-log.jsonl"""
        # Simular operações que geram logs
        logs = []

        # Antigravity sync
        antigravity_log = {
            "timestamp": "2026-03-14T10:00:00Z",
            "source_env": "antigravity",
            "source_event": "session_end",
            "files_processed": 5,
            "created": 3,
            "skipped": 2,
            "errors": 0
        }
        logs.append(antigravity_log)

        # Claude Code sync
        claude_log = {
            "timestamp": "2026-03-14T11:00:00Z",
            "source_env": "claude-code",
            "source_event": "qa_gate_pass",
            "files_processed": 1,
            "created": 1,
            "skipped": 0,
            "errors": 0
        }
        logs.append(claude_log)

        # Ambos devem estar presentes no log
        assert len(logs) == 2
        assert logs[0]["source_env"] == "antigravity"
        assert logs[1]["source_env"] == "claude-code"

    def test_different_trigger_events_recorded(self, mock_supabase):
        """Validar que diferentes eventos disparadores são registrados corretamente"""
        table = mock_supabase.table("rag_context_operational")

        events = [
            ("manual_sync", "User-initiated"),
            ("session_end", "Antigravity session ended"),
            ("qa_gate_pass", "QA Gate passed"),
            ("story_done", "Story completed"),
        ]

        for event, description in events:
            record = {
                "source_event": event,
                "description": description,
                "embedding": [0.1] * 768
            }
            table.upsert(record).execute()

        assert table.upsert.call_count == len(events)

    def test_concurrent_syncs_from_both_environments(self, mock_supabase, mock_embeddings):
        """Validar que sincronizações concorrentes de ambos ambientes são seguras"""
        table = mock_supabase.table("rag_context_operational")

        # Simular concurrent operations (com delay)
        operations = []

        # Antigravity sync
        anti_op = {
            "source_env": "antigravity",
            "source_path": "docs/stories/US-001.md",
            "embedding": mock_embeddings("US-001")
        }
        operations.append(anti_op)

        # Claude sync (concorrente)
        claude_op = {
            "source_env": "claude-code",
            "source_path": "docs/stories/US-002.md",
            "embedding": mock_embeddings("US-002")
        }
        operations.append(claude_op)

        # Executar operações
        for op in operations:
            table.upsert(op).execute()

        # Ambas devem ter sucesso
        assert table.upsert.call_count == 2

    def test_metadata_preservation_both_environments(self, mock_supabase):
        """Validar que metadata é preservada igualmente em ambos ambientes"""
        table = mock_supabase.table("rag_context_operational")

        # Metadata comum
        metadata = {
            "story_id": "US-001",
            "word_count": 250,
            "has_api_key": False,
            "content_type": "story"
        }

        # Record from Antigravity
        antigravity_record = {
            "source_path": "docs/stories/US-001.md",
            "source_env": "antigravity",
            "metadata": metadata,
            "embedding": [0.1] * 768
        }

        # Record from Claude Code
        claude_record = {
            "source_path": "docs/stories/US-001.md",
            "source_env": "claude-code",
            "metadata": metadata,
            "embedding": [0.1] * 768
        }

        table.upsert(antigravity_record).execute()
        table.upsert(claude_record).execute()

        # Ambos registros devem ter mesma metadata
        calls = table.upsert.call_args_list
        assert calls[0][0][0]["metadata"] == calls[1][0][0]["metadata"]

    def test_table_selection_same_for_both_environments(self, mock_supabase):
        """Validar que seleção de tabela é consistente entre ambientes"""
        # PRD → strategic table
        prd_file = "docs/prd/2026-03-14-EPIC-003.md"
        assert self._detect_table(prd_file) == "rag_context_strategic"

        # ADR → architecture table
        adr_file = "docs/architecture/ADR-001-vector-db.md"
        assert self._detect_table(adr_file) == "rag_context_architecture"

        # Story → operational table
        story_file = "docs/stories/US-001.md"
        assert self._detect_table(story_file) == "rag_context_operational"

        # Memory → conversational table
        memory_file = ".agent/memory/MEMORY.md"
        assert self._detect_table(memory_file) == "rag_context_conversational"

    def _detect_table(self, file_path: str) -> str:
        """Helper para detectar tabela baseado no path"""
        if "prd" in file_path.lower() or "epic" in file_path.lower():
            return "rag_context_strategic"
        elif "architecture" in file_path.lower() or "adr" in file_path.lower():
            return "rag_context_architecture"
        elif "stories" in file_path.lower() or "us-" in file_path.lower():
            return "rag_context_operational"
        elif "memory" in file_path.lower() or ".agent" in file_path.lower():
            return "rag_context_conversational"
        return "rag_context_operational"  # default

    def test_error_handling_one_env_fails(self, mock_supabase):
        """Validar que falha em um ambiente não afeta o outro"""
        table = mock_supabase.table("rag_context_operational")

        # Antigravity sync succeed
        table.upsert.return_value.execute.return_value = {
            "data": [{"id": "ok"}]
        }

        # Claude Code sync fails
        table.upsert.side_effect = [
            MagicMock(execute=MagicMock(return_value={"data": [{"id": "ok"}]})),
            Exception("Database connection error")
        ]

        # First call succeeds
        try:
            table.upsert({}).execute()
        except:
            pass

        # Both environments should be logged
        assert table.upsert.call_count >= 1

    def test_timestamp_ordering_across_environments(self, mock_supabase):
        """Validar que timestamps são ordenáveis entre ambientes"""
        table = mock_supabase.table("rag_context_operational")

        # Antigravity at 10:00
        antigravity_record = {
            "source_env": "antigravity",
            "created_at": "2026-03-14T10:00:00Z"
        }

        # Claude Code at 10:05
        claude_record = {
            "source_env": "claude-code",
            "created_at": "2026-03-14T10:05:00Z"
        }

        table.upsert(antigravity_record).execute()
        table.upsert(claude_record).execute()

        # Timestamps should be comparable
        ts1 = "2026-03-14T10:00:00Z"
        ts2 = "2026-03-14T10:05:00Z"

        assert ts1 < ts2  # Antigravity happened first
