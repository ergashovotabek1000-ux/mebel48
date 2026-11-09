# mebel48 MVP

Telegram bot + Mini App — mijozlar mebel buyurtma qiladi, operator guruh orqali boshqaradi.

**Stack:** Grammy · Supabase · Vite · Railway

---

## Tez ishga tushirish

### 1. Supabase jadval yaratish

1. [supabase.com](https://supabase.com) → yangi project
2. **SQL Editor** → quyidagini joylashtiring va Run:

```sql
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

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

3. **Project Settings → API** → `URL` va `anon key` ni nusxalab oling

---

### 2. Telegram bot yaratish

1. [@BotFather](https://t.me/BotFather) → `/newbot` → nom va username bering
2. Token oling
3. Operator guruhi yarating → @userinfobot ni qo'shing → ID ni oling (masalan: `-1001234567890`)
4. Mini App uchun: `/newapp` → botingizni tanlang → URL bering

---

### 3. Mini App joylashtirish (GitHub Pages — bepul)

```bash
cd miniapp

# .env yarating
cp ../.env.example .env
# VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY ni kiriting

npm install
npm run build
# dist/ papkasi tayyor
```

GitHub Pages uchun:
1. GitHub repo → `Settings → Pages → Source: Deploy from a branch`
2. `dist/` papkasini `gh-pages` branchga push qiling
3. URL: `https://your-username.github.io/mebel48-miniapp`

---

### 4. Bot ishga tushirish (lokal test)

```bash
# Root papkada
cp .env.example .env
# Barcha qiymatlarni to'ldiring (WEBHOOK_URL ni o'chiring — polling ishlatadi)

npm install
node bot/index.js
```

---

### 5. Railway deploy (production)

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Environment Variables → `.env.example` dagi barcha qiymatlarni kiriting
3. `WEBHOOK_URL` = Railway bergan URL (masalan: `https://mebel48.up.railway.app`)
4. Deploy bo'ladi → bot avtomatik webhook o'rnatadi

---

## Jarayon qanday ishlaydi

```
Mijoz /start → buyurtma berish → bot Supabase ga saqlaydi
                                   ↓
                         Operator guruhiga xabar (tugmalar bilan)
                                   ↓
Operator: "✅ Dizayner boradi" → mijozga bildirishnoma
Operator: "⏱ 48s taymer boshlash" → 48 soat countdown boshlanadi
                                   ↓
                         Mini App da taymer ko'rinadi
                                   ↓
Operator: "✅ Tayyor (yetkazish)" → mijozga "Qabul qildim" tugmasi
                                   ↓
Mijoz: "✅ Mebelni qabul qildim" → buyurtma yakunlanadi
```

---

## Papka tuzilmasi

```
mebel48-mvp/
├── bot/
│   ├── index.js      # Grammy bot — asosiy logika
│   ├── db.js         # Supabase CRUD
│   └── texts.js      # O'zbek matnlar
├── miniapp/
│   ├── src/
│   │   ├── app.js    # Mini App logikasi (vanilla JS)
│   │   └── style.css # Dizayn (DM Sans + Playfair Display)
│   ├── index.html    # Kirish nuqtasi
│   ├── vite.config.js
│   └── package.json
├── db/
│   └── setup.js      # SQL print (ma'lumotnoma)
├── .env.example      # Barcha env o'zgaruvchilar
├── package.json
└── README.md
```

---

## Kelajakda qo'shish mumkin

- [ ] Rasmlar yuklash (Supabase Storage — 1GB bepul)
- [ ] Dizayner va ustalar paneli
- [ ] SMS/email bildirishnomalar (Eskiz.uz)
- [ ] To'lov integratsiyasi (Payme/Click)
- [ ] Admin statistika sahifasi
