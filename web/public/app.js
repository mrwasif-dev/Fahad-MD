let qrInterval, pairInterval, statusInterval;

// ---------- Inject signal glyph brand marks ----------
function injectGlyphs() {
  const tpl = document.getElementById('signal-glyph');
  document.querySelectorAll('.brand-mark').forEach((el) => {
    el.appendChild(tpl.content.cloneNode(true));
  });
}
injectGlyphs();

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch (e) {}
  if (!res.ok && !data.error) data.error = `Request failed (${res.status})`;
  return data;
}

function showToast(message, type = '') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 3000);
}

async function login() {
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn-text');
  if (!password) return;
  btn.textContent = 'Unlocking…';
  const r = await api('/api/login', 'POST', { password });
  btn.textContent = 'Unlock Console';
  if (r.ok) {
    showApp();
  } else {
    document.getElementById('login-error').innerText = r.error || 'Login failed';
  }
}

async function logout() {
  await api('/api/logout', 'POST');
  clearInterval(qrInterval);
  clearInterval(pairInterval);
  clearInterval(statusInterval);
  location.reload();
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  startStatusPolling();
  startQrPolling();
  loadSettings();
  requestAnimationFrame(() => moveNavIndicator(document.querySelector('.nav-btn.active')));
}

// ---------- Nav (with sliding indicator) ----------
function moveNavIndicator(btn) {
  const nav = document.getElementById('main-nav');
  const indicator = document.getElementById('nav-indicator');
  if (!btn || !nav) return;
  const navRect = nav.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  const isMobile = window.innerWidth <= 760;
  if (isMobile) {
    indicator.style.transform = `translateX(${btnRect.left - navRect.left}px)`;
    indicator.style.width = `${btnRect.width}px`;
  } else {
    indicator.style.transform = `translateY(${btn.offsetTop}px)`;
    indicator.style.width = 'auto';
    indicator.style.height = `${btn.offsetHeight}px`;
  }
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((c) => c.classList.add('hidden'));
    btn.classList.add('active');
    const panel = document.getElementById(`tab-${btn.dataset.tab}`);
    panel.classList.remove('hidden');
    panel.querySelector('.card')?.classList.remove('reveal');
    void panel.offsetWidth; // restart animation
    panel.querySelector('.card')?.classList.add('reveal');
    moveNavIndicator(btn);
  });
});

window.addEventListener('resize', () => {
  moveNavIndicator(document.querySelector('.nav-btn.active'));
});

// ---------- Status ----------
function startStatusPolling() {
  const poll = async () => {
    const s = await api('/api/status');
    if (s.error) return;
    const badge = document.getElementById('status-badge');
    const text = document.getElementById('status-text');
    if (s.connected) {
      badge.classList.add('online');
      text.innerText = `Connected — ${s.botNumber || 'active'}`;
      document.getElementById('already-linked').classList.remove('hidden');
    } else {
      badge.classList.remove('online');
      text.innerText = s.lastError ? `Disconnected — ${s.lastError}` : 'Awaiting connection…';
      document.getElementById('already-linked').classList.add('hidden');
    }
  };
  poll();
  statusInterval = setInterval(poll, 4000);
}

// ---------- Link mode switch ----------
function switchLinkMode(mode) {
  document.getElementById('btn-qr-mode').classList.toggle('active', mode === 'qr');
  document.getElementById('btn-pair-mode').classList.toggle('active', mode === 'pair');
  document.getElementById('qr-box').classList.toggle('hidden', mode !== 'qr');
  document.getElementById('pair-box').classList.toggle('hidden', mode !== 'pair');
  document.getElementById('seg-indicator').style.transform = mode === 'pair' ? 'translateX(100%)' : 'translateX(0)';
}

function startQrPolling() {
  const poll = async () => {
    const r = await api('/api/qr');
    const box = document.getElementById('qr-image');
    const existingImg = box.querySelector('img');
    if (r.qr) {
      if (!existingImg || existingImg.src !== r.qr) {
        box.querySelectorAll('img, .spinner').forEach((n) => n.remove());
        const img = document.createElement('img');
        img.src = r.qr;
        img.alt = 'WhatsApp QR code';
        box.appendChild(img);
      }
    } else if (!box.querySelector('.spinner')) {
      box.querySelectorAll('img').forEach((n) => n.remove());
      const sp = document.createElement('div');
      sp.className = 'spinner';
      box.appendChild(sp);
    }
  };
  poll();
  qrInterval = setInterval(poll, 4000);
}

