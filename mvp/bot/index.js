import { Bot, InlineKeyboard, Keyboard } from 'grammy';
import { createOrder, getOrders, getOrder, updateStatus, acceptOrder } from './db.js';
import { t, ROOM_TYPES, STYLES, STATUS_LABEL } from './texts.js';

const bot = new Bot(process.env.BOT_TOKEN);
const GROUP_ID = process.env.OPERATOR_GROUP_ID; // -100xxxxxxxxxx

// ── Sessiya (xotirasiz, faqat conversation state) ───────────────────────────
// Oddiy Map — serverda saqlanadi (restart bo'lganda tozalanadi, bu MVP uchun OK)
const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) sessions.set(id, {});
  return sessions.get(id);
}

// ── /start ──────────────────────────────────────────────────────────────────
bot.command('start', async (ctx) => {
  sessions.delete(ctx.from.id); // eski sessiyani tozalash

  const kb = new InlineKeyboard()
    .text('🛋  Buyurtma berish', 'order_start').row()
    .text('📋 Buyurtmalarim', 'my_orders');

  await ctx.replyWithPhoto(
    'https://i.imgur.com/JZbdPBU.jpeg', // placeholder — siz logo URL berish mumkin
    {
      caption: t.welcome,
      parse_mode: 'Markdown',
      reply_markup: kb,
    }
  ).catch(() =>
    // agar rasm yuklanmasa — matn bilan
    ctx.reply(t.welcome, { parse_mode: 'Markdown', reply_markup: kb })
  );
});

// ── Buyurtma berish jarayoni ─────────────────────────────────────────────────
bot.callbackQuery('order_start', async (ctx) => {
  await ctx.answerCallbackQuery();
  sessions.set(ctx.from.id, { step: 'phone' });

  const kb = new Keyboard()
    .requestContact('📱 Raqamni ulashish')
    .resized();

  await ctx.reply(t.askPhone, {
    parse_mode: 'Markdown',
    reply_markup: kb,
  });
});

// ── Xabarlarni qadamba-qadam qayta ishlash ───────────────────────────────────
bot.on('message', async (ctx) => {
  const sess = getSession(ctx.from.id);

  // "Bekor qilish" har qadamda ishlaydi
  if (ctx.message.text === '❌ Bekor qilish') {
    sessions.delete(ctx.from.id);
    await ctx.reply(t.cancelText, { reply_markup: { remove_keyboard: true } });
    return;
  }

  // ── 1. Telefon ────────────────────────────────────────────────────────────
  if (sess.step === 'phone') {
    let phone = ctx.message.contact?.phone_number || ctx.message.text;
    if (!phone || !/[\d]{7,}/.test(phone.replace(/\D/g, ''))) {
      await ctx.reply('⚠️ To\'g\'ri telefon raqam kiriting. Masalan: +998901234567');
      return;
    }
    if (!phone.startsWith('+')) phone = '+' + phone.replace(/\D/g, '');
    sess.phone = phone;
    sess.step = 'room';

    const kb = Keyboard.from(
      ROOM_TYPES.map(r => [Keyboard.text(r)])
    ).add(Keyboard.text('❌ Bekor qilish')).resized();

    await ctx.reply(t.askRoom, { reply_markup: kb });
    return;
  }

  // ── 2. Xona ───────────────────────────────────────────────────────────────
  if (sess.step === 'room') {
    if (!ROOM_TYPES.includes(ctx.message.text)) {
      await ctx.reply('Ro\'yxatdan tanlang 👇');
      return;
    }
    sess.room_type = ctx.message.text;
    sess.step = 'style';

    const kb = Keyboard.from(
      STYLES.map(s => [Keyboard.text(s)])
    ).add(Keyboard.text('❌ Bekor qilish')).resized();

    await ctx.reply(t.askStyle, { reply_markup: kb });
    return;
  }

  // ── 3. Uslub ──────────────────────────────────────────────────────────────
  if (sess.step === 'style') {
    if (!STYLES.includes(ctx.message.text)) {
      await ctx.reply('Ro\'yxatdan tanlang 👇');
      return;
    }
    sess.style = ctx.message.text;
    sess.step = 'budget';

    const kb = new Keyboard()
      .text('❌ Bekor qilish')
      .resized();

    await ctx.reply(t.askBudget, { parse_mode: 'Markdown', reply_markup: kb });
    return;
  }

  // ── 4. Byudjet ────────────────────────────────────────────────────────────
  if (sess.step === 'budget') {
    const raw = ctx.message.text.replace(/\s|,/g, '');
    const budget = parseInt(raw, 10);
    if (!budget || budget < 500000) {
      await ctx.reply('⚠️ Kamida 500 000 so\'m kiriting (raqam bilan).');
      return;
    }
    sess.budget = budget;
    sess.step = 'notes';

    const kb = new Keyboard()
      .text('⏭ O\'tkazib yuborish')
      .text('❌ Bekor qilish')
      .resized();

    await ctx.reply(t.askNotes, { parse_mode: 'Markdown', reply_markup: kb });
    return;
  }

  // ── 5. Izoh ───────────────────────────────────────────────────────────────
  if (sess.step === 'notes') {
    const notes = ctx.message.text === '⏭ O\'tkazib yuborish' ? null : ctx.message.text.slice(0, 400);
    sess.notes = notes;

    // Buyurtmani saqlash
    try {
      const order = await createOrder({
        tg_id:       ctx.from.id,
        tg_name:     [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(' ') || 'Mijoz',
        tg_username: ctx.from.username || null,
        phone:       sess.phone,
        room_type:   sess.room_type,
        style:       sess.style,
        budget:      sess.budget,
        notes:       sess.notes,
      });

      sessions.delete(ctx.from.id);

      // Mini App tugmasi
      const miniappUrl = `${process.env.MINIAPP_URL}?order=${order.id}`;
      const kb = new InlineKeyboard()
        .webApp('📱 Buyurtmani kuzatish', miniappUrl).row()
        .text('📋 Barcha buyurtmalar', 'my_orders');

      await ctx.reply(t.orderDone(order.id), {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true },
      });

      await ctx.reply('Buyurtmangizni kuzatish uchun:', { reply_markup: kb });

      // Operatorga xabar
      if (GROUP_ID) {
        const statusKb = new InlineKeyboard()
          .text('✅ Dizayner boradi', `op_visit_${order.id}`).row()
          .text('❌ Rad etish', `op_reject_${order.id}`);

        await bot.api.sendMessage(GROUP_ID, t.operatorNotify(order), {
          parse_mode: 'Markdown',
          reply_markup: statusKb,
        });
      }
    } catch (e) {
      console.error('createOrder error:', e);
      await ctx.reply('⚠️ Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.\n/start');
    }
    return;
  }

  // Boshqa xabarlar — buyurtmalar tugmasi ko'rsat
  const kb = new InlineKeyboard()
    .text('🛋  Buyurtma berish', 'order_start').row()
    .text('📋 Buyurtmalarim', 'my_orders');

  await ctx.reply(t.welcome, { parse_mode: 'Markdown', reply_markup: kb });
});

