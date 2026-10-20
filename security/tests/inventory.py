import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
entries = []
patterns = {
    "table": r"CREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[\w.]+[\s\S]*?;",
    "policy": r"CREATE\s+POLICY\s+[\s\S]*?;",
    "drop_policy": r"DROP\s+POLICY\s+[\s\S]*?;",
    "rls": r"ALTER\s+TABLE\s+[^;]+(?:ENABLE|DISABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY\s*;",
    "grant": r"(?:GRANT|REVOKE)\s+[^;]+;",
    "function": r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+[\w.]+\s*\([\s\S]*?(\$\w*\$)[\s\S]*?\1[^;]*;",
    "view": r"CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+[^;]+;",
}
for path in sorted((ROOT / "supabase/migrations").glob("*.sql")):
    source = path.read_text()
    source = re.sub(r"/\*[\s\S]*?\*/|--[^\n]*", lambda m: "\n" * m[0].count("\n"), source)
    for kind, pattern in patterns.items():
        for match in re.finditer(pattern, source, re.I):
            sql = match[0].strip()
            entry = {
                "kind": kind,
                "source": str(path.relative_to(ROOT)),
                "line": source[:match.start()].count("\n") + 1,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            if kind == "function":
                delimiter = re.search(r"\$\w*\$", sql)
                entry["declaration"] = sql[:delimiter.start()].strip()
                entry["security_definer"] = bool(re.search(r"SECURITY\s+DEFINER", sql, re.I))
                entry["search_path"] = re.findall(r"SET\s+search_path\s*(?:TO|=)\s*[^\n]+", sql, re.I)
                entry["uses_auth_uid"] = bool(re.search(r"auth\.uid\s*\(", sql, re.I))
                entry["relations"] = sorted(set(re.findall(r"(?:FROM|JOIN|UPDATE|INTO)\s+([\w.]+)", sql, re.I)))
            else:
                entry["sql"] = sql
            entries.append(entry)

output = {
    "scope": "Source declarations only; historical/dynamic DDL is not an effective catalog. Regex inventory requires manual interpretation.",
    "entries": entries,
}
target = ROOT / "security/tests/source-inventory.json"
target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
print(f"{len(entries)} source declarations written to {target.relative_to(ROOT)}")
