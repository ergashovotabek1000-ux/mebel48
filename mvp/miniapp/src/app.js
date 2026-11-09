// mebel48 Mini App — mijoz tomoni
// Vanilla JS, Telegram WebApp SDK, Supabase REST

const tg = window.Telegram?.WebApp;
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Supabase fetch helper ────────────────────────────────────────────────────
async function sbFetch(path, opts = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  new:        { label: 'Qabul qilindi',      emoji: '🕐', badgeClass: 'badge--new',        step: 0 },
  visit:      { label: 'Dizayner tashrifi',   emoji: '📐', badgeClass: 'badge--visit',       step: 1 },
  design:     { label: 'Dizayn bosqichi',     emoji: '✏️', badgeClass: 'badge--design',      step: 2 },
  production: { label: 'Ishlab chiqarish',    emoji: '🔨', badgeClass: 'badge--production',  step: 3 },
  delivery:   { label: 'Yetkazib berish',     emoji: '🚚', badgeClass: 'badge--delivery',    step: 4 },
  done:       { label: 'Yakunlandi',          emoji: '✅', badgeClass: 'badge--done',         step: 5 },
};

const STEPS = ['Yangi', 'Dizayner', 'Dizayn', 'Ishlab chiqarish', 'Yetkazish', 'Tayyor'];

// ── State ─────────────────────────────────────────────────────────────────────
let orderId   = null;
let order     = null;
let timerInterval = null;

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  tg?.expand();
  tg?.setHeaderColor('#FAFAF9');

  // Dark theme sync
  if (tg?.colorScheme === 'dark') document.body.classList.add('tg-dark');
  tg?.onEvent('themeChanged', () => {
    document.body.classList.toggle('tg-dark', tg.colorScheme === 'dark');
  });

  // Order ID URLdan
  const params = new URLSearchParams(location.search);
  orderId = params.get('order');

  if (orderId) {
    renderLoading();
    loadOrder();
  } else {
    renderEmpty('Buyurtma topilmadi', 'Bot orqali buyurtma bering va bu sahifaga qaytib keling.');
  }
});

// ── Load order ─────────────────────────────────────────────────────────────────
async function loadOrder() {
  try {
    const rows = await sbFetch(`orders?id=eq.${orderId}&select=*`);
    if (!rows || !rows.length) {
      renderEmpty('Buyurtma topilmadi', "Buyurtma raqami noto'g'ri yoki o'chirilgan.");
      return;
    }
    order = rows[0];
    render();
  } catch (e) {
    renderError('Yuklanmadi. Internet aloqasini tekshiring.');
    console.error(e);
  }
}

// ── Render functions ──────────────────────────────────────────────────────────
function renderLoading() {
  document.getElementById('app').innerHTML = `
    <div class="loading">
      <div class="spinner"></div>
      <span>Yuklanmoqda…</span>
    </div>`;
}

function renderEmpty(title, text) {
  document.getElementById('app').innerHTML = `
    <div class="header">
      ${wordmarkHTML()}
    </div>
    <div class="main">
      <div class="empty">
        <div class="empty__icon">📦</div>
        <div class="empty__title">${title}</div>
        <div class="empty__text">${text}</div>
      </div>
    </div>`;
}

function renderError(msg) {
  document.getElementById('app').innerHTML = `
    <div class="header">
      ${wordmarkHTML()}
    </div>
    <div class="main">
      <div class="notify notify--warn">
        ⚠️ ${msg}
      </div>
      <button class="btn btn--outline mt-16" onclick="loadOrder()">🔄 Qayta yuklash</button>
    </div>`;
}

