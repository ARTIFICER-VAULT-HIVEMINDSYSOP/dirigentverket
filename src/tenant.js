/**
 * White-label tenant resolve. Brand/logos live in tenant config, not the engine.
 * Empty cells stay empty. No customer PII. No invented amounts.
 */

export const DEFAULT_WATCHERS_KICKER = 'WATCHERS · anden i lampan';

function str(v) {
  return String(v ?? '').trim();
}

/** Only relative image paths. Rejects urls, data:, javascript:. Empty = CSS chamber. */
export function chamberCssValue(chamber) {
  const s = str(chamber);
  if (!s) return '';
  if (/^(https?:|data:|javascript:|\/\/)/i.test(s)) return '';
  if (!/^\.?\/?[\w./-]+\.(png|jpg|jpeg|webp|svg)$/i.test(s)) return '';
  const safe = s.replace(/["')\s]/g, '');
  return `url("${safe}")`;
}

/**
 * Watchers / lamp skin from tenant. Defaults are product copy, not a brand lock.
 * logo/name empty until the tenant fills them.
 */
export function resolveWatchersSkin(tenant = {}) {
  const skin = tenant && typeof tenant.skin === 'object' ? tenant.skin : {};
  const watchers = skin.watchers && typeof skin.watchers === 'object' ? skin.watchers : {};
  const kicker = str(watchers.kicker) || DEFAULT_WATCHERS_KICKER;
  return {
    name: str(skin.name),
    logo: str(skin.logo),
    markAlt: str(skin.markAlt || skin.name),
    kicker,
    chamber: str(watchers.chamber),
    paper: tenant.rules?.paper_default !== false,
  };
}

export function applyWatchersChamber(el, chamber) {
  if (!el || !el.style) return '';
  const css = chamberCssValue(chamber);
  if (css) el.style.setProperty('--watchers-chamber', css);
  else el.style.removeProperty('--watchers-chamber');
  return css;
}
