import { escapeHtml } from './format.js';
import { renderMagazineHud } from './magazine-hud.js';
import {
  KS_ASSISTANT,
  KS_NOTE,
  KS_PAPER,
  KS_REF_SHORTCUTS,
  KS_SLOGANS,
  KS_SL_TP,
  ksUrl,
} from './ks-ref.js';
import {
  CLUSTER_SHORTCUTS,
  LIVE_LAMP_ON,
  LOCAL_SHORTCUTS,
  PARK_ACTIONS,
  ROBBAN_CHECKLIST,
  chipLinks,
  forcexShortcut,
  toolboxBrand,
} from './verktygslada.js';

function lamp(kind, label) {
  return `<span class="crystal-lamp crystal-lamp-${escapeHtml(kind)}" title="${escapeHtml(label)}" aria-hidden="true"></span>`;
}

function chipAnchor(chip, extraClass = '') {
  if (!chip) return '';
  const extra = extraClass ? ` ${extraClass}` : '';
  const extraData =
    chip.utkast && chip.terms
      ? ` data-utkast="${escapeHtml(chip.utkast)}" data-terms="${escapeHtml(chip.terms)}"`
      : '';
  return `<a class="crystal-chip${extra}" data-chip="${escapeHtml(chip.id)}" href="${escapeHtml(chip.href)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(chip.title || chip.label)}"${extraData}>${escapeHtml(chip.label)}</a>`;
}

function statusTile(opts) {
  return `<article class="crystal-tile" data-tile="${escapeHtml(opts.id)}">
    <p class="crystal-tile-kicker">${lamp(opts.lamp, opts.label)}${escapeHtml(opts.kicker)}</p>
    <p class="crystal-tile-value">${escapeHtml(opts.value)}</p>
    <p class="crystal-tile-note">${escapeHtml(opts.note)}</p>
  </article>`;
}

function signalChip(chip) {
  const pulse = chip.pulse ? ' is-pulse' : '';
  return `<span class="crystal-signal${pulse}" data-signal="${escapeHtml(chip.id)}">
    <span class="crystal-signal-kicker">${escapeHtml(chip.label)}</span>
    <span class="crystal-signal-text">${escapeHtml(chip.text)}</span>
  </span>`;
}

function parkButtons(pulseKind) {
  return PARK_ACTIONS.map((p) => {
    const on = pulseKind === p.kind ? ' is-pulse' : '';
    return `<button type="button" class="crystal-park${on}" data-action="crystal-park" data-park="${escapeHtml(p.kind)}" title="${escapeHtml(p.label)}">${escapeHtml(p.label)}</button>`;
  }).join('');
}

function renderOnline(online) {
  const rows = Array.isArray(online && online.customers) ? online.customers : [];
  if (!rows.length) {
    return `<p class="crystal-empty">saknas</p>
      <p class="crystal-stub">Ingen onlinesignal i boken. Poll: <code>/api/onlinekunder</code></p>`;
  }
  return `<ul class="crystal-online-list">${rows
    .map(
      (c) =>
        `<li data-online-id="${escapeHtml(c.id)}"><span>${escapeHtml(c.namn)}</span><span class="crystal-faint">${escapeHtml(c.id)}</span></li>`,
    )
    .join('')}</ul>`;
}

function renderKampanjDrawer(campaign) {
  const list = (campaign && campaign.campaigns) || [];
  if (!list.length) {
    return `<p class="crystal-empty">saknas</p>`;
  }
  return list
    .map((c) => {
      const status = String(c.status || 'saknas').toUpperCase();
      const tone = status === 'SENT' ? 'sent' : status === 'READY' ? 'ready' : 'block';
      const bits = [];
      if (c.sentBatches && c.sentBatches !== 'saknas') bits.push(`skickat ${c.sentBatches}`);
      if (c.blockedBatch && c.blockedBatch !== 'saknas') bits.push(`block ${c.blockedBatch}`);
      if (c.sent !== 'saknas') bits.push(`sent ${c.sent}`);
      if (c.clean !== 'saknas') bits.push(`rena ${c.clean}`);
      if (c.batches !== 'saknas') bits.push(`satser ${c.batches}`);
      bits.push(`öppningsfrekvens saknas`);
      return `<article class="crystal-kampanj crystal-kampanj-${tone}">
        <p class="crystal-kampanj-status">${escapeHtml(status)}</p>
        <h4>${escapeHtml(c.namn)}</h4>
        <p>${escapeHtml(bits.join(' · '))}</p>
        ${c.subject ? `<p class="crystal-faint">ämne: ${escapeHtml(c.subject)}</p>` : ''}
        ${c.blocker ? `<p class="crystal-blocker">spärr: ${escapeHtml(c.blocker)}</p>` : ''}
        ${c.drop ? `<p class="crystal-faint">släng: ${escapeHtml(c.drop)}</p>` : ''}
        ${c.note ? `<p class="crystal-faint">${escapeHtml(c.note)}</p>` : ''}
      </article>`;
    })
    .join('');
}

