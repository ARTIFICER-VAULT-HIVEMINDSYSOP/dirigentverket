import { SEED_PROJECTS } from './seed.js';

export const STORAGE_KEY = 'dirigentverket.kluster.v1';

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function normalizeProject(p, index) {
  return {
    id: String(p.id || `p-${index}-${Date.now()}`),
    namn: String(p.namn || 'Namnlös verksamhet'),
    typ: p.typ || 'kapital',
    plats: String(p.plats || ''),
    status: p.status || 'utredning',
    yta_m2: Number(p.yta_m2) || 0,
    budget_sek: Number(p.budget_sek) || 0,
    kostnad_sek: Number(p.kostnad_sek) || 0,
    start: p.start || '',
    slut: p.slut || '',
    besättning: Number(p.besättning) || 0,
    kompetens: Array.isArray(p.kompetens) ? p.kompetens.map(String) : [],
    leverantörer: Array.isArray(p.leverantörer) ? p.leverantörer.map(String) : [],
    material: Array.isArray(p.material) ? p.material.map(String) : [],
    anteckningar: String(p.anteckningar || ''),
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length) {
        return {
          projects: parsed.projects.map(normalizeProject),
          selectedId: parsed.selectedId || parsed.projects[0].id,
        };
      }
    }
  } catch {
    // Corrupt storage — fall back to seed.
  }
  return {
    projects: clone(SEED_PROJECTS).map(normalizeProject),
    selectedId: SEED_PROJECTS[0].id,
  };
}

export function saveState(state) {
  const payload = {
    projects: state.projects.map(normalizeProject),
    selectedId: state.selectedId || null,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function resetToSeed() {
  const state = {
    projects: clone(SEED_PROJECTS).map(normalizeProject),
    selectedId: SEED_PROJECTS[0].id,
  };
  saveState(state);
  return state;
}

export function newProjectDraft() {
  return {
    id: `p-${Date.now().toString(36)}`,
    namn: '',
    typ: 'kapital',
    plats: '',
    status: 'utredning',
    yta_m2: 0,
    budget_sek: 0,
    kostnad_sek: 0,
    start: '',
    slut: '',
    besättning: 0,
    kompetens: [],
    leverantörer: [],
    material: [],
    anteckningar: '',
  };
}
