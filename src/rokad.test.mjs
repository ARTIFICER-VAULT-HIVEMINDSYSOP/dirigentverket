import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recoveryMeasure,
  losingRokad,
  guldRokadRule,
  isGuldRokadAsset,
  ROKAD_MOTSATT_FAKTOR,
} from './rokad.js';
import { computeRobot, parseRobotInput, seasonPlan, structureSignal } from './robot.js';

function rec(raw, struct) {
  const input = parseRobotInput(raw);
  return recoveryMeasure(input, struct || structureSignal(input));
}

test('recovery: tom → known false, ingen rokad', () => {
  const r = rec({ side: 'köp', entry: 100 });
  assert.equal(r.known, false);
  assert.equal(r.kind, null);
  assert.match(r.note, /återhämtning saknas/);
});

test('recovery: prognos-RR ifylld → known true', () => {
  const r = rec({ side: 'köp', prognosRr: 2 });
  assert.equal(r.known, true);
  assert.equal(r.kind, 'prognos_rr');
});

test('recovery: återtagennivå + kurs på rätt sida → known true', () => {
  const r = rec({ side: 'köp', entry: 100, current: 99, reclaim: 98.5 });
  assert.equal(r.known, true);
  assert.equal(r.kind, 'atertag');
});

test('recovery: struktur mot motsatt håll → known true', () => {
  const r = rec({
    side: 'köp',
    rsi: 72,
    bbLower: 98,
    bbUpper: 106,
    current: 105.5,
    bounce: 'övre',
  });
  assert.equal(r.known, true);
  assert.equal(r.kind, 'struktur');
});

test('losingRokad: minus utan återhämtning → rokad false', () => {
  const input = parseRobotInput({ side: 'köp', entry: 100, current: 95, openSize: 100 });
  const s = losingRokad(input, structureSignal(input));
  assert.equal(s.losing, true);
  assert.equal(s.rokad, false);
  assert.equal(s.recovery.known, false);
  assert.match(s.note, /återhämtning saknas/);
  assert.equal(s.paper, true);
});

test('losingRokad: minus + prognos-RR → rokad true, 25 % av volym', () => {
  const input = parseRobotInput({
    side: 'köp',
    entry: 100,
    current: 95,
    prognosRr: 2,
    openSize: 100,
  });
  const s = losingRokad(input, structureSignal(input));
  assert.equal(s.rokad, true);
  assert.equal(s.losing, true);
  assert.equal(s.reverseTo, 'sälj');
  assert.equal(s.volymFaktor, ROKAD_MOTSATT_FAKTOR);
  assert.equal(s.volymFaktor, 0.25);
  assert.equal(s.nyVolym, 25);
  assert.equal(s.advice, false);
});

test('losingRokad: inte minus → ingen rokad', () => {
  const input = parseRobotInput({ side: 'köp', entry: 100, current: 102, prognosRr: 2 });
  const s = losingRokad(input, structureSignal(input));
  assert.equal(s.rokad, false);
  assert.equal(s.losing, false);
});

test('losingRokad: kurs saknas → ingen rokad, losing null', () => {
  const input = parseRobotInput({ side: 'köp', entry: 100, prognosRr: 2 });
  const s = losingRokad(input, structureSignal(input));
  assert.equal(s.rokad, false);
  assert.equal(s.losing, null);
  assert.match(s.note, /saknas/);
});

test('säsongsvändning behåller 0,75 när prognos-RR finns (befintlig regel)', () => {
  const s = seasonPlan(
    parseRobotInput({
      side: 'köp',
      prognos: 'sälj',
      prognosRr: 2,
      tempo: 'snabbare',
      openSize: 100,
    }),
  );
  assert.equal(s.action, 'radda');
  assert.equal(s.rokad, true);
  assert.equal(s.volymFaktor, 0.75);
  assert.equal(s.nyVolym, 75);
  assert.equal(s.recovery.known, true);
});

test('GULDR är tillåten rokad-tillgång; tom historik påstår inte avkastning', () => {
  assert.equal(isGuldRokadAsset('GULDR'), true);
  assert.equal(isGuldRokadAsset('guld'), true);
  assert.equal(isGuldRokadAsset('gold'), true);
  assert.equal(isGuldRokadAsset('OMXS30'), false);
  const g = guldRokadRule({ instrument: 'GULDR', guldHistorik: '' });
  assert.equal(g.allowed, true);
  assert.equal(g.delayedMonths, 8);
  assert.equal(g.historikSaknas, true);
  assert.match(g.note, /8 månader/);
  assert.match(g.note, /påstår inte uppmätt avkastning/);
  assert.equal(g.paper, true);
});

test('guld-väntan är konfigurerbar; tom = 8, ingen påhittad historik', () => {
  const g = guldRokadRule({ instrument: 'guld', guldVantanManader: '10', guldHistorik: '' });
  assert.equal(g.delayedMonths, 10);
  assert.equal(g.historikSaknas, true);
});

test('computeRobot fäster rokad+guld; OMXS30 är inte guld', () => {
  const r = computeRobot({
    instrument: 'OMXS30',
    side: 'köp',
    entry: 100,
    current: 95,
    risk: 2,
    rr: 2,
  });
  assert.equal(r.rokad.rokad, false);
  assert.equal(r.rokad.losing, true);
  assert.equal(r.gold.allowed, false);
});

test('computeRobot GULDR + minus + återhämtning → rokad 25 %', () => {
  const r = computeRobot({
    instrument: 'GULDR',
    side: 'köp',
    entry: 100,
    current: 95,
    risk: 2,
    rr: 2,
    prognosRr: 2,
    openSize: 80,
  });
  assert.equal(r.gold.allowed, true);
  assert.equal(r.rokad.rokad, true);
  assert.equal(r.rokad.nyVolym, 20);
  assert.match(r.gold.note, /fördröjd belöning/);
});
