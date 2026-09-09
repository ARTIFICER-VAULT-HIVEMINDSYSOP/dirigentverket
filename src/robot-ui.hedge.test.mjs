import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeRobot } from './robot.js';
import { renderRobot, renderRobotResult } from './robot-ui.js';

test('renderRobotResult: ingen serie → ingen frekvensruta', () => {
  const html = renderRobotResult(
    computeRobot({ instrument: 'OMXS30', entry: 100, risk: 2, rr: 2 }),
  );
  assert.equal(html.includes('Frekvens'), false);
  assert.equal(html.includes('Mitt-hedge'), false);
});

test('renderRobotResult: tillräckliga svängar → frekvens och mitt-hedge-plan', () => {
  const html = renderRobotResult(
    computeRobot({
      instrument: 'OMXS30',
      entry: 105,
      risk: 2,
      rr: 2,
      bbLower: 100,
      bbUpper: 110,
      priceSeries: '100\n110\n100\n110',
    }),
  );
  assert.match(html, /Frekvens/);
  assert.match(html, /Svängar/);
  assert.match(html, /Mitt-hedge/);
  assert.match(html, /köp \+ sälj/);
  assert.match(html, /Köp SL \/ TP/);
  assert.match(html, /Sälj SL \/ TP/);
});

test('renderRobot visar kursserie-fält', () => {
  const html = renderRobot({ priceSeries: '100\n110', minFrequency: '3', side: 'köp' }, null);
  assert.match(html, /Kursserie/);
  assert.match(html, /name="priceSeries"/);
  assert.match(html, /Minsta svängfrekvens/);
  assert.match(html, /name="minFrequency"/);
});

test('renderRobotResult: minus utan återhämtning → rokad blockerad', () => {
  const html = renderRobotResult(
    computeRobot({
      instrument: 'OMXS30',
      entry: 100,
      current: 95,
      risk: 2,
      rr: 2,
    }),
  );
  assert.match(html, /Rokad/);
  assert.match(html, /återhämtning saknas/);
  assert.equal(html.includes('25 % av ifylld'), false);
});

test('renderRobotResult: GULDR visar väntan utan påstådd avkastning', () => {
  const html = renderRobotResult(
    computeRobot({
      instrument: 'GULDR',
      entry: 100,
      risk: 2,
      rr: 2,
    }),
  );
  assert.match(html, /Guld/);
  assert.match(html, /påstår inte uppmätt avkastning/);
});
