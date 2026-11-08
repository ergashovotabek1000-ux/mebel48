# Kod tahliliga javob · Mebel48-003

## Tuzatildi

- Admin bootstrap Redis ulanishini ochmasligi uchun mustaqil PostgreSQL Pool ishlatadi. Oldingi bootstrap admin hisobini yaratar edi, ammo import sabab jarayon tugamay qolishi mumkin edi.
- Admin to‘lov/sozlama `prompt()` dialoglari validatsiyali modal formaga almashtirildi. Admin faqat ochilgan sahifaning ma’lumotini yuklaydi. Operator yaratishda email/parol/TOTP kiritiladi.
- Bot sessiyasi Redis'da 30 daqiqa saqlanadi; muddati o‘tsa aniq xabar beradi.
- Har bosqich muddati alohida qayd etiladi. Uch va undan ortiq dizayn tahririga admin/operator bildirishnomasi yaratiladi.
- Tender narxi mijozga byudjeti bilan ko‘rsatiladi; tasdiqdan oldin ishlab chiqarish boshlanmaydi.
- Telegram tasdiqlash dialogi, ko‘rinadigan xato xabari va Mini Appdagi matn/reyting/tender formalari qo‘shildi.
- SSL birinchi olish va yangilash skriptlari, Redis `noeviction`, MinIO yo‘l/metod cheklovlari qo‘shildi.

## Tahlildagi ikki noto‘g‘ri da’vo

- `db/bootstrap.js` avval ham admin yaratgan; hozirgi tuzatish undagi ortiqcha Redis ulanishini olib tashladi.
- `Dockerfile` avval ham `CMD ["node","apps/api/src/server.js"]`ga ega edi.

`prompt()` o‘zi XSS manbai emas; to‘lovda noto‘g‘ri qiymat kiritish va Telegram oynalari bilan moslik muammolari uchun formalar tanlandi. CORS kirishni taqiqlovchi mexanizm emas: presigned URL vaqtinchalik bearer huquqidir. Bucket xususiy saqlanadi, havola 5 daqiqalik va proksi yo‘li cheklangan.

## Hali kerak

PostgreSQL/Redis/MinIO bilan integratsion sinov, haqiqiy Telegram webhook, sertifikat skriptini VPSda sinash, avtomatik tender tanlash va ilovadagi rollar komponentlarini ajratish. Jarima to‘lovdan avtomatik ushlanmaydi; escrow va provayder foydalanuvchi qaroriga binoan kiritilmagan.
