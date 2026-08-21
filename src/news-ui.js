import { escapeHtml } from './format.js';
import { NEWS_KALLOR, creditLine } from './news.js';

function kallaOptions(selected) {
  const labels = { egen: 'Egen', unsplash: 'Unsplash', pexels: 'Pexels', wikimedia: 'Wikimedia' };
  return NEWS_KALLOR.map(
    (k) => `<option value="${escapeHtml(k)}" ${k === selected ? 'selected' : ''}>${escapeHtml(labels[k] || k)}</option>`
  ).join('');
}

function heroBlock(item) {
  const b = item.bild || {};
  const ok = b.status === 'godkand' && b.kalla && b.credit && b.license && b.src;
  if (ok) {
    return `<div class="news-hero"><img src="${escapeHtml(b.src)}" alt="" /><p class="muted">${escapeHtml(creditLine(b))}</p></div>`;
  }
  return `<p class="news-blocked muted">saknar godkänd bild</p>`;
}

function moduleCard(mod, selectedModuleId) {
  const selected = selectedModuleId === mod.id ? ' is-selected' : '';
  return `
    <article class="card${selected}" data-module-id="${escapeHtml(mod.id)}">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(mod.namn)}</h3>
          <div class="muted">${escapeHtml(mod.typ)}${mod.verksamhet ? ` · ${escapeHtml(mod.verksamhet)}` : ''}</div>
        </div>
      </div>
      <div class="form-grid" style="margin-top:12px">
        <label class="full">Feed-url
          <input name="url" data-news-url="${escapeHtml(mod.id)}" value="${escapeHtml(mod.url)}" placeholder="https://…" /></label>
      </div>
      <div class="btn-row">
        <button class="btn" type="button" data-action="news-fetch" data-id="${escapeHtml(mod.id)}">Hämta</button>
        <button class="btn btn-ghost" type="button" data-action="news-save-url" data-id="${escapeHtml(mod.id)}">Spara url</button>
      </div>
    </article>`;
}

function itemCard(item, mod) {
  const link = item.link
    ? `<p class="muted"><a href="${escapeHtml(item.link)}" target="_blank" rel="noopener">Källa</a>${item.published ? ` · ${escapeHtml(item.published)}` : ''}</p>`
    : item.published
      ? `<p class="muted">${escapeHtml(item.published)}</p>`
      : '';
  return `
    <article class="card" data-item-id="${escapeHtml(item.id)}">
      <h3>${escapeHtml(item.title) || '<span class="faint">Utan titel</span>'}</h3>
      <p class="muted">${escapeHtml(item.lead)}</p>
      <div class="muted">${escapeHtml(mod.namn)}</div>
      ${link}
      ${heroBlock(item)}
      <form class="news-bild-form" id="news-bild-form-${escapeHtml(item.id)}" data-item-id="${escapeHtml(item.id)}">
        <div class="form-grid">
          <label>Källa
            <select name="kalla">${kallaOptions(item.bild?.kalla)}</select></label>
          <label>Credit
            <input name="credit" value="${escapeHtml(item.bild?.credit || '')}" placeholder="namn / redaktion" /></label>
          <label>Licens
            <input name="license" value="${escapeHtml(item.bild?.license || '')}" placeholder="t.ex. Unsplash License" /></label>
          <label>Bild-url
            <input name="src" value="${item.bild?.status === 'godkand' ? escapeHtml(item.bild.src || '') : ''}" placeholder="licensierad eller egen url" /></label>
        </div>
        <div class="btn-row">
          <button class="btn" type="submit" data-action="news-attach" data-id="${escapeHtml(item.id)}">Koppla bild</button>
        </div>
      </form>
    </article>`;
}

export function renderNews(news, opts = {}) {
  const selectedModuleId = opts.selectedModuleId || '';
  const modules = news?.modules || [];
  const moduleOpts = modules
    .map((m) => `<option value="${escapeHtml(m.id)}" ${m.id === selectedModuleId ? 'selected' : ''}>${escapeHtml(m.namn)}</option>`)
    .join('');
  const cards = modules.map((m) => moduleCard(m, selectedModuleId)).join('');
  const articles = modules.flatMap((m) => (m.items || []).map((it) => itemCard(it, m))).join('');
  const err = news?.error ? `<div class="info-banner">${escapeHtml(news.error)}</div>` : '';

  return `
    <p class="page-lead">Externa moduler. Klistra in en feed-url eller en artikel. Inga påhittade texter.</p>
    <div class="banner-struktur" role="status">Feed-bilder släpps inte igenom. Bara egen eller Unsplash/Pexels/Wikimedia med namn och licens. Inga vattenstämplar.</div>
    ${err}
    <h3 class="section-title">Moduler</h3>
    <div class="grid-cards">${cards}</div>
    <h3 class="section-title">Klistra in manuellt</h3>
    <form id="news-manual-form">
      <div class="form-grid">
        <label>Titel<input name="title" required /></label>
        <label>Modul<select name="moduleId">${moduleOpts}</select></label>
        <label class="full">Ingress<textarea name="lead"></textarea></label>
        <label class="full">Länk <span class="hint">valfritt</span><input name="link" /></label>
      </div>
      <div class="btn-row">
        <button class="btn btn-gold" type="submit" data-action="news-add">Lägg till</button>
      </div>
    </form>
    <h3 class="section-title">Artiklar</h3>
    ${articles || '<p class="empty">Inga artiklar ännu. Fyll i en feed-url eller klistra in manuellt.</p>'}
  `;
}
