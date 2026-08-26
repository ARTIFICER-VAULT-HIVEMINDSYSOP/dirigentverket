import { escapeHtml } from './format.js';
import { WILLIAM_COPY, williamMagazine } from './william.js';

export const MAGAZIN_NAV = Object.freeze([
  { id: 'magasin', name: 'Magasin', href: '/magasin.html' },
  { id: 'william', name: 'William magasin', href: '/william.html' },
  { id: 'luckor', name: 'Luckor', href: '/luckor.html' },
]);

export const TOOLBOX_TOOLS = Object.freeze([
  {
    id: 'magasin',
    name: 'Magasin',
    href: '/magasin.html',
    standard: true,
    neverMissing: true,
    copy: 'Daniel. Kö till samtal. Inte luckor.',
  },
  {
    id: 'william',
    name: 'William magasin',
    href: '/william.html',
    standard: true,
    neverMissing: true,
    copy: WILLIAM_COPY,
  },
  {
    id: 'luckor',
    name: 'Luckor',
    href: '/luckor.html',
    standard: true,
    neverMissing: true,
    copy: 'Tomma kvartar. Inte registret.',
  },
]);

export function toolboxTools({ queue = [], session = null } = {}) {
  const william = williamMagazine({ session, rows: queue });
  return TOOLBOX_TOOLS.map((tool) => {
    if (tool.id !== 'william') {
      return { ...tool, missing: false };
    }
    return {
      ...tool,
      ...william,
      standard: true,
      neverMissing: true,
      missing: false,
    };
  });
}

function renderAlvaCard(tool) {
  const lamp =
    tool.id === 'william'
      ? `<span class="lamp lamp-${escapeHtml(tool.lamp)}" aria-hidden="true"></span>`
      : '';
  const lampText =
    tool.id === 'william'
      ? `<span class="alva-lamp-text">${escapeHtml(tool.lampText)}</span>`
      : '';
  return `
    <a class="alva-card" href="${escapeHtml(tool.href)}" data-tool="${escapeHtml(tool.id)}">
      <p class="alva-name">${lamp}${escapeHtml(tool.name)}</p>
      <p class="alva-copy">${escapeHtml(tool.copy)}</p>
      ${lampText}
    </a>`;
}

export function renderKontrollpanel(opts = {}) {
  const tools = toolboxTools(opts);
  const strip = tools
    .map((t) => `<a href="${escapeHtml(t.href)}">${escapeHtml(t.name)}</a>`)
    .join('');
  const cards = tools.map((t) => renderAlvaCard(t)).join('');
  return `
    <section class="kontrollpanel" aria-label="Artificer kontrollpanel">
      <p class="toolbox-kicker">Verktygslåda</p>
      <nav class="toolbox-strip" aria-label="Verktygslåda">${strip}</nav>
      <div class="alva-grid">${cards}</div>
    </section>`;
}