function renderRobban() {
  const local = LOCAL_SHORTCUTS.map(
    (s) =>
      `<a class="crystal-shortcut" href="${escapeHtml(s.href)}" data-local="${escapeHtml(s.id)}">${escapeHtml(s.namn)}</a>`,
  ).join('');
  const ks = KS_REF_SHORTCUTS.map(
    (s) =>
      `<a class="crystal-shortcut is-ks" href="${escapeHtml(ksUrl(s.path))}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.namn)}<span>KS-referens</span></a>`,
  ).join('');
  const checks = ROBBAN_CHECKLIST.map(
    (c) =>
      `<li><strong>${escapeHtml(c.label)}</strong> · ${escapeHtml(c.hint)}</li>`,
  ).join('');
  return `<section class="crystal-block" data-block="robban">
    <h3>Robban Robotsson</h3>
    <p class="crystal-identity">${escapeHtml(KS_ASSISTANT.displayName)}</p>
    <blockquote>${escapeHtml(KS_SLOGANS.sakerhet)}</blockquote>
    <p class="crystal-plan">${escapeHtml(KS_SLOGANS.utanPlan)}</p>
    <p class="crystal-faint">${escapeHtml(KS_SL_TP.sl)} · ${escapeHtml(KS_SL_TP.tp)} · ${escapeHtml(KS_SL_TP.rr)}</p>
    <p class="crystal-check-kicker">Checklista innan storlek · paper, inga live-ordrar</p>
    <ul class="crystal-check">${checks}</ul>
    <div class="crystal-shortcuts">${local}</div>
    <p class="crystal-ks-note">${escapeHtml(KS_NOTE)}</p>
    <div class="crystal-shortcuts">${ks}</div>
    <p class="crystal-faint">Läge: paper ja, live ${escapeHtml(KS_PAPER.liveLampa)}.</p>
  </section>`;
}

function renderShortcuts(tenant) {
  const fx = forcexShortcut(tenant);
  const cluster = CLUSTER_SHORTCUTS.map(
    (s) =>
      `<a class="crystal-shortcut" href="${escapeHtml(s.href)}">${escapeHtml(s.namn)}</a>`,
  ).join('');
  return `<section class="crystal-block" data-block="shortcuts">
    <h3>Klustret</h3>
    <div class="crystal-shortcuts">
      ${cluster}
      <a class="crystal-shortcut is-ext" href="${escapeHtml(fx.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(fx.label)}<span>extern</span></a>
    </div>
  </section>`;
}

export function renderCrystalDock(model) {
  const chips = chipLinks(model.tenant);
  const william = chips.williamCalendar ? chipAnchor(chips.williamCalendar, 'is-secondary') : '';
  return `<div class="crystal-dock">
    <button type="button" class="crystal-orb" data-action="crystal-toggle" aria-expanded="${model.expanded ? 'true' : 'false'}" title="Verktygslåda">
      <span class="crystal-facet" aria-hidden="true"></span>
      <span class="crystal-facet crystal-facet-2" aria-hidden="true"></span>
      <span class="crystal-orb-label">Verktygslåda</span>
    </button>
    ${chipAnchor(chips.calendar)}
    ${william}
    ${chipAnchor(chips.jamforelse)}
    ${chipAnchor(chips.deposition, 'is-draft')}
    <button type="button" class="crystal-chip" data-action="crystal-kampanj" data-chip="kampanj" title="${escapeHtml(chips.kampanj.title)}">${escapeHtml(chips.kampanj.label)}</button>
  </div>`;
}

