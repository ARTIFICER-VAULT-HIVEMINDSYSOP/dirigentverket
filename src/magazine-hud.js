import { escapeHtml } from './format.js';
import { magazineView } from './contact-queue.js';

export function renderMagazineHud(view, opts = {}) {
  const extra = opts.extra ? ' is-extra' : '';
  const cartridges = Array.isArray(view?.cartridges) ? view.cartridges : [];
  const n = Math.max(cartridges.length, 1);
  const rounds = cartridges
    .map((c, i) => {
      const cls = [
        'magazine-round',
        c.isLit ? 'is-lit' : '',
        c.isCocked ? 'is-cocked' : '',
        c.isFiring ? 'is-firing' : '',
        c.status === 'recovery' ? 'is-parked' : '',
        c.inRing ? '' : 'is-spent',
      ]
        .filter(Boolean)
        .join(' ');
      const role = c.role === 'lead' ? 'lead' : 'klient';
      const status = c.status === 'utfall' ? 'utfall' : c.status === 'recovery' ? 'recovery' : 'väntar';
      return `<li class="${cls}" data-id="${escapeHtml(c.id)}" style="--i:${i};--n:${n}">
        <button type="button" data-mark="${escapeHtml(c.id)}" aria-pressed="${c.isLit ? 'true' : 'false'}">
          <span class="round-name">${escapeHtml(c.name || 'saknas')}</span>
          <span class="round-status">${escapeHtml(role)} · ${escapeHtml(status)}</span>
        </button>
      </li>`;
    })
    .join('');
  const hammerCls = [
    'magazine-hammer',
    view?.cockedId ? 'is-cocked' : '',
    view?.firingId ? 'is-firing' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const kicker = opts.extra ? 'Extra · Trade Rider' : 'Magasinet · klient/lead-kö';
  const empty = !cartridges.length
    ? '<p class="magazine-hud-empty">väntar kö</p>'
    : '';
  return `<section class="magazine-hud${extra}" data-magasin-hud>
    <p class="magazine-hud-kicker">${escapeHtml(kicker)}</p>
    <div class="magazine-drum" data-count="${cartridges.length}">
      <div class="${hammerCls}" aria-hidden="true"></div>
      <div class="magazine-muzzle${view?.firingId ? ' is-firing' : ''}" aria-hidden="true"></div>
      <ol class="magazine-rounds">${rounds}</ol>
      ${empty}
    </div>
    <p class="magazine-hud-cap">${escapeHtml(view?.cap || 'väntar kö')}</p>
    ${opts.extra ? '<p class="magazine-hud-extra-note">Extra. Primär yta är Magasinet — inte Trade Rider, inte nyhetsbrev.</p>' : ''}
  </section>`;
}

export function renderMagazineHudFromRows(rows, state, now, magasin, opts) {
  return renderMagazineHud(magazineView(rows, state, now, magasin, opts?.filter), opts);
}
