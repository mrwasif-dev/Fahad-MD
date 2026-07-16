let qrInterval, pairInterval, statusInterval;

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return res.json();
}

async function login() {
  const password = document.getElementById('password').value;
  const r = await api('/api/login', 'POST', { password });
  if (r.ok) {
    showApp();
  } else {
    document.getElementById('login-error').innerText = r.error || 'Login failed';
  }
}

async function logout() {
  await api('/api/logout', 'POST');
  location.reload();
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  startStatusPolling();
  startQrPolling();
  loadSettings();
}

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c) => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

// ---------- Status ----------
function startStatusPolling() {
  const poll = async () => {
    const s = await api('/api/status');
    const badge = document.getElementById('status-badge');
    if (s.connected) {
      badge.innerText = `● Connected (${s.botNumber})`;
      badge.classList.add('online');
    } else {
      badge.innerText = '● Not connected';
      badge.classList.remove('online');
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
}

function startQrPolling() {
  const poll = async () => {
    const r = await api('/api/qr');
    const box = document.getElementById('qr-image');
    box.innerHTML = r.qr ? `<img src="${r.qr}" />` : '<p class="hint">Waiting for QR... (already linked or connecting)</p>';
  };
  poll();
  qrInterval = setInterval(poll, 4000);
}

async function requestPair() {
  const phone = document.getElementById('pair-phone').value.trim();
  if (!phone) return alert('Enter your phone number first');
  await api('/api/pair', 'POST', { phone });
  document.getElementById('pair-code-box').innerText = 'Requesting code...';
  clearInterval(pairInterval);
  pairInterval = setInterval(async () => {
    const r = await api('/api/pair/result');
    if (r.code) {
      document.getElementById('pair-code-box').innerText = r.code;
      clearInterval(pairInterval);
    }
  }, 2000);
}

async function relink() {
  if (!confirm('This will unlink the current WhatsApp session. Continue?')) return;
  const r = await api('/api/relink', 'POST');
  alert(r.message || 'Done');
}

// ---------- Settings ----------
async function loadSettings() {
  const s = await api('/api/settings');
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
  await api('/api/settings', 'POST', payload);
  document.getElementById('settings-msg').innerText = '✅ Saved!';
  setTimeout(() => (document.getElementById('settings-msg').innerText = ''), 2000);
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
  await api('/api/settings', 'POST', payload);
  document.getElementById('forward-msg').innerText = '✅ Saved!';
  setTimeout(() => (document.getElementById('forward-msg').innerText = ''), 2000);
}

// try auto-login if cookie already valid
(async () => {
  const r = await api('/api/status');
  if (!r.error) showApp();
})();
