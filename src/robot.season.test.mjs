import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRobotInput, seasonPlan, computeRobot } from './robot.js';

function plan(raw) {
  return seasonPlan(parseRobotInput(raw));
}

const openKop = {
  instrument: 'OMXS30',
  side: 'köp',
  entry: 100,
  risk: 2,
  rr: 2,
};

test('öppen köp, prognos sälj, prognosRr 2, tempo snabbare → radda, flattenNow true', () => {
  const s = plan({
    ...openKop,
    prognos: 'sälj',
    prognosRr: 2,
    tempo: 'snabbare',
  });
  assert.equal(s.action, 'radda');
  assert.equal(s.flattenNow, true);
  assert.equal(s.reverseTo, 'sälj');
  assert.equal(s.rokad, true);
  assert.equal(s.volymFaktor, 0.75);
  assert.equal(s.nyVolym, null);
  assert.match(s.note, /rokadläge: byt håll, volym/);
  assert.equal(s.paper, true);
  assert.equal(s.advice, false);
});

test('samma men tempo sasong → byt_hall, flattenNow false', () => {
  const s = plan({
    ...openKop,
    prognos: 'sälj',
    prognosRr: 2,
    tempo: 'sasong',
    nastaSasong: '2027',
  });
  assert.equal(s.action, 'byt_hall');
  assert.equal(s.flattenNow, false);
  assert.equal(s.reverseTo, 'sälj');
  assert.equal(s.season, '2027');
  assert.equal(s.rokad, true);
  assert.equal(s.volymFaktor, 0.75);
  assert.equal(s.paper, true);
  assert.equal(s.advice, false);
});

test('öppen köp, prognos köp → halla', () => {
  const s = plan({ ...openKop, prognos: 'köp', prognosRr: 2 });
  assert.equal(s.action, 'halla');
  assert.equal(s.rokad, false);
  assert.equal(s.paper, true);
  assert.equal(s.advice, false);
});

test('blank prognos → ingen', () => {
  const s = plan({ ...openKop, prognos: '', tempo: 'snabbare' });
  assert.equal(s.action, 'ingen');
  assert.equal(s.rokad, false);
  assert.match(s.note, /prognos saknas/);
  assert.equal(s.paper, true);
  assert.equal(s.advice, false);
});

test('motsatt prognos men blank prognosRr → saknar_rr', () => {
  const s = plan({ ...openKop, prognos: 'sälj', prognosRr: '', tempo: 'sasong' });
  assert.equal(s.action, 'saknar_rr');
  assert.equal(s.rokad, false);
  assert.equal(s.paper, true);
  assert.equal(s.advice, false);
});

test('motsatt, prognosRr 1, hallaRr 2 → halla (inte vänd mot sämre RR)', () => {
  const s = plan({
    ...openKop,
    prognos: 'sälj',
    prognosRr: 1,
    hallaRr: 2,
    tempo: 'snabbare',
  });
  assert.equal(s.action, 'halla');
  assert.equal(s.rokad, false);
  assert.match(s.note, /slår inte/);
  assert.equal(s.paper, true);
  assert.equal(s.advice, false);
});

test('computeRobot fäster season även vid ok:false', () => {
  const r = computeRobot({ side: 'köp', prognos: 'sälj', prognosRr: 2, tempo: 'snabbare' });
  assert.equal(r.ok, false);
  assert.equal(r.season.action, 'radda');
  assert.equal(r.season.flattenNow, true);
  assert.equal(r.season.paper, true);
  assert.equal(r.season.advice, false);
});

test('radda med openSize 100 → nyVolym 75, rokad true', () => {
  const s = plan({
    ...openKop,
    prognos: 'sälj',
    prognosRr: 2,
    tempo: 'snabbare',
    openSize: 100,
  });
  assert.equal(s.action, 'radda');
  assert.equal(s.rokad, true);
  assert.equal(s.volymFaktor, 0.75);
  assert.equal(s.nyVolym, 75);
  assert.match(s.note, /rokadläge: byt håll, volym/);
  assert.match(s.note, /ÖB godkänner/);
  assert.match(s.note, /Inte personlig rådgivning/);
});

test('halla → rokad false, ingen volymklippning', () => {
  const s = plan({ ...openKop, prognos: 'köp', openSize: 100 });
  assert.equal(s.action, 'halla');
  assert.equal(s.rokad, false);
  assert.equal(s.nyVolym, undefined);
  assert.notEqual(s.volymFaktor, 0.75);
});

test('vändning med blank volym → rokad true, nyVolym null', () => {
  const s = plan({
    ...openKop,
    prognos: 'sälj',
    prognosRr: 2,
    tempo: 'sasong',
    openSize: '',
  });
  assert.equal(s.action, 'byt_hall');
  assert.equal(s.rokad, true);
  assert.equal(s.volymFaktor, 0.75);
  assert.equal(s.nyVolym, null);
});
