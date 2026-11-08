# Mebel48 · 004

TZ 1.0 asosidagi Navoiy sinovi uchun kod: Telegram buyurtma boti, mijoz/dizayner/sex Mini Appi, admin panel, tender, media yuklash va audit. Escrow hamda to‘lov provayderi chiqarildi. To‘lov faqat platformadan tashqarida amalga oshirilgani haqida admin qaydi sifatida yuritiladi. Tafsilotlar `PAYMENT-DECISION.md` da.

## Mahalliy ishga tushirish

Node 24+, PostgreSQL 15+, Redis 7+ va S3 mos MinIO kerak. `npm ci`; `.env.example` faylidan `.env` yarating va xavfsiz qiymatlarni kiriting. `npm run db:migrate` va `node db/bootstrap.js`. Bootstrapdagi TOTP secretni authenticator ilovasiga qo‘shing. So‘ng besh terminalda `npm run dev:api`, `npm run dev:worker`, `npm run dev:bot`, `npm run dev:admin`, `npm run dev:miniapp`. MinIOda bucket yarating. Telegram Mini App ishlashi uchun HTTPS domen/tunnel va bot webhook kerak.

## VPS

`.env` ichida `DATABASE_URL=postgres://mebel48:<POSTGRES_PASSWORD>@postgres:5432/mebel48`, `REDIS_URL=redis://redis:6379`, `S3_ENDPOINT=https://files.mebel48.uz` qiymatlarini qo‘ying; Compose uchun `POSTGRES_PASSWORD` ham kerak. DNS va Let's Encrypt sertifikatlarini API, admin, app va files subdomenlari uchun `deploy/letsencrypt/live/<subdomain>/` ichida oldindan tayyorlang. `docker compose up -d --build`, so‘ng `docker compose exec api npm run db:migrate` va `docker compose exec api node db/bootstrap.js`. Bot webhook manzili: `https://api.mebel48.uz/telegram/webhook`, Telegram `secret_token` qiymati `.env` bilan bir xil bo‘lsin. Landing domeni bu to‘plamga kirmaydi.

## Jarayon

Bot: /start → xona → uslub → byudjet → telefon, viloyat. Redis navbatiga yozilgach bot qabul xabarini qaytaradi. Worker buyurtmani bazaga yozadi. Admin dizayner tayinlaydi. Dizayner foto/o‘lchov va dizayn yuklaydi. Mijoz tasdiqlaydi yoki tahrir so‘raydi. Sexlar tenderga taklif beradi, admin sexni tanlaydi. Sex bosqichma-bosqich media yuklaydi, dizayner tekshiradi, mijoz qabul qiladi. Admin tashqi to‘lovni dalil bilan qayd etadi.

## Hozirgi chegaralar

- Botning tugallanmagan formasi xotirada saqlanadi. Qayta ishga tushsa forma qayta boshlanadi.
- S3 PUT va huquq tekshiriladigan vaqtinchalik GET URL mavjud. Ishlab chiqarishda MinIO uchun brauzer kira oladigan HTTPS endpoint va CORS sozlamasi kerak.
- Avtomatik tender tanlovi, xarita, to‘liq real vaqt, monitoring, backup va CI/CD hali yo‘q. Operator hisobi admin orqali yaratiladi; TOTP secretini operator o‘z authenticator ilovasiga kiritishi kerak.
- Productionga chiqishdan avval haqiqiy Telegram, VPS va fayl saqlash integratsion sinovi zarur. Bu muhitda PostgreSQL, Redis yoki Docker ishga tushirilmagan.
- `001` bazasi allaqachon ishlayotgan bo‘lsa, yangi `payment_records` jadvali migratsiya orqali qo‘shiladi; eski `payments` jadvali ma’lumotlari avtomatik ko‘chirilmaydi. Tirik ma’lumotni saqlash uchun alohida migratsiya kerak.

## 003 tuzatishlari

- `db/bootstrap.js` adminni avval ham yaratardi; endi Redis ulanib qolishi sabab skript chiqmay qolishi ham bartaraf etildi. Dockerfile avval ham API `CMD`ga ega edi.
- Admin paneldagi to‘lov va sozlama kiritish dialoglari validatsiyali formaga o‘tdi. Ma’lumotlar faqat kerakli sahifada yuklanadi.
- Bot formasi Redis’da 30 daqiqa saqlanadi. Mini App Telegram tasdiqlash oynasidan foydalanadi, xatolar yuqorida ko‘rinadi.
- Har bosqichning o‘z muddati `order_steps.step_due_at`da qayd etiladi. Dizayn tahriri soni hisoblanadi; uchinchi va keyingi so‘rovda operatorga xabar yaratiladi. Bu avtomatik jarima undirilishini anglatmaydi.
- Sex taklif qilgan narx mijozga byudjeti bilan birga ko‘rsatiladi. Mijoz tasdiqlamaguncha ishlab chiqarish boshlanmaydi.
- SSL birinchi o‘rnatilishi: domenlar DNSini VPSga yo‘naltiring, 80-portni bo‘shating, `./deploy/setup-ssl.sh admin@example.com` ishga tushiring. So‘ng `docker compose up -d --build`. Sertifikat yangilash uchun `./deploy/renew-ssl.sh`ni cron orqali davriy ishga tushiring. Ushbu skriptlar bu muhitda Docker bo‘lmagani sabab amalda sinovdan o‘tmagan.
- Redis `noeviction` rejimida: xotira to‘lsa navbat ishlari sezilmasdan o‘chmaydi; monitoring va RAM oshirish zarur. Fayl proksisi faqat belgilangan bucket/yo‘l va GET/PUTga cheklangan. Presigned URL egasi amal qilish muddati ichida havoladan foydalana oladi; CORS avtorizatsiya o‘rnini bosa olmaydi.

002 bazasi uchun `npm run db:migrate` yangi ustun va `quote` holatini qo‘shadi. `payment_records` to‘lov provayderisiz tashqi to‘lov qaydi bo‘lib qoladi. Avtomatik tender tanlovi hali ulanmagan va sozlamada tanlab bo‘lmaydi.

## 004 dizayn yangilanishi

Mini Appning mijoz, dizayner va sex panellari mebel katalogi uslubidagi oq/krem fon, to‘q yashil tugmalar va original interyer rasmlari bilan qayta ishlangan. Bosh ekran, xona bo‘yicha ko‘rish, buyurtmalar, batafsil jarayon, vazifa formalari, tenderlar va profil moslashtirilgan. Admin panelda rang va shrift shu uslubga yaqinlashtirildi. Buyurtma va rol APIlari o‘zgarmadi. Savat yoki onlayn checkout qo‘shilmadi: tashqi to‘lov kelishuvi va admin qaydi avvalgidek.

`Mebel48-UI-004.html` alohida interaktiv namuna: telefonda brauzerda oching va Mijoz / Dizayner / Sex tugmalari orqali ekranlarni ko‘ring. Bu namuna xayoliy ma’lumotlardan foydalanadi va haqiqiy buyurtma yubormaydi. Ilova ishlab chiqarish yig‘masida namuna rejimi o‘chirilgan; sinov uchun mahalliy Vite dev serverida `?preview=client`, `?preview=designer`, `?preview=workshop` ochish mumkin. Rasm fayllari `apps/miniapp/public/images/` ichida.
