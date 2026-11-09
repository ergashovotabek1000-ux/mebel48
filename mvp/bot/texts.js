// Barcha bot matnlari — o'zgartirishni osonlashtirish uchun alohida

export const STATUS_LABEL = {
  new:        '🕐 Qabul qilindi',
  visit:      '📐 Dizayner tashrifi',
  design:     '✏️  Dizayn bosqichi',
  production: '🔨 Ishlab chiqarish',
  delivery:   '🚚 Yetkazib berish',
  done:       '✅ Yakunlandi',
};

export const ROOM_TYPES = ['Mehmonxona', 'Yotoqxona', 'Oshxona', 'Boshqa'];
export const STYLES     = ['Modern', 'Klassik', 'Minimal', 'Boshqa'];

export const t = {
  welcome: `*mebel48* — mebel buyurtma xizmati

Sifatli mebel. Aniq muddat. Ishonchli jarayon.

Buyurtma berish uchun tugmani bosing 👇`,

  askPhone: `📞 Telefon raqamingizni yuboring

_Raqamni qo'lda yozing yoki "Raqamni ulashish" tugmasini bosing:_`,

  askRoom: `🏠 Qaysi xona uchun mebel kerak?`,

  askStyle: `🎨 Qaysi uslubda bo'lishini xohlaysiz?`,

  askBudget: `💰 Taxminiy byudjetingiz (so'mda)?

_Masalan: 8000000_`,

  askNotes: `📝 Qo'shimcha izoh (ixtiyoriy)

_Xona o'lchamlari, rang xohishi va boshqa ma'lumotlar._
_Izoh kerak bo'lmasa "O'tkazib yuborish" tugmasini bosing._`,

  orderDone: (id) => `✅ *Buyurtmangiz qabul qilindi!*

📋 Raqam: \`${id.slice(0,8).toUpperCase()}\`

Tez orada operatorimiz siz bilan bog'lanadi va dizayner tashrif vaqtini kelishib oladi.

_Buyurtma holati va 48 soatlik taymerni ilovada kuzating_ 👇`,

  noOrders: `Hozircha buyurtma yo'q.

Yangi buyurtma berish uchun /start`,

  orderStatus: (o) => {
    const lines = [
      `📋 *${o.room_type} — ${STATUS_LABEL[o.status]}*`,
      `🎨 Uslub: ${o.style}`,
      `💰 Byudjet: ${Number(o.budget).toLocaleString('uz-UZ')} so'm`,
      `📅 Sana: ${new Date(o.created_at).toLocaleDateString('uz-UZ')}`,
    ];
    if (o.due_at && o.status !== 'done') {
      const diff = new Date(o.due_at).getTime() - Date.now();
      if (diff > 0) {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        lines.push(`⏱ Qoldi: *${h} soat ${m} daqiqa*`);
      } else {
        lines.push(`⚠️ Muddat o'tdi`);
      }
    }
    return lines.join('\n');
  },

  operatorNotify: (o) => `🆕 *Yangi buyurtma!*

👤 ${o.tg_name}${o.tg_username ? ' (@' + o.tg_username + ')' : ''}
📞 ${o.phone}
🏠 ${o.room_type} — ${o.style}
💰 ${Number(o.budget).toLocaleString('uz-UZ')} so'm
📍 ${o.region}
${o.notes ? '📝 ' + o.notes : ''}

🆔 \`${o.id}\``,

  cancelText: `❌ Bekor qilindi. /start bilan qayta boshlang.`,
};
