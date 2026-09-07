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
  litId,
  magazineView,
  markCartridge,
  rankClientsToContact,
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

test('default focus är inte ranked[0] om någon annan just kopierades/markerades', () => {
  const rows = clonePaper();
  const state = emptyHudState();
  afterTouch(state, rows, 'p-a', T0, 'copy');
  assert.equal(cockedId(rows, T0), 'p-b');
  assert.equal(defaultFocusId(state, rows, T0), 'p-a');
  assert.notEqual(defaultFocusId(state, rows, T0), cockedId(rows, T0));
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
