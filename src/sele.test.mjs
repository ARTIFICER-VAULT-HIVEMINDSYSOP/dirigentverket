import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSele,
  validateSele,
  applyVolume,
  capVolumePct,
  parseSymbols,
  emptySele,
  tenantSeleShape,
  loadSeleDraft,
  saveSeleDraft,
  LIVE_LOCKED,
} from './sele.js';
import { renderSele, renderSeleResult } from './sele-ui.js';

function memStore() {
  const data = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem(k, v) {
      data[k] = String(v);
    },
  };
}

const bound = {
  name: 'North paper',
  brand: 'North Investment',
  assigned: 'Daniel',
  symbols: 'EURUSD, XAUUSD',
  volumePct: 1,
  side: 'köp',
  slPct: 0.5,
  tpPct: 1.5,
};

test('tomma fält förblir tomma, inte 0 och inte påhittade', () => {
  const s = createSele({});
  assert.equal(s.name, '');
  assert.equal(s.clientFilter.brand, '');
  assert.equal(s.clientFilter.assigned, '');
  assert.equal(s.clientFilter.tenantId, '');
  assert.deepEqual(s.symbols, []);
  assert.equal(s.volumePct, '');
  assert.equal(s.slPct, '');
  assert.equal(s.tpPct, '');
  assert.notEqual(s.volumePct, 0);
  assert.notEqual(s.slPct, 0);
  assert.equal(s.paper, true);
  assert.equal(s.live, false);
  assert.equal(s.side, 'köp');
  assert.equal(s.skipIfSymbolOpen, true);
});

test('createSele fyller filter och symboler utan att gissa kurser', () => {
  const s = createSele(bound, { id: 'example' });
  assert.equal(s.name, 'North paper');
  assert.equal(s.clientFilter.brand, 'North Investment');
  assert.equal(s.clientFilter.assigned, 'Daniel');
  assert.equal(s.clientFilter.tenantId, 'example');
  assert.deepEqual(s.symbols, ['EURUSD', 'XAUUSD']);
  assert.equal(s.volumePct, 1);
  assert.equal(s.slPct, 0.5);
  assert.equal(s.tpPct, 1.5);
  assert.equal(s.paper, true);
});

test('validateSele: SL+TP krävs för ok; saknade fält listas som saknas', () => {
  const empty = validateSele({});
  assert.equal(empty.ok, false);
  assert.equal(empty.saknar_sl_tp, true);
  assert.deepEqual(empty.missing, ['name', 'brand', 'assigned', 'symbols', 'volumePct', 'slPct', 'tpPct']);
  assert.deepEqual(empty.saknas, empty.missing);
  assert.deepEqual(empty.errors, ['saknar_sl_tp']);
  assert.equal(empty.sele.slPct, '');
  assert.equal(empty.sele.tpPct, '');

  const noSl = validateSele({ ...bound, slPct: '' });
  assert.equal(noSl.ok, false);
  assert.equal(noSl.saknar_sl_tp, true);
  assert.ok(noSl.missing.includes('slPct'));

  const noTp = validateSele({ ...bound, tpPct: 0 });
  assert.equal(noTp.ok, false);
  assert.equal(noTp.saknar_sl_tp, true);

  const ok = validateSele(bound);
  assert.equal(ok.ok, true);
  assert.equal(ok.saknar_sl_tp, false);
  assert.deepEqual(ok.missing, []);
  assert.equal(ok.paper, true);
  assert.equal(ok.live, false);
});

test('ok kräver bara SL/TP — andra tomma celler stannar saknas', () => {
  const r = validateSele({ slPct: 1, tpPct: 2 });
  assert.equal(r.ok, true);
  assert.equal(r.saknar_sl_tp, false);
  assert.ok(r.missing.includes('name'));
  assert.ok(r.missing.includes('volumePct'));
  assert.equal(r.sele.volumePct, '');
  assert.equal(r.sele.name, '');
});

test('applyVolume gissar inte balance; tom stannar saknas', () => {
  const empty = applyVolume('', 1);
  assert.equal(empty.amount, null);
  assert.ok(empty.missing.includes('balance'));
  assert.ok(empty.saknas.includes('balance'));
  assert.equal(empty.raised, false);
  assert.equal(empty.paper, true);

  const none = applyVolume(null, '');
  assert.equal(none.amount, null);
  assert.ok(none.missing.includes('balance'));
  assert.ok(none.missing.includes('volumePct'));
});

test('applyVolume räknar bara när anroparen skickar saldo', () => {
  const r = applyVolume(200, 1);
  assert.equal(r.amount, 2);
  assert.equal(r.appliedPct, 1);
  assert.equal(r.raised, false);
  assert.deepEqual(r.missing, []);
});

