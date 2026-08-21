/**
 * Synergy engine — qualitative hypoteser for this cluster.
 * estimated_sek is 0 until budget/kostnad is filled in. Never invent savings.
 */

function keyName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function matchesAny(p, hints) {
  const id = keyName(p.id);
  const namn = keyName(p.namn);
  const typ = keyName(p.typ);
  return hints.some((h) => {
    const n = keyName(h);
    return id === n || id.includes(n) || namn.includes(n) || typ === n;
  });
}

function pick(list, hints) {
  return list.filter((p) => matchesAny(p, hints));
}

function finding({ id, kind, title, projects, explanation, confidence = 'medel' }) {
  return {
    id,
    kind,
    title,
    projectIds: projects.map((p) => p.id),
    projectNames: projects.map((p) => p.namn),
    estimated_sek: 0,
    confidence,
    explanation,
  };
}

const KIND_LABEL = {
  flode: 'Flöde',
  struktur: 'Struktur',
  aterkoppling: 'Återkoppling',
  datayta: 'Datayta',
  fordon: 'Fordon',
};

export { KIND_LABEL };

export function detectSynergies(projects) {
  const list = Array.isArray(projects) ? projects : [];
  const findings = [];

  const kapital = pick(list, ['kapital-strategi', 'kapital och strategi', 'kapital']);
  const skola = pick(list, ['tradingskolan', 'utbildning']);
  const fastighet = pick(list, ['fastigheterutomlands', 'fastighet']);
  const north = pick(list, ['north-investments', 'north investments']);

  if (skola.length && kapital.length) {
    const group = [...skola, ...kapital];
    findings.push(
      finding({
        id: 'flode-skola-kapital',
        kind: 'flode',
        title: 'Tradingskolan matar Kapital och Strategi',
        projects: group,
        confidence: 'medel',
        explanation:
          'Hypotes: elever och marknadsdata som kommer in i Tradingskolan kan, om de delas vidare, ge Kapital och Strategi underlag för rådgivning och strategi. Det är inte ett belagt flöde i boken — bara en möjlig riktning att utreda. Inget belopp är satt; fyll i utfall innan någon vinst räknas.',
      })
    );
  }

  if (kapital.length && north.length && fastighet.length) {
    const group = [...kapital, ...north, ...fastighet];
    findings.push(
      finding({
        id: 'struktur-kapital-north-fastighet',
        kind: 'struktur',
        title: 'Kapital och Strategi och North Investments strukturerar Fastigheterutomlands',
        projects: group,
        confidence: 'medel',
        explanation:
          'Hypotes: kapital- och strateginoden tillsammans med North Investments som fordon kan användas för att strukturera fastighetsaffärer utanför Sverige. Jurisdiktion och avtal är inte verifierade här. Utförare får utreda och föreslå, inte binda pengar eller avtal. Inget belopp.',
      })
    );
  }

  if (fastighet.length && skola.length) {
    const group = [...fastighet, ...skola];
    findings.push(
      finding({
        id: 'case-fastighet-skola',
        kind: 'aterkoppling',
        title: 'Fastighetsaffärer blir case till Tradingskolan',
        projects: group,
        confidence: 'medel',
        explanation:
          'Hypotes: fastighetsaffärer kan återföras som undervisnings- och R&D-case till Tradingskolan. Inga affärer, objekt eller elevtal är inlagda. Hypotesen gäller flödet tillbaka in i utbildningen, inte ett utfall. Inget belopp är satt.',
      })
    );
  }

  if (list.length >= 2) {
    findings.push(
      finding({
        id: 'datayta-dirigentverket',
        kind: 'datayta',
        title: 'Gemensam datayta i Dirigentverket',
        projects: list,
        confidence: 'hög',
        explanation:
          'Hypotes: verksamheterna vinner på en gemensam yta för anteckningar, kanaler och datakällor i stället för att hålla samma underlag i flera böcker. Dirigentverket är den ytan. Inga volymer eller besparingar är räknade — det här är struktur, inte bokföring.',
      })
    );
  }

  const others = list.filter((p) => !north.some((n) => n.id === p.id));
  if (north.length && others.length) {
    findings.push(
      finding({
        id: 'fordon-north',
        kind: 'fordon',
        title: 'North Investments som fordon för mer än en verksamhet',
        projects: [...north, ...others],
        confidence: 'medel',
        explanation:
          'Hypotes: North Investments LTD kan, som investeringsfordon, bära mer än en verksamhet — inte bara Fastigheterutomlands. Bolagsform och hemvist är inte kontrollerade i den här boken. Påstå inte registreringsnummer. Inget belopp är satt.',
      })
    );
  }

  return findings;
}

export function totalSynergyValue(findings) {
  return findings.reduce((s, f) => s + (Number(f.estimated_sek) || 0), 0);
}
