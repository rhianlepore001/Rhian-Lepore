from pathlib import Path
import sys

root = Path(sys.argv[1]) / "supabase/migrations"

def section(filename, start, end=None):
    source = (root / filename).read_text()
    source = source[source.index(start):]
    return source[:source.index(end)] if end else source

print(section("20260629000003_memberships.sql", "CREATE TABLE IF NOT EXISTS public.membership_plans", "-- 5. Campos Pix"))
print(section("20260906000001_queue_v2.sql", "CREATE OR REPLACE FUNCTION public.queue_lock_settings", "CREATE OR REPLACE FUNCTION public.get_queue_public_board"))
print(section("20260910120000_queue_realtime_broadcast.sql", "CREATE OR REPLACE FUNCTION public.get_queue_public_board"))
print(section("20260613_security_s2_public_rls.sql", "CREATE OR REPLACE FUNCTION get_queue_entry_public(", "CREATE OR REPLACE FUNCTION get_public_business_profile_minimal("))
print((root / "20260703000001_cancel_queue_entry_public.sql").read_text())
print((root / "20260905140000_club_mbway_and_pending_retry.sql").read_text())
print("ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;")
print("REVOKE ALL ON FUNCTION public.queue_join_core(text,text,text,uuid,uuid,text,text,text,text), public.queue_lock_settings(text), public.queue_tenant_id() FROM PUBLIC,anon,authenticated;")