function render() {
  if (!order) return;
  clearInterval(timerInterval);

  const st  = STATUS[order.status] || STATUS.new;
  const isDone     = order.status === 'done';
  const isDelivery = order.status === 'delivery';
  const hasTimer   = !!order.due_at && order.status === 'production';

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="header">
      ${wordmarkHTML()}
      <button class="header__back" onclick="refresh()" title="Yangilash">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
      </button>
    </div>

    <div class="main">
      ${isDone ? doneScreenHTML() : `
        <!-- Status card -->
        <div class="card">
          <div class="card__label">Buyurtma holati</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div class="card__title">${order.room_type} · ${order.style}</div>
            <span class="badge ${st.badgeClass}">${st.emoji} ${st.label}</span>
          </div>
          <div class="card__meta">
            <div class="card__meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              ${formatDate(order.created_at)}
            </div>
            <div class="card__meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              ${Number(order.budget).toLocaleString('uz-UZ')} so'm
            </div>
          </div>
        </div>

        <!-- Progress steps -->
        ${stepsHTML(st.step)}

        ${hasTimer ? timerCardHTML() : ''}

        ${isDelivery ? deliveryCardHTML() : ''}

        ${order.notes ? `
        <div class="card mt-8">
          <div class="card__label">Izohingiz</div>
          <div class="text-sm text-muted mt-4">${escHtml(order.notes)}</div>
        </div>` : ''}

        <!-- Order details -->
        <div class="card mt-8">
          <div class="card__label">Buyurtma tafsilotlari</div>
          <div class="info-row">
            <span class="info-row__label">Xona</span>
            <span class="info-row__value">${order.room_type}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Uslub</span>
            <span class="info-row__value">${order.style}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Byudjet</span>
            <span class="info-row__value">${Number(order.budget).toLocaleString('uz-UZ')} so'm</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Buyurtma ID</span>
            <span class="info-row__value text-xs text-muted">${order.id.slice(0,8).toUpperCase()}</span>
          </div>
        </div>
      `}
    </div>

    ${isDelivery ? `
    <div class="accept-cta">
      <button class="btn btn--accent btn--lg" onclick="acceptOrder()">
        ✅ Mebelni qabul qildim
      </button>
    </div>` : ''}
  `;

  // Start countdown if timer active
  if (hasTimer && !isDone) {
    startCountdown();
  }
}

// ── HTML helpers ──────────────────────────────────────────────────────────────
function wordmarkHTML() {
  return `
    <div class="wordmark">
      <svg class="wordmark__icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="#18181B"/>
        <path d="M16 7L7 13.5V25h18V13.5L16 7Z" fill="none" stroke="#C8A96E" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M12 25v-7h8v7" fill="none" stroke="#C8A96E" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
      <span class="wordmark__text">mebel48</span>
    </div>`;
}

function stepsHTML(activeStep) {
  return `
    <div class="steps">
      ${STEPS.map((s, i) => {
        const cls = i < activeStep ? 'step--done' : i === activeStep ? 'step--active' : '';
        const icon = i < activeStep ? '✓' : i + 1;
        return `
          <div class="step ${cls}">
            <div class="step__dot">${icon}</div>
            <div class="step__label">${s}</div>
          </div>`;
      }).join('')}
    </div>`;
}

function timerCardHTML() {
  return `
    <div class="timer" id="timer-card">
      <div class="timer__label">⏱ Tayyor bo'lishiga qoldi</div>
      <div class="timer__digits" id="timer-digits">
        <div class="timer__unit">
          <span class="timer__num" id="t-h">--</span>
          <span class="timer__unit-label">soat</span>
        </div>
        <div class="timer__sep">:</div>
        <div class="timer__unit">
          <span class="timer__num" id="t-m">--</span>
          <span class="timer__unit-label">daqiqa</span>
        </div>
        <div class="timer__sep">:</div>
        <div class="timer__unit">
          <span class="timer__num" id="t-s">--</span>
          <span class="timer__unit-label">soniya</span>
        </div>
      </div>
      <div class="timer__note" id="timer-note">Ishlab chiqarish jarayoni davom etmoqda</div>
    </div>`;
}

function deliveryCardHTML() {
  return `
    <div class="notify notify--info">
      🚚 Mebelingiz yetkazib berilmoqda! Qabul qilgach, pastdagi tugmani bosing.
    </div>`;
}

function doneScreenHTML() {
  return `
    <div class="done-screen">
      <div class="done-screen__icon">🎉</div>
      <div class="done-screen__title">Tabriklaymiz!</div>
      <div class="done-screen__text">
        Buyurtmangiz muvaffaqiyatli yakunlandi.<br>
        Xizmatimizdan foydalanganingiz uchun rahmat.
      </div>
      <div class="mt-24">
        <div class="card">
          <div class="info-row">
            <span class="info-row__label">Xona</span>
            <span class="info-row__value">${order.room_type}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Uslub</span>
            <span class="info-row__value">${order.style}</span>
          </div>
          <div class="info-row">
            <span class="info-row__label">Buyurtma</span>
            <span class="info-row__value text-xs text-muted">${order.id.slice(0,8).toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>`;
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function startCountdown() {
  function tick() {
    const diff = new Date(order.due_at).getTime() - Date.now();
    const hEl  = document.getElementById('t-h');
    const mEl  = document.getElementById('t-m');
    const sEl  = document.getElementById('t-s');
    const card = document.getElementById('timer-card');
    const note = document.getElementById('timer-note');

    if (!hEl) { clearInterval(timerInterval); return; }

    if (diff <= 0) {
      hEl.textContent = '00';
      mEl.textContent = '00';
      sEl.textContent = '00';
      card?.classList.remove('timer--urgent');
      if (note) {
        note.textContent = '';
        note.innerHTML = '<span class="timer__expired-note">⚠️ Muddat tugadi — operator bilan bog\'laning</span>';
      }
      clearInterval(timerInterval);
      return;
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    hEl.textContent = String(h).padStart(2, '0');
    mEl.textContent = String(m).padStart(2, '0');
    sEl.textContent = String(s).padStart(2, '0');

    // Urgent: last 2 hours
    if (diff < 2 * 3600000) {
      card?.classList.add('timer--urgent');
    }
  }

  tick();
  timerInterval = setInterval(tick, 1000);
}

// ── Actions ───────────────────────────────────────────────────────────────────
async function acceptOrder() {
  const confirmed = await showConfirm('Mebelni qabul qildingizmi? Bu amaliyot qaytarib bo\'lmaydi.');
  if (!confirmed) return;

  try {
    await sbFetch(`orders?id=eq.${orderId}`, {
      method: 'PATCH',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({ status: 'done' }),
    });

    // Supabase row-level security: only delivery status can be accepted
    // Bot webhook will also validate on its side

    tg?.HapticFeedback?.notificationOccurred?.('success');
    await loadOrder();
  } catch (e) {
    console.error(e);
    showAlert('Xatolik yuz berdi. Iltimos qayta urinib ko\'ring.');
  }
}

async function refresh() {
  renderLoading();
  await loadOrder();
}

// ── Telegram helpers ──────────────────────────────────────────────────────────
function showConfirm(msg) {
  return new Promise(resolve => {
    if (tg?.showConfirm) {
      tg.showConfirm(msg, resolve);
    } else {
      resolve(window.confirm(msg));
    }
  });
}

function showAlert(msg) {
  if (tg?.showAlert) tg.showAlert(msg);
  else alert(msg);
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('uz-UZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Global scope (called from onclick)
window.acceptOrder = acceptOrder;
window.refresh     = refresh;
window.loadOrder   = loadOrder;
