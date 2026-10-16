-- Personal meal plans and OAuth credentials are accessed through the application,
-- never through the public database API. Keep table-owner/BYPASSRLS access intact.
-- Do not change catalog tables, application users, or schema default privileges.
BEGIN;

ALTER TABLE public."rations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."nutrition_oauth_clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."nutrition_oauth_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."nutrition_oauth_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."nutrition_api_windows" ENABLE ROW LEVEL SECURITY;

-- No permissive RLS policies are added: ordinary database roles default to deny.
REVOKE ALL PRIVILEGES ON TABLE
    public."rations",
    public."nutrition_oauth_clients",
    public."nutrition_oauth_codes",
    public."nutrition_oauth_tokens",
    public."nutrition_api_windows"
FROM PUBLIC;

-- Supabase grants new public tables to these roles by default. Plain PostgreSQL
-- installations need not have either role, so resolve them conditionally.
DO $nutrition_chat_private_access$
DECLARE
    recipient TEXT;
BEGIN
    FOREACH recipient IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = recipient) THEN
            EXECUTE format(
                'REVOKE ALL PRIVILEGES ON TABLE public."rations", public."nutrition_oauth_clients", public."nutrition_oauth_codes", public."nutrition_oauth_tokens", public."nutrition_api_windows" FROM %I',
                recipient
            );
        END IF;
    END LOOP;
END
$nutrition_chat_private_access$;

COMMIT;
