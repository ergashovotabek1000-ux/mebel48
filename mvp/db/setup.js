// Supabase'da jadval yaratish uchun SQL
// Supabase Dashboard > SQL Editor ga quyidagini nusxalab joylashtiring

export const SQL = `
-- Buyurtmalar jadvali
CREATE TABLE IF NOT EXISTS orders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tg_id       bigint      NOT NULL,
  tg_name     text        NOT NULL,
  tg_username text,
  phone       text        NOT NULL,
  room_type   text        NOT NULL,
  style       text        NOT NULL,
  budget      bigint      NOT NULL,
  region      text        NOT NULL DEFAULT 'Navoiy',
  notes       text,
  status      text        NOT NULL DEFAULT 'new'
                          CHECK(status IN ('new','visit','design','production','delivery','done')),
  due_at      timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Status o'zgarganda updated_at avtomatik yangilanadi
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

console.log("Quyidagi SQL ni Supabase Dashboard > SQL Editor ga joylashtiring:\n");
console.log(SQL);
