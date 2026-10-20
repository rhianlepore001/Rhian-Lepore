import re
from pathlib import Path

root = Path(__file__).resolve().parents[2]
sources = {
    "20260307_us015b_multi_user_rls.sql": [
        "Appointments: company isolation", "Services: company isolation",
        "Team: company isolation", "Finance: company isolation",
        "Settings: company read", "Settings: owner update",
    ],
    "20260216_rls_phase2_core.sql": [
        "Owner can manage business_settings", "Owner can manage business_galleries",
        "Owner can manage team_members",
    ],
    "20260216_rls_phase4_financial.sql": [
        "Owner can manage finance_records", "Owner can manage commission_payments",
    ],
    "20260804000002_clients_staff_rls_harden.sql": [
        "Staff can select company clients", "Staff can insert company clients", "Owners manage company clients",
    ],
    "20260306_goal_settings_and_dashboard_stats_v4.sql": ["goal_settings_isolamento_usuario"],
}
for filename, names in sources.items():
    source = (root / "supabase/migrations" / filename).read_text()
    for name in names:
        match = re.search(r'CREATE\s+POLICY\s+"' + re.escape(name) + r'"[\s\S]*?;', source, re.I)
        if not match:
            raise RuntimeError(f"Missing source policy: {name}")
        print(f"-- Exact source: supabase/migrations/{filename}")
        print(match[0])
