/** Kapital & Strategi as REFERENCE only — not a second book.
 *  Quoted facts from the public site / bundle. No invented metrics.
 */

export const KS_BASE = 'https://www.kapitalstrategi.com';

export const KS_NOTE =
  'Kapitalstrategi.com är referens, inte en andra bok. Artificer kopierar inte sajten.';

export const KS_ASSISTANT = {
  displayName: 'Robban Robotsson',
  female: 'Lina Rubina Robotsson',
  team: { robban: 'Robban', lina: 'Lina', max: 'Max' },
};

/** Quoted Robban / school lines. */
export const KS_SLOGANS = {
  sakerhet: 'Först säkerhetsutrustning. Sedan fart. Aldrig tvärtom.',
  utanPlan: 'Utan S/L och T/P är det inte en plan — det är ett rop.',
  rider:
    'Som Line Rider: priset är spåret — kälkaren åker längs linjen. Svart linje = kurs, blå = Bollinger.',
};

export const KS_SL_TP = {
  sl: 'S/L ≈ säkerhetsbälte',
  tp: 'T/P ≈ flytväst',
  rr: 'R:R ≈ hjälm',
};

export const KS_PAPER = {
  paper: true,
  live: false,
  advice: false,
  liveLampa: 'släckt',
};

export function ksUrl(path) {
  const p = path === '/' ? '/' : path;
  return KS_BASE + p;
}

/** KS deep-links as secondary shortcuts only. */
export const KS_REF_SHORTCUTS = [
  { path: '/tradingskolan', namn: 'Tradingskolan' },
  { path: '/trade-rider', namn: 'Trade Rider' },
  { path: '/player-value', namn: 'Player Value' },
  { path: '/skatt', namn: 'Skatt' },
  { path: '/signaler', namn: 'Signaler' },
];
