import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAPER_FIXTURES,
  ROUND_COOLDOWN_MS,
  afterTouch,
  applyCooldown,
  clientContactScore,
  cockedId,
  copyFromCartridge,
  defaultFocusId,
  emptyHudState,
  fireOutcome,
  hasOutcome,
  inRingNow,
  isServedThisRound,
  litId,
  magazineView,
  markCartridge,
  markServed,
  mergeNextContactAt,
  rankClientsToContact,
  reopenForRound,
  rowId,
} from './contact-queue.js';
import { renderMagazineHud } from './magazine-hud.js';

const T0 = Date.parse('2026-09-07T10:00:00Z');

function clonePaper() {
  return PAPER_FIXTURES.map((r) => ({ ...r }));
}

test('rankClientsToContact: highest score first until nextContactAt rotates', () => {
  const rows = clonePaper();
  const ranked = rankClientsToContact(rows, T0);
  assert.equal(rowId(ranked[0]), 'p-a');
  assert.ok(clientContactScore(rows[0], T0) > clientContactScore(rows[1], T0));
});

test('avtalad tid trumfar North-score, utan nya vikter', () => {
  const rows = clonePaper();
  rows[3].avtalad_tid = '2026-09-07T09:00:00Z';
  const ranked = rankClientsToContact(rows, T0);
  assert.equal(rowId(ranked[0]), 'p-d');
});

test('copy/mark/saved sätter cooldown — samma person blir inte ranked[0] samma runda', () => {
  const rows = clonePaper();
  const state = emptyHudState();
  afterTouch(state, rows, 'p-a', T0, 'copy');
  const ranked = rankClientsToContact(rows, T0);
  assert.equal(rowId(ranked[0]), 'p-b');
  assert.notEqual(rowId(ranked[0]), 'p-a');
  assert.ok(Date.parse(rows[0].nextContactAt) > T0);
});

test('reload med sparad nextContactAt hoppar inte tillbaka till samma namn', () => {
  const rows = clonePaper();
  applyCooldown(rows[0], T0);
  const again = rankClientsToContact(rows, T0 + 1000);
  assert.equal(rowId(again[0]), 'p-b');
  assert.notEqual(rowId(again[0]), 'p-a');
});

test('efter copy/arbete: Ring-nu och fokus är nästa osaknad, inte den betjänade', () => {
  const rows = clonePaper();
  const state = emptyHudState();
  afterTouch(state, rows, 'p-a', T0, 'copy');
  assert.equal(cockedId(rows, T0), 'p-b');
  assert.equal(defaultFocusId(state, rows, T0), 'p-b');
  assert.equal(litId(state), 'p-a');
});

test('bara en patron lyser: copy sedan mark byter ljus', () => {
  const rows = clonePaper();
  const state = emptyHudState();
  copyFromCartridge(state, 'p-a', T0);
  assert.equal(litId(state), 'p-a');
  markCartridge(state, 'p-c', T0 + 10);
  assert.equal(litId(state), 'p-c');
  const view = magazineView(rows, state, T0 + 10);
  const lit = view.cartridges.filter((c) => c.isLit);
  assert.equal(lit.length, 1);
  assert.equal(lit[0].id, 'p-c');
});

test('öppnad kort är inte utfall — hammaren stannar cocked', () => {
  const rows = clonePaper();
  const state = emptyHudState();
  markCartridge(state, 'p-a', T0);
  assert.equal(inRingNow(rows[0]), true);
  assert.equal(hasOutcome(rows[0]), false);
  assert.equal(cockedId(rows, T0), 'p-a');
});

test('utfall avfyrar, lämnar ring-nu, nästa cockar', () => {
  const rows = clonePaper();
  const state = emptyHudState();
  fireOutcome(state, rows, 'p-a', T0, 'saved');
  assert.equal(inRingNow(rows[0]), false);
  assert.equal(hasOutcome(rows[0]), true);
  assert.equal(cockedId(rows, T0), 'p-b');
  const view = magazineView(rows, state, T0);
  const a = view.cartridges.find((c) => c.id === 'p-a');
  const b = view.cartridges.find((c) => c.id === 'p-b');
  assert.equal(a.isFiring, true);
  assert.equal(a.inRing, false);
  assert.equal(a.status, 'utfall');
  assert.equal(b.isCocked, true);
  assert.equal(view.ringNow.includes('p-a'), false);
});

test('ingen återvinning förrän övriga haft sin tur — sedan ny runda', () => {
  const rows = clonePaper();
  afterTouch(emptyHudState(), rows, 'p-a', T0, 'saved');
  afterTouch(emptyHudState(), rows, 'p-b', T0 + 1, 'saved');
  afterTouch(emptyHudState(), rows, 'p-c', T0 + 2, 'saved');
  const mid = rankClientsToContact(rows, T0 + 3);
  assert.equal(rowId(mid[0]), 'p-d');
  afterTouch(emptyHudState(), rows, 'p-d', T0 + 3, 'saved');
  const fresh = rankClientsToContact(rows, T0 + 4);
  assert.equal(rowId(fresh[0]), 'p-a');
});