export function renderCrystalPanel(model) {
  const liveLamp = LIVE_LAMP_ON ? 'gron' : 'rod';
  const liveValue = LIVE_LAMP_ON ? 'LIVE' : 'LIVE AV';
  const mag = model.magasin || {};
  const health = mag.health || { lamp: 'gul', label: 'saknas', stub: 'koppla till magasin_server' };
  const signals = mag.signals || { chips: [], empty: true, cap: 'saknas', nextName: 'saknas' };
  const stub = mag.wired
    ? ''
    : `<p class="crystal-stub">koppla till magasin_server</p>`;
  const forcex = model.forcex || { label: 'saknas' };
  const pr = model.pr || { open: 'saknas', blockers: 'saknas' };
  const brand = toolboxBrand(model.tenant);
  const kampanjOpen = model.drawer === 'kampanj';

  return `<div class="crystal-panel" ${model.expanded ? '' : 'hidden'}>
    <header class="crystal-head" data-drag-handle>
      <p class="crystal-kicker">ÖB Daniel · ${escapeHtml(brand.name)}</p>
      <h2>Verktygslåda</h2>
      <p class="crystal-lede">Kristall-HUD över Magasin och Rider. Paper. Ingen live-order.</p>
      <button type="button" class="crystal-min" data-action="crystal-toggle" title="Fäll ihop">−</button>
    </header>

    <div class="crystal-tiles">
      ${statusTile({
        id: 'live',
        lamp: liveLamp,
        kicker: 'Live / paper',
        value: liveValue,
        label: 'live låst',
        note: 'Paper default. Lampan går inte att tända här.',
      })}
      ${statusTile({
        id: 'magasin',
        lamp: health.lamp,
        kicker: 'Magasin',
        value: health.label,
        label: health.label,
        note: health.stub || 'Daniel-skrivbord · patronbälte',
      })}
      ${statusTile({
        id: 'forcex',
        lamp: forcex.connected ? 'gron' : 'gul',
        kicker: 'ForceX-session',
        value: forcex.label,
        label: forcex.label,
        note: 'Inga nycklar, cookies eller PAT visas.',
      })}
      ${statusTile({
        id: 'pr',
        lamp: 'gul',
        kicker: 'PR / spärr',
        value: `öppna ${pr.open} · spärr ${pr.blockers}`,
        label: 'saknas tills räknat',
        note: 'Tom cell = saknas. Inga påhittade tal.',
      })}
    </div>

    <section class="crystal-block crystal-magasin" data-block="magasin">
      <h3>Daniel Magasin · signaler</h3>
      <p class="crystal-cap">${escapeHtml(signals.cap || 'saknas')}</p>
      <div class="crystal-signals">${(signals.chips || []).map(signalChip).join('')}</div>
        ${mag.view ? renderMagazineHud(mag.view, { kicker: 'Daniel · patronbälte' }) : ''}
      <form class="crystal-park-row" data-crystal-park>
        <label>Dag <input name="dag" type="date" /></label>
        <label>Tid <input name="tid" type="time" /></label>
        <div class="crystal-parks">${parkButtons(model.parkPulse)}</div>
      </form>
      <p class="crystal-flash" data-crystal-flash>${escapeHtml(mag.flash || '')}</p>
      ${stub}
      <p class="crystal-faint">NA / VM / Recovery / Bokat · paper-UI. Kö från magasin.json när den finns.</p>
    </section>

    <section class="crystal-block" data-block="online">
      <h3>Onlinekunder</h3>
      ${renderOnline(model.online)}
    </section>

    ${renderRobban()}
    ${renderShortcuts(model.tenant)}

    <section class="crystal-drawer ${kampanjOpen ? 'is-open' : ''}" data-block="kampanj" ${kampanjOpen ? '' : 'hidden'}>
      <div class="crystal-drawer-head">
        <h3>Mailkampanj · status</h3>
        <button type="button" class="crystal-chip" data-action="crystal-kampanj-refresh">Uppdatera</button>
      </div>
      <p class="crystal-faint">Visar status. Skickar inte. Inga påhittade öppningsfrekvenser.</p>
      ${renderKampanjDrawer(model.campaign)}
    </section>
  </div>`;
}

export function renderCrystalHud(model = {}) {
  const expanded = Boolean(model.expanded);
  const style = [];
  if (Number.isFinite(model.x) && Number.isFinite(model.y)) {
    style.push(`left:${Number(model.x)}px`);
    style.push(`top:${Number(model.y)}px`);
    style.push('right:auto');
    style.push('bottom:auto');
  }
  return `<aside id="crystal-hud" class="crystal-hud${expanded ? ' is-open' : ''}" data-crystal-hud role="complementary" aria-label="Verktygslåda" style="${style.join(';')}">
    ${renderCrystalDock(model)}
    ${renderCrystalPanel(model)}
  </aside>`;
}
