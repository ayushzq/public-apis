-- 🔒 SUPABASE SECURITY: lock the auto-generated public REST/GraphQL API.
--
-- Supabase exposes every table in the `public` schema through PostgREST using the
-- (public!) anon key. Without Row Level Security anybody holding that key could read or
-- write ALL tables (users, password hashes, WhatsApp tokens, messages).
--
-- BaseKey never uses PostgREST — the app talks to Postgres only through Prisma, which
-- connects as the `postgres` role (bypasses RLS). So we enable RLS on every table WITHOUT
-- creating any policy (= deny-all for anon/authenticated) and revoke their privileges.
-- Safe to run on plain Postgres too: the role-specific statements are skipped when the
-- Supabase roles don't exist.

ALTER TABLE "Organization"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SystemSettings"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PushSubscription"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OtpCode"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contact"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InternalNote"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QuickReply"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatFlow"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Template"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WhatsAppTemplate"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiLog"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Campaign"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CampaignLog"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations"  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
  END IF;
END
$$;