// ── Buyurtmalarim ────────────────────────────────────────────────────────────
bot.callbackQuery('my_orders', async (ctx) => {
  await ctx.answerCallbackQuery();
  const orders = await getOrders(ctx.from.id);

  if (!orders.length) {
    await ctx.reply(t.noOrders);
    return;
  }

  for (const o of orders.slice(0, 5)) {
    const isDelivery = o.status === 'delivery';
    const isDone     = o.status === 'done';

    const kb = new InlineKeyboard();

    // Mini App tugmasi
    if (process.env.MINIAPP_URL) {
      kb.webApp('📱 Batafsil', `${process.env.MINIAPP_URL}?order=${o.id}`).row();
    }

    // Qabul qildim — faqat yetkazib berish bosqichida
    if (isDelivery) {
      kb.text('✅ Qabul qildim', `accept_${o.id}`).row();
    }

    if (!isDone) {
      kb.text('🔄 Yangilash', `refresh_${o.id}`);
    }

    await ctx.reply(t.orderStatus(o), {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
  }
});

// ── Buyurtmani yangilash ──────────────────────────────────────────────────────
bot.callbackQuery(/^refresh_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery('Yangilanmoqda...');
  const id = ctx.match[1];
  try {
    const o = await getOrder(id);
    if (!o || o.tg_id !== ctx.from.id) return;

    const isDelivery = o.status === 'delivery';
    const isDone     = o.status === 'done';

    const kb = new InlineKeyboard();
    if (process.env.MINIAPP_URL) {
      kb.webApp('📱 Batafsil', `${process.env.MINIAPP_URL}?order=${o.id}`).row();
    }
    if (isDelivery) kb.text('✅ Qabul qildim', `accept_${o.id}`).row();
    if (!isDone)    kb.text('🔄 Yangilash', `refresh_${o.id}`);

    await ctx.editMessageText(t.orderStatus(o), {
      parse_mode: 'Markdown',
      reply_markup: kb,
    });
  } catch (e) {
    await ctx.answerCallbackQuery('Xatolik');
  }
});

// ── Qabul qildim ─────────────────────────────────────────────────────────────
bot.callbackQuery(/^accept_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  try {
    const o = await acceptOrder(id, ctx.from.id);
    if (!o) {
      await ctx.answerCallbackQuery('⚠️ Qabul qilib bo\'lmadi', { show_alert: true });
      return;
    }
    await ctx.editMessageText(
      `✅ *Buyurtma qabul qilindi!*\n\nRahmat! Buyurtmangiz muvaffaqiyatli yakunlandi.`,
      { parse_mode: 'Markdown' }
    );
    // Operatorga ham xabar
    if (GROUP_ID) {
      await bot.api.sendMessage(GROUP_ID, `✅ Mijoz buyurtmani qabul qildi!\n🆔 \`${id}\``, {
        parse_mode: 'Markdown',
      });
    }
  } catch (e) {
    console.error('accept error:', e);
    await ctx.answerCallbackQuery('Xatolik', { show_alert: true });
  }
});

