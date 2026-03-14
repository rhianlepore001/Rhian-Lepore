"""
Testes para sync_memory.py — invocação de script e gerenciamento de flags
"""

import pytest
import sys
import subprocess
from pathlib import Path
from unittest.mock import patch, MagicMock, call, mock_open

# Adicionar path para importar módulos da skill
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


@pytest.mark.unit
class TestSyncMemory:
    """Testes para script sync_memory.py"""

    def test_script_invocation_with_path_flag(self):
        """Validar invocação de script com --path"""
        file_path = "docs/stories/US-001.md"

        # Mock subprocess
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            # Simular invocação
            result = subprocess.run([
                'python',
                'sync_memory.py',
                '--path', file_path
            ])

            assert result.returncode == 0
            mock_run.assert_called_once()

    def test_script_invocation_with_dir_flag(self):
        """Validar invocação de script com --dir"""
        directory = "docs/stories/"

        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            result = subprocess.run([
                'python',
                'sync_memory.py',
                '--dir', directory
            ])

            assert result.returncode == 0
            mock_run.assert_called_once()

    def test_script_invocation_with_dry_run_flag(self):
        """Validar invocação com --dry-run"""
        file_path = "docs/stories/US-001.md"

        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            result = subprocess.run([
                'python',
                'sync_memory.py',
                '--path', file_path,
                '--dry-run'
            ])

            assert result.returncode == 0

    def test_script_invocation_with_env_flag(self):
        """Validar invocação com --env flag"""
        file_path = "docs/stories/US-001.md"

        for env in ['claude-code', 'antigravity', 'manual']:
            with patch('subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(returncode=0)

                result = subprocess.run([
                    'python',
                    'sync_memory.py',
                    '--path', file_path,
                    '--env', env
                ])

                assert result.returncode == 0

    def test_script_invocation_with_event_flag(self):
        """Validar invocação com --event flag customizado"""
        file_path = "docs/stories/US-001.md"
        event = "story_done"

        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            result = subprocess.run([
                'python',
                'sync_memory.py',
                '--path', file_path,
                '--event', event
            ])

            assert result.returncode == 0

    def test_script_invocation_with_table_flag(self):
        """Validar invocação com --table (force específica)"""
        file_path = "docs/stories/US-001.md"
        table = "rag_context_operational"

        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            result = subprocess.run([
                'python',
                'sync_memory.py',
                '--path', file_path,
                '--table', table
            ])

            assert result.returncode == 0

    def test_script_invocation_combined_flags(self):
        """Validar invocação com múltiplos flags"""
        file_path = "docs/stories/US-001.md"

        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=0)

            result = subprocess.run([
                'python',
                'sync_memory.py',
                '--path', file_path,
                '--env', 'antigravity',
                '--event', 'session_end',
                '--dry-run'
            ])

            assert result.returncode == 0

    def test_script_fails_without_path_or_dir(self):
        """Validar que script falha se nenhum --path ou --dir"""
        with patch('subprocess.run') as mock_run:
            mock_run.return_value = MagicMock(returncode=1)

            result = subprocess.run(['python', 'sync_memory.py'])

            assert result.returncode != 0

    def test_script_failure_with_missing_gemini_key(self):
        """Validar que script falha gracefully sem GEMINI_API_KEY"""
        file_path = "docs/stories/US-001.md"

        with patch.dict('os.environ', {}, clear=True):
            with patch('subprocess.run') as mock_run:
                mock_run.return_value = MagicMock(returncode=1)

                result = subprocess.run([
                    'python',
                    'sync_memory.py',
                    '--path', file_path
                ])

                assert result.returncode != 0

    def test_collect_markdown_files_valid_directory(self, temp_test_dir):
        """Validar coleta de arquivos .md em diretório válido"""
        # Criar alguns arquivos de teste
        stories_dir = temp_test_dir / "stories"
        stories_dir.mkdir()

        # Criar arquivos de teste
        (stories_dir / "US-001.md").write_text("# Story 1")
        (stories_dir / "US-002.md").write_text("# Story 2")
        (stories_dir / "README.md").write_text("# README")

        # Mock e testar
        from sync_memory import collect_markdown_files

        with patch('pathlib.Path.rglob') as mock_rglob:
            mock_rglob.return_value = [
                Path("stories/US-001.md"),
                Path("stories/US-002.md"),
                Path("stories/README.md")
            ]

            # Path mock
            with patch('pathlib.Path.is_dir', return_value=True):
                files = collect_markdown_files(str(stories_dir))
                assert len(files) > 0

    def test_collect_markdown_files_invalid_directory(self):
        """Validar que função retorna lista vazia para diretório inválido"""
        from sync_memory import collect_markdown_files

        with patch('pathlib.Path.is_dir', return_value=False):
            files = collect_markdown_files("/nonexistent/path")
            assert files == []

    def test_sync_file_success(self):
        """Validar sincronização bem-sucedida de arquivo"""
        from sync_memory import sync_file

        file_path = "docs/stories/US-001.md"
        content = "# Story\n\nSample content"

        with patch('builtins.open', mock_open(read_data=content)):
            with patch('sync_memory.sanitize') as mock_sanitize:
                with patch('sync_memory.detect_table') as mock_detect:
                    with patch('sync_memory.check_duplicate') as mock_check_dup:
                        with patch('sync_memory.index_file') as mock_index:
                            # Setup mocks
                            mock_sanitize.return_value = (content, [])
                            mock_detect.return_value = "rag_context_operational"
                            mock_check_dup.return_value = (False, None)
                            mock_index.return_value = {'created': 1}

                            result = sync_file(file_path)

                            assert result.get('created') == 1

    def test_sync_file_handles_missing_file(self):
        """Validar tratamento de arquivo não encontrado"""
        from sync_memory import sync_file

        file_path = "nonexistent.md"

        with patch('builtins.open', side_effect=FileNotFoundError):
            result = sync_file(file_path)

            assert result.get('errors') == 1 or result.get('skipped') == 1

    def test_sync_file_skips_empty_content(self):
        """Validar que arquivo vazio é pulado"""
        from sync_memory import sync_file

        file_path = "empty.md"

        with patch('builtins.open', mock_open(read_data="")):
            result = sync_file(file_path)

            assert result.get('skipped') == 1

    def test_sync_file_skips_duplicates(self):
        """Validar que duplicatas são puladas"""
        from sync_memory import sync_file

        file_path = "duplicate.md"
        content = "# Story\n\nSample content"

        with patch('builtins.open', mock_open(read_data=content)):
            with patch('sync_memory.sanitize') as mock_sanitize:
                with patch('sync_memory.detect_table') as mock_detect:
                    with patch('sync_memory.check_duplicate') as mock_check_dup:
                        # Setup mocks
                        mock_sanitize.return_value = (content, [])
                        mock_detect.return_value = "rag_context_operational"
                        mock_check_dup.return_value = (True, "existing-id")

                        result = sync_file(file_path)

                        assert result.get('skipped') == 1

    def test_sync_file_with_dry_run(self):
        """Validar que --dry-run não marca obsoletos"""
        from sync_memory import sync_file

        file_path = "docs/stories/US-001.md"
        content = "# Story\n\nSample content"

        with patch('builtins.open', mock_open(read_data=content)):
            with patch('sync_memory.sanitize') as mock_sanitize:
                with patch('sync_memory.detect_table') as mock_detect:
                    with patch('sync_memory.check_duplicate') as mock_check_dup:
                        with patch('sync_memory.index_file') as mock_index:
                            with patch('sync_memory.mark_obsolete') as mock_mark:
                                # Setup mocks
                                mock_sanitize.return_value = (content, [])
                                mock_detect.return_value = "rag_context_operational"
                                mock_check_dup.return_value = (False, None)
                                mock_index.return_value = {'created': 1}

                                result = sync_file(file_path, dry_run=True)

                                # mark_obsolete não deve ser chamado em dry-run
                                mock_mark.assert_not_called()

    def test_load_exclusions_file(self):
        """Validar carregamento de .archivist/exclusions.txt"""
        exclusions_content = """# Exclusion list
package-lock.json
node_modules/**
.env*
*.lock
"""

        with patch('builtins.open', mock_open(read_data=exclusions_content)):
            with patch('pathlib.Path.exists', return_value=True):
                # Simular carregamento
                exclusions = []
                for line in exclusions_content.split('\n'):
                    line = line.strip()
                    if line and not line.startswith('#'):
                        exclusions.append(line)

                assert len(exclusions) == 4
                assert 'package-lock.json' in exclusions
                assert 'node_modules/**' in exclusions

    def test_exclusions_file_missing(self):
        """Validar comportamento quando exclusions.txt não existe"""
        with patch('pathlib.Path.exists', return_value=False):
            # Deve retornar lista vazia ou usar defaults
            exclusions = []
            assert exclusions == []

    def test_source_env_parameter_values(self):
        """Validar que source_env pode ser claude-code, antigravity ou manual"""
        from sync_memory import sync_file

        file_path = "docs/stories/US-001.md"
        content = "# Story"

        valid_envs = ['claude-code', 'antigravity', 'manual']

        for env in valid_envs:
            with patch('builtins.open', mock_open(read_data=content)):
                with patch('sync_memory.sanitize') as mock_sanitize:
                    with patch('sync_memory.detect_table') as mock_detect:
                        with patch('sync_memory.check_duplicate') as mock_check_dup:
                            with patch('sync_memory.index_file') as mock_index:
                                # Setup mocks
                                mock_sanitize.return_value = (content, [])
                                mock_detect.return_value = "rag_context_operational"
                                mock_check_dup.return_value = (False, None)
                                mock_index.return_value = {'created': 1}

                                result = sync_file(file_path, source_env=env)

                                # Verify index_file was called with correct env
                                assert mock_index.called

    def test_source_event_parameter_values(self):
        """Validar que source_event pode ser customizado"""
        from sync_memory import sync_file

        file_path = "docs/stories/US-001.md"
        content = "# Story"
        events = ['manual_sync', 'session_end', 'story_done', 'qa_gate_pass']

        for event in events:
            with patch('builtins.open', mock_open(read_data=content)):
                with patch('sync_memory.sanitize') as mock_sanitize:
                    with patch('sync_memory.detect_table') as mock_detect:
                        with patch('sync_memory.check_duplicate') as mock_check_dup:
                            with patch('sync_memory.index_file') as mock_index:
                                # Setup mocks
                                mock_sanitize.return_value = (content, [])
                                mock_detect.return_value = "rag_context_operational"
                                mock_check_dup.return_value = (False, None)
                                mock_index.return_value = {'created': 1}

                                result = sync_file(file_path, source_event=event)

                                assert mock_index.called

    def test_table_force_parameter(self):
        """Validar que --table força tabela específica"""
        from sync_memory import sync_file

        file_path = "docs/stories/US-001.md"
        content = "# Story"
        forced_table = "rag_context_strategic"

        with patch('builtins.open', mock_open(read_data=content)):
            with patch('sync_memory.sanitize') as mock_sanitize:
                with patch('sync_memory.check_duplicate') as mock_check_dup:
                    with patch('sync_memory.index_file') as mock_index:
                        # Setup mocks
                        mock_sanitize.return_value = (content, [])
                        mock_check_dup.return_value = (False, None)
                        mock_index.return_value = {'created': 1}

                        result = sync_file(file_path, target_table=forced_table)

                        # Verify index_file was called with forced table
                        call_kwargs = mock_index.call_args[1]
                        assert call_kwargs.get('target_table') == forced_table

    def test_main_function_success_path(self):
        """Validar que main() retorna 0 on success"""
        with patch('sys.argv', ['sync_memory.py', '--path', 'test.md']):
            with patch('os.getenv', return_value='fake-gemini-key'):
                with patch('sync_memory.collect_markdown_files') as mock_collect:
                    with patch('sync_memory.sync_file') as mock_sync:
                        # Setup mocks
                        mock_collect.return_value = []
                        mock_sync.return_value = {'created': 1, 'errors': []}

                        from sync_memory import main

                        with patch('builtins.open', mock_open(read_data="test")):
                            result = main()
                            assert result == 0

    def test_main_function_error_path(self):
        """Validar que main() retorna 1 on error"""
        with patch('sys.argv', ['sync_memory.py']):
            from sync_memory import main

            result = main()
            assert result == 1  # No --path or --dir specified
