DO $$
BEGIN
  IF inet_server_addr() IS NOT NULL
     OR current_setting('agendix.security_fixture', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'LOCAL_FIXTURE_REQUIRED: use security/tests/local-postgres.sh';
  END IF;
END $$;
