#!/usr/bin/env bash
set -euo pipefail
umask 077
LAB_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LAB_DIR="$LAB_ROOT/security/local/.runtime"
LAB_CLI="$LAB_ROOT/node_modules/.bin/supabase"
LAB_MODE="${1:-prepare}"
[[ "$LAB_MODE" == prepare || "$LAB_MODE" == start ]] || { echo 'Use prepare or start.'; exit 2; }
[[ -x "$LAB_CLI" ]] || { echo 'Install repository dependencies with npm ci first.'; exit 1; }
mkdir -p "$LAB_DIR"
if [[ ! -f "$LAB_DIR/supabase/config.toml" ]]; then
  "$LAB_CLI" init --workdir "$LAB_DIR" > "$LAB_DIR/init.log" 2>&1
fi
python3 - "$LAB_DIR/supabase/config.toml" <<'PY'
import re
import sys
import tomllib
from pathlib import Path

path = Path(sys.argv[1])
source = path.read_text()
config = tomllib.loads(source)
if config.get('project_id') not in ('runtime', '.runtime', 'agendix-security-local'):
    raise SystemExit('Refusing to overwrite an unrelated local project.')
source = re.sub(r'^project_id\s*=.*$', 'project_id = "agendix-security-local"', source, count=1, flags=re.M)
for section in ['db.migrations', 'db.seed', 'realtime', 'studio', 'edge_runtime', 'analytics', 'storage.vector']:
    pattern = r'(^\[' + re.escape(section) + r'\]\n)(.*?)(?=^\[|\Z)'
    def disable(match):
        body, count = re.subn(r'^enabled\s*=.*$', 'enabled = false', match[2], count=1, flags=re.M)
        if count != 1:
            raise SystemExit(f'Cannot safely configure {section}.')
        return match[1] + body
    source, count = re.subn(pattern, disable, source, flags=re.M | re.S)
    if count != 1:
        raise SystemExit(f'Unsupported CLI config: missing {section}.')
config = tomllib.loads(source)
if not config.get('local_smtp', {}).get('enabled'):
    raise SystemExit('Local email capture must be enabled.')
auth = config.get('auth', {})
if auth.get('email', {}).get('smtp', {}).get('enabled'):
    raise SystemExit('External SMTP is not allowed in this lab.')
for category in ['external', 'third_party']:
    for provider in auth.get(category, {}).values():
        if isinstance(provider, dict) and provider.get('enabled'):
            raise SystemExit('External authentication providers are not allowed in this lab.')
path.write_text(source)
PY
echo 'Isolated local configuration prepared; application schema has not been imported.'
if [[ "$LAB_MODE" == prepare ]]; then exit 0; fi
env -u DOCKER_HOST -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  docker --host=unix:///var/run/docker.sock info > "$LAB_DIR/docker.log" 2>&1
if env -u DOCKER_CONTEXT -u DOCKER_TLS -u DOCKER_TLS_VERIFY -u DOCKER_CERT_PATH \
  DOCKER_HOST=unix:///var/run/docker.sock "$LAB_CLI" start --workdir "$LAB_DIR" \
  --exclude realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor \
  > "$LAB_DIR/start.log" 2>&1; then
  echo 'Local infrastructure started. AgendiX integration remains pending schema import and validation.'
else
  echo 'Local infrastructure did not start. Inspect the private .runtime/start.log file; do not publish its credentials.' >&2
  exit 1
fi