// ── Operator buyruqlari (guruhdan) ────────────────────────────────────────────
bot.callbackQuery(/^op_visit_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  try {
    // Dizayner 48 soat ichida tashrif buyuradi — taymer hali boshlanmaydi
    const o = await updateStatus(id, 'visit');
    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard()
        .text('⏱ 48s taymer boshlash', `op_timer_${id}`).row()
        .text('✅ Tayyor (yetkazish)', `op_delivery_${id}`)
    });
    await ctx.reply(`✅ ${o.room_type} buyurtmasi — dizayner tashrifi belgilandi.`);
    // Mijozga xabar
    await bot.api.sendMessage(o.tg_id,
      `📐 *Dizayner tashrifi belgilandi!*\n\nTez orada mutaxassisimiz siz bilan bog\'lanadi.`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    console.error(e);
    await ctx.answerCallbackQuery('Xatolik', { show_alert: true });
  }
});

bot.callbackQuery(/^op_timer_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  try {
    // 48 soatlik taymer shu paytda boshlanadi
    const dueAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const o = await updateStatus(id, 'production', dueAt);
    await ctx.editMessageReplyMarkup({
      reply_markup: new InlineKeyboard()
        .text('✅ Tayyor (yetkazish)', `op_delivery_${id}`)
    });
    await ctx.reply(`⏱ Taymer boshlandi! 48 soat — ${new Date(dueAt).toLocaleString('uz-UZ')}`);
    // Mijozga xabar
    await bot.api.sendMessage(o.tg_id,
      `🔨 *Ishlab chiqarish boshlandi!*\n\n⏱ 48 soat ichida tayyor bo\'ladi.\n\n_Jarayonni ilovada kuzating_ 👇`,
      {
        parse_mode: 'Markdown',
        reply_markup: process.env.MINIAPP_URL
          ? new InlineKeyboard().webApp('📱 Taymerni ko\'rish', `${process.env.MINIAPP_URL}?order=${id}`)
          : undefined,
      }
    );
  } catch (e) {
    console.error(e);
  }
});

bot.callbackQuery(/^op_delivery_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  try {
    const o = await updateStatus(id, 'delivery');
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    await ctx.reply(`🚚 Yetkazib berish bosqichi belgilandi.`);
    // Mijozga xabar
    await bot.api.sendMessage(o.tg_id,
      `🚚 *Mebelingiz yetkazilmoqda!*\n\nQabul qilgach, ilovada "Qabul qildim" tugmasini bosing.`,
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard()
          .text('✅ Qabul qildim', `accept_${id}`),
      }
    );
  } catch (e) {
    console.error(e);
  }
});

bot.callbackQuery(/^op_reject_(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const id = ctx.match[1];
  await updateStatus(id, 'done'); // yopamiz
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  await ctx.reply(`❌ Buyurtma rad etildi.`);
});

// ── Ishga tushirish ──────────────────────────────────────────────────────────
const WEBHOOK_PATH = '/webhook';
const PORT = Number(process.env.PORT || 3000);

if (process.env.WEBHOOK_URL) {
  // Production — webhook
  const { Fastify } = await import('fastify');
  const app = Fastify({ logger: false });

  await bot.api.setWebhook(`${process.env.WEBHOOK_URL}${WEBHOOK_PATH}`, {
    secret_token: process.env.WEBHOOK_SECRET || undefined,
  });

  app.post(WEBHOOK_PATH, async (req, reply) => {
    await bot.handleUpdate(req.body);
    return reply.code(200).send('ok');
  });

  app.get('/health', () => ({ ok: true, service: 'mebel48-mvp' }));
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`mebel48 bot webhook: port ${PORT}`);
} else {
  // Local — polling
  console.log('mebel48 bot polling...');
  bot.start();
}
