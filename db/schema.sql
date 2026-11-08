CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tg_id bigint UNIQUE, email text UNIQUE, password_hash text, totp_secret text,
 name text NOT NULL, phone text, role text NOT NULL CHECK(role IN ('client','designer','workshop','operator','admin')),
 region text NOT NULL DEFAULT 'Navoiy', status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','blocked')),
 rating numeric(3,2) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO settings(key,value) VALUES
 ('deadline_hours','48'),('fine_percent','25'),('shares','{"platform":12,"designer":8,"workshop":80}'),
 ('tender_mode','"manual"'),('minimum_amount','0'),('bot_templates','{"accepted":"✅ Qabul qilindi. Dizayner tez orada bog‘lanadi.","design":"Dizayn ko‘rib chiqishga tayyor.","delivered":"Buyurtmangiz yetkazildi. Ilovada qabulni tasdiqlang."}')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_key text UNIQUE NOT NULL, client_id uuid NOT NULL REFERENCES users(id),
 designer_id uuid REFERENCES users(id), workshop_id uuid REFERENCES users(id), region text NOT NULL, room_type text NOT NULL,
 style text NOT NULL, budget bigint NOT NULL CHECK(budget>=0), contact text NOT NULL, notes text,
 status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','visit','design','tender','quote','production','inspection','delivery','completed','cancelled')),
 design_url text, revision_note text, revision_count integer NOT NULL DEFAULT 0, quoted_price bigint, due_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_region_status_idx ON orders(region,status,created_at DESC);
CREATE TABLE IF NOT EXISTS order_steps (
 id bigserial PRIMARY KEY, order_id uuid NOT NULL REFERENCES orders(id), step_name text NOT NULL, actor_id uuid REFERENCES users(id),
 media_urls jsonb NOT NULL DEFAULT '[]', details jsonb NOT NULL DEFAULT '{}', step_due_at timestamptz, occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tenders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES orders(id), workshop_id uuid NOT NULL REFERENCES users(id),
 proposed_price bigint NOT NULL CHECK(proposed_price>0), proposed_deadline timestamptz NOT NULL, status text NOT NULL DEFAULT 'open',
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,workshop_id)
);
CREATE TABLE IF NOT EXISTS payment_records (
 order_id uuid PRIMARY KEY REFERENCES orders(id), agreed_amount bigint NOT NULL CHECK(agreed_amount>0),
 status text NOT NULL DEFAULT 'unconfirmed' CHECK(status IN ('unconfirmed','confirmed')),
 method text, reference text, confirmed_at timestamptz, confirmed_by uuid REFERENCES users(id),
 shares_snapshot jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS ratings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid NOT NULL REFERENCES orders(id),client_id uuid NOT NULL REFERENCES users(id),target_id uuid NOT NULL REFERENCES users(id),stars smallint NOT NULL CHECK(stars BETWEEN 1 AND 5),comment text, UNIQUE(order_id,target_id));
CREATE TABLE IF NOT EXISTS notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),type text NOT NULL,payload jsonb NOT NULL,status text NOT NULL DEFAULT 'pending',sent_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log (id bigserial PRIMARY KEY,actor_id uuid,action text NOT NULL,entity_type text NOT NULL,entity_id text NOT NULL,old_value jsonb,new_value jsonb,ts timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_log is append-only'; END $$;
DROP TRIGGER IF EXISTS audit_immutable ON audit_log;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();
-- Existing 002 databases receive the new fields without replacing data.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS revision_count integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS quoted_price bigint;
-- measurements_submitted_at: 48-soatlik taymer shu vaqtdan boshlanadi
ALTER TABLE orders ADD COLUMN IF NOT EXISTS measurements_submitted_at timestamptz;
ALTER TABLE order_steps ADD COLUMN IF NOT EXISTS step_due_at timestamptz;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK(status IN ('new','visit','design','tender','quote','production','inspection','delivery','completed','cancelled'));
