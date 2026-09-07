import {
  PAPER_FIXTURES,
  PAPER_RECOVERY,
  afterTouch,
  defaultFocusId,
  emptyHudState,
  fireOutcome,
  inRingNow,
  isParkedRetouch,
  isServedThisRound,
  magazineView,
  mergeNextContactAt,
  reopenForRound,
  rowId,
} from '/src/contact-queue.js';
import { renderMagazineHud } from '/src/magazine-hud.js';

const MAGASIN = window.MAGASIN || 'daniel';
const JSON_URL = window.JSON_URL || './magasin.json';
const STORE_KEY = 'magasin-hud:' + MAGASIN;
const MAIL_TPL = 'Hej,\n\nHör av dig när det passar.\n';

const hudMount = document.getElementById('magasin-hud');
const listEl = document.getElementById('list');
const flashEl = document.getElementById('flash');
const reloadBtn = document.getElementById('reload');
const filterQueueBtn = document.getElementById('filter-queue');
const filterRecoveryBtn = document.getElementById('filter-recovery');

let rows = [];
let state = emptyHudState();
let overlay = {};
let filter = new URLSearchParams(location.search).get('recovery') === '1' ? 'recovery' : 'queue';

function paperMode() {
  return new URLSearchParams(location.search).get('paper') === '1';
}

function loadStore() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.state) state = { ...emptyHudState(), ...data.state };
    if (data.overlay && typeof data.overlay === 'object') overlay = data.overlay;
  } catch {
    /* tom session */
  }
}

function saveStore() {
  const nextOverlay = { ...overlay };
  for (const row of rows) {
    const id = rowId(row);
    if (!id) continue;
    nextOverlay[id] = {
      nextContactAt: row.nextContactAt || '',
      servedAt: row.servedAt || '',
      servedThisRound: Boolean(row.servedThisRound),
      reopenRound: Boolean(row.reopenRound),
    };
  }
  overlay = nextOverlay;
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ state, overlay }));
  } catch {
    /* ignore */
  }
}

function flash(msg) {
  if (flashEl) flashEl.textContent = msg || '';
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function focusedRow(now) {
  const id = defaultFocusId(state, rows, now, filter);
  return rows.find((r) => rowId(r) === id) || null;
}

function syncFilterButtons() {
  if (filterQueueBtn) filterQueueBtn.classList.toggle('on', filter === 'queue');
  if (filterRecoveryBtn) filterRecoveryBtn.classList.toggle('on', filter === 'recovery');
}

function renderWorkCard(row, now) {
  if (!row) {
    return '<div class="empty">väntar kö</div>';
  }
  const waiting = inRingNow(row);
  const tel = String(row.telefon || '').trim();
  const existing = String(row.card_comment || '').trim();
  const lucka = String(row.lucka || '').trim();
  const lane = isParkedRetouch(row) ? 'recovery' : waiting ? 'väntar' : 'utfall';
  return `<article class="row${/north/i.test(String(row.brand || '')) ? ' north' : ''}" data-id="${escapeHtml(rowId(row))}">
    <div class="when">${escapeHtml(lucka || lane)}</div>
    <div class="body">
      <div class="mainline">
        <div class="who-tel">
          <div class="who"><strong>${escapeHtml(row.namn || 'saknas')}</strong>
            <span>${escapeHtml(row.brand || 'saknas')} · ${escapeHtml(lane)}</span></div>
          <div class="tel">
            ${tel ? `<code>${escapeHtml(tel)}</code><button type="button" data-copy-tel="${escapeHtml(rowId(row))}">Kopiera nr</button>` : '<span>saknar telefon</span>'}
            <button type="button" data-copy-tpl="${escapeHtml(rowId(row))}">Kopiera mall</button>
            ${isServedThisRound(row) ? `<button type="button" data-reopen="${escapeHtml(rowId(row))}">Öppna tur igen</button>` : ''}
          </div>
        </div>
        <form class="note" data-save="${escapeHtml(rowId(row))}">
          ${existing ? `<p class="existing">${escapeHtml(existing)}</p>` : ''}
          <input name="text" type="text" maxlength="240" placeholder="utfall / anteckning" autocomplete="off" />
          <input name="dag" type="date" />
          <input name="tid" type="time" />
          <button type="submit" data-park="">Spara utfall</button>
          <button type="submit" data-park="NA">NA</button>
          <button type="submit" data-park="VM">VM</button>
        </form>
      </div>
    </div>
  </article>`;
}

function paint() {
  const now = Date.now();
  const view = magazineView(rows, state, now, MAGASIN, filter);
  syncFilterButtons();
  if (hudMount) hudMount.innerHTML = renderMagazineHud(view);
  if (listEl) listEl.innerHTML = renderWorkCard(focusedRow(now), now);
}

async function touchServer(id, reason) {
  if (paperMode()) return;
  try {
    await fetch('/api/touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ magasin: MAGASIN, id, reason }),
    });
  } catch {
    /* lokal cooldown räcker */
  }
}

