/**
 * Seed — Daniels första vinstdrivande kluster.
 * Inga belopp, elevtal, AUM eller affärsvolymer. Bara namn och roller.
 */

export const SEED_PROJECTS = [
  {
    id: 'kapital-strategi',
    namn: 'Kapital och Strategi',
    typ: 'kapital',
    plats: '',
    status: 'utredning',
    yta_m2: 0,
    budget_sek: 0,
    kostnad_sek: 0,
    start: '',
    slut: '',
    besättning: 0,
    kompetens: ['kapital', 'rådgivning', 'strategi'],
    leverantörer: ['kapitalstrategi.com'],
    material: [],
    anteckningar:
      'Nod för kapital, rådgivning och strategi. Domän som används i git: kapitalstrategi.com. Inga belopp, AUM eller resultat är inlagda — fyll i när utfall finns.',
  },
  {
    id: 'tradingskolan',
    namn: 'Tradingskolan',
    typ: 'utbildning',
    plats: '',
    status: 'utredning',
    yta_m2: 0,
    budget_sek: 0,
    kostnad_sek: 0,
    start: '',
    slut: '',
    besättning: 0,
    kompetens: ['utbildning', 'marknadsdata'],
    leverantörer: [],
    material: ['marknadsdata', 'elevunderlag'],
    anteckningar:
      'Utbildning och R&D-yta. Elever och marknadsdata in. Inga elevtal, kursintäkter eller datavolymer är inlagda.',
  },
  {
    id: 'fastigheterutomlands',
    namn: 'Fastigheterutomlands',
    typ: 'fastighet',
    plats: '',
    status: 'utredning',
    yta_m2: 0,
    budget_sek: 0,
    kostnad_sek: 0,
    start: '',
    slut: '',
    besättning: 0,
    kompetens: ['fastighet'],
    leverantörer: [],
    material: [],
    anteckningar:
      'Fastigheter utanför Sverige. Inga affärer, objekt, värderingar eller volymer är inlagda.',
  },
  {
    id: 'north-investments',
    namn: 'North Investments LTD',
    typ: 'investering',
    plats: '',
    status: 'utredning',
    yta_m2: 0,
    budget_sek: 0,
    kostnad_sek: 0,
    start: '',
    slut: '',
    besättning: 0,
    kompetens: ['investeringsfordon', 'struktur'],
    leverantörer: [],
    material: [],
    anteckningar:
      'Investeringsfordon / struktur. Jurisdiktion och bolagsnummer är inte verifierade i den här boken. Påstå inte hemvist eller registreringsnummer utan kontroll.',
  },
];

export const TYP_LABEL = {
  kapital: 'Kapital',
  utbildning: 'Utbildning',
  fastighet: 'Fastighet',
  investering: 'Investering',
};

export const STATUS_LABEL = {
  utredning: 'Utredning',
  aktiv: 'Aktiv',
  paus: 'Paus',
};

export const TYP_OPTIONS = ['kapital', 'utbildning', 'fastighet', 'investering'];
export const STATUS_OPTIONS = ['utredning', 'aktiv', 'paus'];

export const KOMPETENS_SUGGESTIONS = [
  'kapital',
  'rådgivning',
  'strategi',
  'utbildning',
  'marknadsdata',
  'fastighet',
  'investeringsfordon',
  'struktur',
];