test('volym överstiger aldrig pilotens %', () => {
  assert.equal(capVolumePct(5, 1), 1);
  assert.equal(capVolumePct(1, 1), 1);
  assert.equal(capVolumePct('', 1), 1);
  assert.equal(capVolumePct('', ''), '');

  const raisedAttempt = applyVolume(200, 5, 1);
  assert.equal(raisedAttempt.appliedPct, 1);
  assert.equal(raisedAttempt.amount, 2);
  assert.equal(raisedAttempt.raised, false);
  assert.equal(raisedAttempt.capped, true);
  assert.equal(raisedAttempt.requestedPct, 5);
  assert.equal(raisedAttempt.pilotPct, 1);

  const under = applyVolume(200, 0.5, 1);
  assert.equal(under.appliedPct, 0.5);
  assert.equal(under.amount, 1);
  assert.equal(under.capped, false);
});

test('parseSymbols lämnar tom text tom; ROBOT/AIIND/GULDR blandas inte in', () => {
  assert.deepEqual(parseSymbols(''), []);
  assert.deepEqual(parseSymbols('EURUSD; XAUUSD'), ['EURUSD', 'XAUUSD']);
  const s = createSele({ symbols: '' });
  assert.deepEqual(s.symbols, []);
  assert.ok(!s.symbols.includes('ROBOT'));
  assert.ok(!s.symbols.includes('AIIND'));
  assert.ok(!s.symbols.includes('GULDR'));
});

test('tenant-form är white-label, inte bara KS', () => {
  const empty = tenantSeleShape({});
  assert.equal(empty.tenantId, '');
  assert.deepEqual(empty.brands, []);
  assert.deepEqual(empty.assignees, []);
  assert.equal(empty.paper, true);

  const lic = tenantSeleShape({
    id: 'licens-a',
    sele: { brands: ['Exempel'], assignees: ['Pilot'] },
    rules: { paper_default: true },
  });
  assert.equal(lic.tenantId, 'licens-a');
  assert.deepEqual(lic.brands, ['Exempel']);
  const s = createSele({ brand: 'Exempel', assigned: 'Pilot', slPct: 1, tpPct: 2 }, { id: 'licens-a' });
  assert.equal(s.clientFilter.tenantId, 'licens-a');
  assert.equal(s.clientFilter.brand, 'Exempel');
});

test('LIVE_LOCKED stannar true; paper kan inte slås av i createSele', () => {
  assert.equal(LIVE_LOCKED, true);
  const s = createSele({ ...bound, paper: false, live: true });
  assert.equal(s.paper, true);
  assert.equal(s.live, false);
});

test('utkast: tomma rutor fylls inte vid spara/ladda', () => {
  const store = memStore();
  const draft = { ...emptySele(), name: 'A', slPct: '', tpPct: '', volumePct: '' };
  saveSeleDraft(draft, store);
  const loaded = loadSeleDraft(store);
  assert.equal(loaded.name, 'A');
  assert.equal(loaded.slPct, '');
  assert.equal(loaded.tpPct, '');
  assert.equal(loaded.volumePct, '');
});

test('UI: Sele-formulär, paper-badge, inga ForceX-anrop i ytan', () => {
  const page = renderSele(emptySele(), null);
  assert.match(page, /<h2 class="sele-title">Sele<\/h2>/);
  assert.match(page, /PAPER · live=false · ingen mäklare · ingen ForceX/);
  assert.match(page, /id="sele-form"/);
  for (const name of ['name', 'brand', 'assigned', 'symbols', 'side', 'volumePct', 'slPct', 'tpPct']) {
    assert.match(page, new RegExp(`name="${name}"`));
  }
  assert.match(page, /name="skipIfSymbolOpen"/);
  assert.ok(!/forcex\.|crm\.url|fetch\('/i.test(page));
  assert.ok(!/ROBOT|AIIND|GULDR/.test(page) || /inte ROBOT\/AIIND\/GULDR/.test(page));

  const blocked = renderSeleResult(validateSele({}));
  assert.match(blocked, /saknar_sl_tp/);
  assert.match(blocked, /saknas/);

  const ok = renderSeleResult(validateSele(bound));
  assert.match(ok, /Bunden sele/);
  assert.match(ok, /North Investment/);
  assert.match(ok, /EURUSD/);
  assert.match(ok, /ingen ForceX-hämtning/);
  assert.ok(!/saldo|200 kr|fetch\(|crm\.url/i.test(ok));
});
