import { test } from 'node:test';
import assert from 'node:assert/strict';
import { magazineView, emptyHudState, PAPER_FIXTURES } from './contact-queue.js';
import {
  LIVE_LAMP_ON,
  JAMFORELSE_PATH,
  JAMFORELSE_MALL_PATH,
  DEPOSITION_PATH,
  CALENDAR_URL,
  bookedNeedsTime,
  campaignStatusView,
  chipLinks,
  countOrSaknas,
  emptyLabel,
  forcexSessionHint,
  magasinHealthFromPayload,
  magasinSignals,
  overlayRoute,
  parkPayload,
  prBlockerPlaceholder,
  publicPath,
  sanitizeOnlineCustomers,
  toolboxBrand,
} from './verktygslada.js';
import { renderCrystalHud, renderCrystalDock } from './verktygslada-ui.js';

test('live-lampa är släckt', () => {
  assert.equal(LIVE_LAMP_ON, false);
});

test('tom cell blir saknas', () => {
  assert.equal(emptyLabel(''), 'saknas');
  assert.equal(emptyLabel(null), 'saknas');
  assert.equal(countOrSaknas(undefined), 'saknas');
  assert.equal(countOrSaknas(0), 0);
});

test('ForceX-hint läcker inte hemligheter', () => {
  const hint = forcexSessionHint({
    token: 'super-secret',
    password: 'x',
    url: 'https://crm1.forcex.software',
  });
  assert.equal(hint.connected, false);
  assert.match(hint.label, /session saknas/);
  assert.equal(hint.leaked, true);
  const html = renderCrystalHud({
    expanded: true,
    forcex: hint,
    magasin: { health: { lamp: 'gul', label: 'saknas' }, signals: magasinSignals(null) },
    online: { customers: [], label: 'saknas' },
    pr: { open: 'saknas', blockers: 'saknas' },
    campaign: { campaigns: [] },
  });
  assert.equal(html.includes('super-secret'), false);
  assert.equal(html.includes('password'), false);
});

test('magasin-hälsa: saknad payload är saknas, inte påhittat tal', () => {
  const miss = magasinHealthFromPayload(null, false);
  assert.equal(miss.label, 'saknas');
  assert.equal(miss.wired, false);
  assert.match(miss.stub, /magasin_server/);
  const empty = magasinHealthFromPayload({ rows: [] }, true);
  assert.equal(empty.wired, true);
  assert.equal(empty.label, 'väntar kö');
});

test('magasin-signaler från magazineView utan påhittade namn när kön är tom', () => {
  const empty = magasinSignals(magazineView([], emptyHudState()));
  assert.equal(empty.empty, true);
  assert.equal(empty.nextName, 'saknas');
  assert.equal(empty.chips.find((c) => c.id === 'wait').text, 'saknas');
  const rows = PAPER_FIXTURES.map((r) => ({ ...r }));
  const view = magazineView(rows, emptyHudState(), Date.parse('2026-09-07T10:00:00Z'));
  const sig = magasinSignals(view);
  assert.equal(sig.empty, false);
  assert.equal(sig.nextName, 'A');
  assert.equal(sig.chips.find((c) => c.id === 'cocked').pulse, true);
});

test('park-payload: NA/VM/Recovery; Bokat kräver tid', () => {
  assert.equal(parkPayload('NA').park, 'NA');
  assert.equal(parkPayload('VM').park, 'VM');
  assert.equal(parkPayload('RECOVERY').park, 'RECOVERY');
  const booked = parkPayload('BOOKED', { dag: '2026-09-17', tid: '' });
  assert.equal(booked.kind, 'BOOKED');
  assert.equal(bookedNeedsTime(booked), true);
  assert.equal(bookedNeedsTime(parkPayload('BOOKED', { tid: '09:15' })), false);
});

test('onlinekunder: tom lista = saknas, saldo visas inte', () => {
  const empty = sanitizeOnlineCustomers({ ok: true, customers: [] });
  assert.equal(empty.label, 'saknas');
  assert.equal(empty.customers.length, 0);
  const dirty = sanitizeOnlineCustomers({
    ok: true,
    customers: [{ id: '1', namn: 'X', saldo: 99999, telefon: '+46000' }],
  });
  assert.equal(dirty.customers[0].namn, 'X');
  assert.equal('saldo' in dirty.customers[0], false);
  assert.equal('telefon' in dirty.customers[0], false);
});