async function requestPair() {
  const phoneInput = document.getElementById('pair-phone');
  const phone = phoneInput.value.replace(/[^0-9]/g, '');
  const errEl = document.getElementById('pair-error');
  const codeBox = document.getElementById('pair-code-box');
  errEl.innerText = '';
  codeBox.classList.add('hidden');

  if (phone.length < 8) {
    errEl.innerText = 'Enter a valid phone number with country code.';
    return;
  }

  const r = await api('/api/pair', 'POST', { phone });
  if (r.error) {
    errEl.innerText = r.error;
    return;
  }

  codeBox.classList.remove('hidden');
  codeBox.innerText = 'Generating code…';
  clearInterval(pairInterval);
  let attempts = 0;
  pairInterval = setInterval(async () => {
    attempts++;
    const res = await api('/api/pair/result');
    if (res.code) {
      codeBox.classList.remove('hidden');
      codeBox.style.animation = 'none';
      void codeBox.offsetWidth;
      codeBox.style.animation = '';
      codeBox.innerText = res.code;
      codeBox.onclick = () => {
        navigator.clipboard?.writeText(res.code);
        showToast('Pairing code copied to clipboard', 'success');
      };
      clearInterval(pairInterval);
    } else if (res.error) {
      errEl.innerText = res.error;
      codeBox.classList.add('hidden');
      clearInterval(pairInterval);
    } else if (attempts > 15) {
      errEl.innerText = 'Timed out waiting for pairing code. Please try again.';
      codeBox.classList.add('hidden');
      clearInterval(pairInterval);
    }
  }, 2000);
}

async function relink() {
  if (!confirm('This will unlink the current WhatsApp session. Continue?')) return;
  const r = await api('/api/relink', 'POST');
  showToast(r.message || r.error || 'Done', r.error ? 'error' : 'success');
}

// ---------- Settings ----------
async function loadSettings() {
  const s = await api('/api/settings');
  if (s.error) return;
  document.getElementById('s-botName').value = s.botName || '';
  document.getElementById('s-prefix').value = s.prefix || '.';
  document.getElementById('s-mode').value = s.mode || 'public';
  document.getElementById('s-owners').value = (s.ownerNumbers || []).join(', ');
  document.getElementById('s-support').value = s.supportNumber || '';
  document.getElementById('s-antidelete').checked = !!s.antidelete;
  document.getElementById('s-antiviewonce').checked = !!s.antiviewonce;
  document.getElementById('s-autostatusview').checked = !!s.autoStatusView;
  document.getElementById('s-autostatusreact').checked = !!s.autoStatusReact;
  document.getElementById('s-welcome').checked = !!s.welcome;

  document.getElementById('f-enabled').checked = !!s.autoforward?.enabled;
  document.getElementById('f-original').checked = !!s.autoforward?.makeOriginal;
  document.getElementById('f-sources').value = (s.autoforward?.sources || []).join(', ');
  document.getElementById('f-targets').value = (s.autoforward?.targets || []).join(', ');
}

async function saveSettings() {
  const payload = {
    botName: document.getElementById('s-botName').value,
    prefix: document.getElementById('s-prefix').value,
    mode: document.getElementById('s-mode').value,
    ownerNumbers: document.getElementById('s-owners').value.split(',').map((x) => x.trim()).filter(Boolean),
    supportNumber: document.getElementById('s-support').value,
    antidelete: document.getElementById('s-antidelete').checked,
    antiviewonce: document.getElementById('s-antiviewonce').checked,
    autoStatusView: document.getElementById('s-autostatusview').checked,
    autoStatusReact: document.getElementById('s-autostatusreact').checked,
    welcome: document.getElementById('s-welcome').checked
  };
  const r = await api('/api/settings', 'POST', payload);
  showToast(r.error ? r.error : 'Settings saved', r.error ? 'error' : 'success');
}

async function saveForward() {
  const payload = {
    autoforward: {
      enabled: document.getElementById('f-enabled').checked,
      makeOriginal: document.getElementById('f-original').checked,
      sources: document.getElementById('f-sources').value.split(',').map((x) => x.trim()).filter(Boolean),
      targets: document.getElementById('f-targets').value.split(',').map((x) => x.trim()).filter(Boolean)
    }
  };
  const r = await api('/api/settings', 'POST', payload);
  showToast(r.error ? r.error : 'Auto-forward settings saved', r.error ? 'error' : 'success');
}

// try auto-login if session cookie already valid
(async () => {
  const r = await api('/api/status');
  if (!r.error) showApp();
})();