async function saveServer(id, payload) {
  if (paperMode()) return { ok: true };
  const res = await fetch('/api/kommentar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ magasin: MAGASIN, id, ...payload }),
  });
  return res.json();
}

function onCopy(id, kind) {
  const now = Date.now();
  afterTouch(state, rows, id, now, 'copy');
  saveStore();
  touchServer(id, 'copy');
  const text = kind === 'tel'
    ? String((rows.find((r) => rowId(r) === id) || {}).telefon || '')
    : MAIL_TPL;
  if (text && navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  flash(kind === 'tel' ? 'nummer kopierat' : 'mall kopierad');
  paint();
}

function onMark(id) {
  const now = Date.now();
  afterTouch(state, rows, id, now, 'mark');
  saveStore();
  touchServer(id, 'mark');
  paint();
}

async function onOutcome(id, payload) {
  const now = Date.now();
  const park = payload.park || (payload.tid ? 'BOOK' : 'saved');
  fireOutcome(state, rows, id, now, park);
  saveStore();
  try {
    const res = await saveServer(id, payload);
    if (res && res.ok === false) flash(res.fel || 'saknar utfall');
    else flash('utfall sparat · patron ur');
  } catch {
    flash('utfall lokalt · server saknas');
  }
  if (!paperMode()) await loadRows();
  else {
    saveStore();
    paint();
  }
}

async function loadRows() {
  loadStore();
  if (paperMode()) {
    rows = [PAPER_RECOVERY, ...PAPER_FIXTURES].map((r) => ({ ...r }));
    mergeNextContactAt(rows, overlay);
    paint();
    return;
  }
  try {
    const res = await fetch(JSON_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('saknar kö');
    const data = await res.json();
    rows = Array.isArray(data.rows) ? data.rows.filter((r) => r && typeof r === 'object') : [];
  } catch {
    rows = [];
    flash('väntar kö');
  }
  mergeNextContactAt(rows, overlay);
  paint();
}

document.addEventListener('click', (ev) => {
  const mark = ev.target.closest('[data-mark]');
  if (mark) {
    ev.preventDefault();
    onMark(mark.getAttribute('data-mark'));
    return;
  }
  const copyTpl = ev.target.closest('[data-copy-tpl]');
  if (copyTpl) {
    ev.preventDefault();
    onCopy(copyTpl.getAttribute('data-copy-tpl'), 'tpl');
    return;
  }
  const copyTel = ev.target.closest('[data-copy-tel]');
  if (copyTel) {
    ev.preventDefault();
    onCopy(copyTel.getAttribute('data-copy-tel'), 'tel');
    return;
  }
  const reopen = ev.target.closest('[data-reopen]');
  if (reopen) {
    ev.preventDefault();
    const id = reopen.getAttribute('data-reopen');
    const row = rows.find((r) => rowId(r) === id);
    if (row) reopenForRound(row);
    saveStore();
    touchServer(id, 'reopen');
    flash('tur öppnad igen');
    paint();
  }
});

document.addEventListener('submit', (ev) => {
  const form = ev.target.closest('form[data-save]');
  if (!form) return;
  ev.preventDefault();
  const id = form.getAttribute('data-save');
  const parkBtn = ev.submitter && ev.submitter.getAttribute
    ? ev.submitter.getAttribute('data-park')
    : '';
  const fd = new FormData(form);
  const text = String(fd.get('text') || '').trim();
  const tid = String(fd.get('tid') || '').trim();
  if (!text && !parkBtn && !tid) {
    flash('saknar utfall');
    return;
  }
  onOutcome(id, {
    text,
    dag: String(fd.get('dag') || ''),
    tid,
    park: parkBtn || null,
    outcome: true,
  });
});

if (reloadBtn) {
  reloadBtn.addEventListener('click', () => {
    loadRows();
  });
}

if (filterQueueBtn) {
  filterQueueBtn.addEventListener('click', () => {
    filter = 'queue';
    paint();
  });
}

if (filterRecoveryBtn) {
  filterRecoveryBtn.addEventListener('click', () => {
    filter = 'recovery';
    paint();
  });
}

loadRows();