test('PR-platshållare hittar inte på tal', () => {
  const p = prBlockerPlaceholder({});
  assert.equal(p.open, 'saknas');
  assert.equal(p.blockers, 'saknas');
});

test('kampanjstatus: öppningsfrekvens alltid saknas', () => {
  const view = campaignStatusView({
    campaigns: [{ id: 'x', namn: 'FU', status: 'SENT', openRate: 0.42, sent: 0 }],
  });
  assert.equal(view.campaigns[0].openRate, 'saknas');
  assert.equal(view.campaigns[0].sent, 0);
  assert.equal(campaignStatusView(null).label, 'saknas');
});

test('snabbknappar: Jämförelse pekar på befintligt kundjamforelse-verktyg, inte ett nytt verktyg', () => {
  const chips = chipLinks({});
  assert.equal(chips.calendar.href, CALENDAR_URL);
  assert.equal(chips.jamforelse.href, '/utskick/kundjamforelse-verktyg.html');
  assert.equal(chips.jamforelse.href, JAMFORELSE_PATH);
  assert.equal(chips.jamforelseMall.href, '/utskick/mall-kund-jamforelse.html');
  assert.equal(chips.jamforelseMall.href, JAMFORELSE_MALL_PATH);
  assert.equal(chips.deposition.href, DEPOSITION_PATH);
  assert.equal(chips.williamCalendar, null);
  const html = renderCrystalDock({ expanded: false, tenant: {} });
  assert.match(html, /Kalender/);
  assert.match(html, /Jämförelse/);
  assert.match(html, /Deposition/);
  assert.match(html, /Kampanj/);
  assert.match(html, /calendar\.google\.com/);
  assert.match(html, /\/utskick\/kundjamforelse-verktyg\.html/);
  assert.doesNotMatch(html, /kontotyp-jamforelse-ny|inventerad-jamforelse/);
  assert.match(html, /deposition-mall\.html/);
});

test('HUD-html: paper, saknas, ingen send-knapp för mejl', () => {
  const html = renderCrystalHud({
    expanded: true,
    drawer: 'kampanj',
    magasin: {
      health: { lamp: 'gul', label: 'saknas', stub: 'koppla till magasin_server' },
      signals: magasinSignals(null),
      wired: false,
    },
    online: { customers: [], label: 'saknas' },
    forcex: { connected: false, label: 'saknas' },
    pr: { open: 'saknas', blockers: 'saknas' },
    campaign: campaignStatusView({
      campaigns: [
        { namn: 'FU premium Zoho', status: 'SENT', sentBatches: '01–23', blockedBatch: '24' },
      ],
    }),
  });
  assert.match(html, /LIVE AV/);
  assert.match(html, /Onlinekunder/);
  assert.match(html, /Robban Robotsson/);
  assert.match(html, /Först säkerhetsutrustning/);
  assert.match(html, /koppla till magasin_server/);
  assert.match(html, />saknas</);
  assert.doesNotMatch(html, /data-send-mail|skicka mejl|Zoho send/i);
  assert.match(html, /Mailkampanj/);
  assert.match(html, /KS-referens/);
  assert.match(html, /\/utskick\/kundjamforelse-verktyg\.html/);
  assert.match(html, /\/utskick\/mall-kund-jamforelse\.html/);
});

test('tom kö i HUD hittar inte på kundnamn', () => {
  const html = renderCrystalHud({
    expanded: true,
    magasin: {
      health: { lamp: 'gul', label: 'saknas' },
      signals: magasinSignals(magazineView([], emptyHudState())),
      wired: false,
    },
    online: { customers: [], label: 'saknas' },
    forcex: { connected: false, label: 'saknas' },
    pr: { open: 'saknas', blockers: 'saknas' },
    campaign: { campaigns: [] },
  });
  assert.doesNotMatch(html, /Lena|Bjorn|Kent /);
  assert.match(html, /saknas/);
});

test('#/verktygslada och #/panel är overlay-rutter', () => {
  assert.equal(overlayRoute('#/verktygslada'), true);
  assert.equal(overlayRoute('#/panel'), true);
  assert.equal(overlayRoute('#/robot'), false);
});

test('white-label brand från tenant', () => {
  const b = toolboxBrand({ skin: { name: 'Exempel' } });
  assert.equal(b.name, 'Exempel');
  assert.equal(publicPath('utskick/x.html'), '/utskick/x.html');
});