test('HUD: namn + status, inte symbol/PNL; extra-flagga', () => {
  const rows = clonePaper();
  const state = emptyHudState();
  copyFromCartridge(state, 'p-a', T0);
  const html = renderMagazineHud(magazineView(rows, state, T0), { extra: false });
  assert.match(html, /magazine-round is-lit/);
  assert.match(html, /magazine-hammer is-cocked/);
  assert.match(html, /klient · väntar/);
  assert.match(html, /lead · väntar/);
  assert.doesNotMatch(html, /PNL|pnl|symbol/i);
  const extra = renderMagazineHud(magazineView([], emptyHudState(), T0), { extra: true });
  assert.match(extra, /is-extra/);
  assert.match(extra, /Primär yta är Magasinet/);
});

test('cooldown-längd är rundan, inte noll', () => {
  assert.ok(ROUND_COOLDOWN_MS > 60_000);
});

function recoveryAheadFixture() {
  return [
    {
      id: 'rec-1',
      namn: 'R',
      brand: 'North',
      status: 'RECOVERY',
      avtalad_tid: '2026-01-01T09:00:00Z',
      last_contact: '2025-01-01T00:00:00Z',
    },
    { id: 'p-new', namn: 'N', brand: 'KS', status: '', role: 'klient' },
    { id: 'p-a', namn: 'A', brand: 'North', status: '', role: 'klient' },
  ];
}

test('Recovery med North + gammal avtalad tid hamnar bakom nya kort', () => {
  const rows = recoveryAheadFixture();
  const ranked = rankClientsToContact(rows, T0);
  assert.equal(rowId(ranked[0]), 'p-a');
  assert.notEqual(rowId(ranked[0]), 'rec-1');
  assert.ok(ranked.findIndex((r) => rowId(r) === 'p-new') < ranked.findIndex((r) => rowId(r) === 'rec-1'));
  assert.equal(cockedId(rows, T0), 'p-a');
});

test('filordning Recovery-först speglas inte i HUD-kön', () => {
  const rows = recoveryAheadFixture();
  const view = magazineView(rows, emptyHudState(), T0);
  assert.equal(view.cartridges[0].id, 'p-a');
  assert.equal(view.cartridges[0].status, 'väntar');
  assert.equal(view.cartridges.some((c) => c.id === 'rec-1' && c.isCocked), false);
  const rec = view.cartridges.find((c) => c.id === 'rec-1');
  assert.equal(rec.status, 'recovery');
  assert.ok(view.cartridges.findIndex((c) => c.id === 'rec-1') > view.cartridges.findIndex((c) => c.status === 'väntar'));
});

test('ÖB-filter recovery sätter Recovery först; default gör det inte', () => {
  const rows = recoveryAheadFixture();
  assert.equal(rowId(rankClientsToContact(rows, T0, 'queue')[0]), 'p-a');
  assert.equal(rowId(rankClientsToContact(rows, T0, 'recovery')[0]), 'rec-1');
  const view = magazineView(rows, emptyHudState(), T0, 'daniel', 'recovery');
  assert.equal(view.cartridges[0].id, 'rec-1');
  assert.equal(view.cockedId, 'rec-1');
});

test('nextContactAt roterar bland nya kort — Recovery blir inte ranked[0]', () => {
  const rows = recoveryAheadFixture();
  applyCooldown(rows[2], T0);
  const ranked = rankClientsToContact(rows, T0);
  assert.equal(rowId(ranked[0]), 'p-new');
  assert.notEqual(rowId(ranked[0]), 'rec-1');
});

test('efter arbete på B: Ring-nu är osaknad A/C/D, aldrig B förrän A,C,D fått tur', () => {
  const rows = clonePaper();
  const b = rows.find((r) => r.id === 'p-b');
  b.brand = 'North';
  b.avtalad_tid = '2026-09-07T09:00:00Z';
  b.last_contact = '';
  assert.ok(clientContactScore(b, T0) > clientContactScore(rows[0], T0));
  assert.equal(cockedId(rows, T0), 'p-b');

  afterTouch(emptyHudState(), rows, 'p-b', T0, 'copy');
  const later = T0 + ROUND_COOLDOWN_MS + 60_000;
  const afterB = rankClientsToContact(rows, later);
  assert.notEqual(rowId(afterB[0]), 'p-b');
  assert.ok(['p-a', 'p-c', 'p-d'].includes(rowId(afterB[0])));
  assert.equal(isServedThisRound(b), true);

  for (let i = 0; i < 3; i += 1) {
    const nowId = cockedId(rows, later + i);
    assert.notEqual(nowId, 'p-b');
    assert.ok(['p-a', 'p-c', 'p-d'].includes(nowId));
    afterTouch(emptyHudState(), rows, nowId, later + i, 'copy');
  }

  const view = magazineView(rows, emptyHudState(), later + 3);
  assert.equal(view.cockedId, 'p-b');
  assert.equal(view.ringNow[0], 'p-b');
});

test('ÖB reopen släpper in betjänad igen före rundan är slut', () => {
  const rows = clonePaper();
  afterTouch(emptyHudState(), rows, 'p-b', T0, 'copy');
  assert.notEqual(cockedId(rows, T0), 'p-b');
  reopenForRound(rows.find((r) => r.id === 'p-b'));
  assert.equal(isServedThisRound(rows.find((r) => r.id === 'p-b')), false);
});

test('served-flagga överlever overlay-merge även när cooldown gått ut', () => {
  const rows = clonePaper();
  markServed(rows[1], T0);
  const overlay = { 'p-b': { servedThisRound: true, servedAt: rows[1].servedAt } };
  const fresh = clonePaper();
  mergeNextContactAt(fresh, overlay);
  const later = T0 + ROUND_COOLDOWN_MS + 1;
  assert.notEqual(cockedId(fresh, later), 'p-b');
});
