/**
 * Synergy engine — detects samordning between projects in the portfolio.
 * Each finding has title, projects, kind, Swedish explanation, estimated_sek, confidence.
 */

import { overlapDays } from './calc.js';

const KIND_LABEL = {
  logistik: 'Logistik & etablering',
  inkop: 'Samordnat inköp',
  material: 'Gemensamt material',
  besattning: 'Delad besättning',
  infrastruktur: 'Infrastruktur möjliggör',
};

export { KIND_LABEL };

/** Clusters treated as nearby for logistics and crew sharing. */
const NEARBY_CLUSTERS = [
  ['stockholm', 'solna', 'sundbyberg', 'årsta', 'arsta', 'hammarby'],
  ['göteborg', 'goteborg', 'mölndal', 'molndal'],
];

const MATERIAL_SHARE = {
  bostäder: 0.38,
  kontor: 0.35,
  infrastruktur: 0.42,
  ROT: 0.32,
  anläggning: 0.4,
};

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/stad$/, '')
    .replace(/\s+/g, ' ');
}

function keyName(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function isNearby(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  for (const cluster of NEARBY_CLUSTERS) {
    if (cluster.includes(na) && cluster.includes(nb)) return true;
  }
  return false;
}

function joinNames(projects) {
  const names = projects.map((p) => p.namn);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} och ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} och ${names[names.length - 1]}`;
}

function orter(projects) {
  const unique = [...new Set(projects.map((p) => p.plats).filter(Boolean))];
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} och ${unique[1]}`;
  return unique.join(', ');
}

function materialCost(p) {
  const share = MATERIAL_SHARE[p.typ] ?? 0.36;
  return (Number(p.kostnad_sek) || 0) * share;
}

function overlapMaterialCost(projects, sharedItems) {
  const costs = projects.map((p) => {
    const mats = (p.material || []).map(keyName);
    const total = materialCost(p);
    if (!mats.length) return total * 0.35;
    if (!sharedItems || !sharedItems.length) return total * 0.45;
    const hit = sharedItems.filter((s) => mats.includes(keyName(s))).length;
    const ratio = Math.min(1, hit / mats.length);
    return total * Math.max(0.2, ratio);
  });
  costs.sort((a, b) => a - b);
  // Overlapping volume ≈ sum of all but the largest (the "extra" volume that can be bundled).
  // For two projects use the smaller; for more, sum of the smaller ones.
  if (costs.length <= 1) return costs[0] || 0;
  return costs.slice(0, -1).reduce((s, v) => s + v, 0);
}

function rebateRate(nProjects) {
  if (nProjects >= 4) return 0.08;
  if (nProjects === 3) return 0.06;
  return 0.05;
}

function listJoin(arr) {
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]} och ${arr[1]}`;
  return `${arr.slice(0, -1).join(', ')} och ${arr[arr.length - 1]}`;
}

function sharedKompetens(a, b) {
  const sa = new Set((a.kompetens || []).map(keyName));
  return (b.kompetens || []).filter((k) => sa.has(keyName(k)));
}

function complementaryKompetens(a, b) {
  const sa = new Set((a.kompetens || []).map(keyName));
  return (b.kompetens || []).filter((k) => !sa.has(keyName(k)));
}

function confidenceForDistance(projects, overlappingDates) {
  const allNearby = projects.every((p) => projects.every((q) => isNearby(p.plats, q.plats)));
  if (allNearby && overlappingDates) return 'hög';
  if (allNearby) return 'medel';
  if (overlappingDates) return 'medel';
  return 'låg';
}

function datesOverlapAny(projects) {
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      if (overlapDays(projects[i], projects[j]) > 0) return true;
    }
  }
  return false;
}

function clusterProjects(projects) {
  const unused = projects.map((_, i) => i);
  const clusters = [];
  while (unused.length) {
    const seed = unused.shift();
    const group = [projects[seed]];
    let changed = true;
    while (changed) {
      changed = false;
      for (let u = unused.length - 1; u >= 0; u--) {
        const p = projects[unused[u]];
        if (group.some((g) => isNearby(g.plats, p.plats))) {
          group.push(p);
          unused.splice(u, 1);
          changed = true;
        }
      }
    }
    clusters.push(group);
  }
  return clusters.filter((c) => c.length >= 2);
}

export function detectSynergies(projects) {
  const findings = [];
  const list = Array.isArray(projects) ? projects : [];
  if (list.length < 2) return findings;
  let seq = 0;
  const id = (kind) => `${kind}-${++seq}`;

  // --- 1. Nearby / same ort: logistics & shared establishment ---
  for (const cluster of clusterProjects(list)) {
    const sameOrt = cluster.every((p) => norm(p.plats) === norm(cluster[0].plats));
    const costs = cluster.map((p) => Number(p.kostnad_sek) || 0).sort((a, b) => a - b);
    const smallerSum = costs.slice(0, -1).reduce((s, v) => s + v, 0);
    const rate = cluster.length >= 3 ? 0.018 : 0.012;
    const estimated = Math.round(smallerSum * rate);
    const dates = datesOverlapAny(cluster);
    findings.push({
      id: id('logistik'),
      kind: 'logistik',
      title: sameOrt
        ? `Gemensam etablering i ${cluster[0].plats}`
        : `Logistiknod ${orter(cluster)}`,
      projectIds: cluster.map((p) => p.id),
      projectNames: cluster.map((p) => p.namn),
      estimated_sek: estimated,
      confidence: dates ? 'hög' : 'medel',
      explanation: sameOrt
        ? `${joinNames(cluster)} ligger alla i ${cluster[0].plats} med överlappande eller närliggande produktion. En gemensam etablering — bodar, kran, masshantering och intransport — minskar dubbla uppställningsytor och körningar. Uppskattningen motsvarar cirka ${(rate * 100).toFixed(1).replace('.', ',')} % av de mindre projektens kostnad, vilket är en återhållsam andel av etableringsposten.`
        : `${joinNames(cluster)} ligger i samma storstadsnod (${orter(cluster)}). Stockholm, Solna och Sundbyberg behandlas som närliggande; Göteborg och Mölndal likaså. Gemensam logistikplan, samordnad masshantering och delad etablering ger färre transporter och lägre stillestånd. Uppskattad vinst: ${(rate * 100).toFixed(1).replace('.', ',')} % av de mindre uppdragens kostnad.`,
    });
  }

  // --- 2. Shared leverantör: coordinated purchasing ---
  const byLev = new Map();
  for (const p of list) {
    for (const lev of p.leverantörer || []) {
      const k = keyName(lev);
      if (!k) continue;
      if (!byLev.has(k)) byLev.set(k, { label: lev.trim(), projects: [] });
      const row = byLev.get(k);
      if (!row.projects.some((x) => x.id === p.id)) row.projects.push(p);
    }
  }
  for (const { label, projects: group } of byLev.values()) {
    if (group.length < 2) continue;
    const sharedMats = sharedAcross(group, 'material');
    const overlapCost = overlapMaterialCost(group, sharedMats);
    const rate = rebateRate(group.length);
    const estimated = Math.round(overlapCost * rate);
    const nearby = group.every((p) => group.every((q) => isNearby(p.plats, q.plats)));
    const matText = sharedMats.length
      ? ` Gemensamma material i avropen: ${listJoin(sharedMats)}.`
      : '';
    findings.push({
      id: id('inkop'),
      kind: 'inkop',
      title: `Samordnat inköp via ${label}`,
      projectIds: group.map((p) => p.id),
      projectNames: group.map((p) => p.namn),
      estimated_sek: estimated,
      confidence: confidenceForDistance(group, datesOverlapAny(group)),
      explanation: `${joinNames(group)} avropar alla mot ${label}.${matText} ${
        nearby
          ? 'Projekten ligger i samma geografi, så leveranser kan slås ihop och lagernivåer hållas gemensamma.'
          : 'Orterna ligger isär, men ett gemensamt ramavtal ger volymrabatt, en priskorg och samordnad expediering mot fabrik.'
      } Besparingen är beräknad till ${Math.round(rate * 100)} % av den överlappande materialkostnaden — inom spannet 4–8 % som volymsamordning brukar ge.`,
    });
  }

  // --- 3. Shared material (3+ projects) not already a single-supplier story ---
  const byMat = new Map();
  for (const p of list) {
    for (const mat of p.material || []) {
      const k = keyName(mat);
      if (!k) continue;
      if (!byMat.has(k)) byMat.set(k, { label: mat.trim(), projects: [] });
      const row = byMat.get(k);
      if (!row.projects.some((x) => x.id === p.id)) row.projects.push(p);
    }
  }
  for (const { label, projects: group } of byMat.values()) {
    if (group.length < 3) continue;
    const overlapCost = overlapMaterialCost(group, [label]);
    const rate = rebateRate(group.length);
    const estimated = Math.round(overlapCost * rate);
    findings.push({
      id: id('material'),
      kind: 'material',
      title: `Gemensamt material: ${label}`,
      projectIds: group.map((p) => p.id),
      projectNames: group.map((p) => p.namn),
      estimated_sek: estimated,
      confidence: confidenceForDistance(group, datesOverlapAny(group)),
      explanation: `${joinNames(group)} använder alla ${label} under 2026–2028. Ett portföljinköp — gemensam priskorg, leveransfönster och eventuell mellanlagring — minskar spill och toppbelastning hos leverantören. Uppskattad effekt ${Math.round(rate * 100)} % på den del av materialkostnaden som kan slås ihop.`,
    });
  }

  // --- 4. Overlapping dates + same/complementary kompetens, nearby only ---
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (!isNearby(a.plats, b.plats)) continue;
      const days = overlapDays(a, b);
      if (days < 14) continue;
      const shared = sharedKompetens(a, b);
      const extra = complementaryKompetens(a, b).concat(complementaryKompetens(b, a));
      if (!shared.length && !extra.length) continue;
      const crewA = Number(a.besättning) || 0;
      const crewB = Number(b.besättning) || 0;
      const shareable = Math.min(crewA, crewB) * 0.22;
      const dayRate = 3800; // kr per person-day, blended
      const estimated = Math.round(shareable * dayRate * days * 0.35);
      const kindWord = shared.length
        ? `samma kompetens (${listJoin(shared)})`
        : `kompletterande kompetens`;
      findings.push({
        id: id('besattning'),
        kind: 'besattning',
        title: `Dela besättning: ${a.namn} · ${b.namn}`,
        projectIds: [a.id, b.id],
        projectNames: [a.namn, b.namn],
        estimated_sek: estimated,
        confidence: shared.length ? 'hög' : 'medel',
        explanation: `${a.namn} (${a.plats}, ${crewA} personer) och ${b.namn} (${b.plats}, ${crewB} personer) överlappar ${days} dagar och har ${kindWord}. Eftersom uppdragen ligger nära varandra kan en gemensam resurspool — särskilt ${listJoin(shared.length ? shared : extra.slice(0, 3))} — flyttas mellan arbetsplatserna i stället för att nyanställas eller stå still. Värdet är beräknat på cirka 22 % av den mindre besättningen, 35 % utnyttjande under överlappet och 3 800 kr per persondag.`,
      });
    }
  }

  // --- 5. Infrastructure that enables housing/office nearby ---
  const infra = list.filter((p) => p.typ === 'infrastruktur');
  const enabled = list.filter((p) => p.typ === 'bostäder' || p.typ === 'kontor');
  for (const inf of infra) {
    for (const tgt of enabled) {
      if (!isNearby(inf.plats, tgt.plats)) continue;
      const value = Math.round((Number(tgt.budget_sek) || 0) * 0.012);
      findings.push({
        id: id('infra'),
        kind: 'infrastruktur',
        title: `${inf.namn} möjliggör ${tgt.namn}`,
        projectIds: [inf.id, tgt.id],
        projectNames: [inf.namn, tgt.namn],
        estimated_sek: value,
        confidence: 'medel',
        explanation: `${inf.namn} i ${inf.plats} är infrastruktur i samma nod som ${tgt.namn} (${tgt.plats}). Ny spårväg, väg eller VA-kapacitet sänker lägesrisken och kan tidigarelägga inflyttning — vilket slår igenom i kalkylen som högre genomförbarhet och lägre sälj-/uthyrningsosäkerhet. Värdet är schabloniserat till 1,2 % av bostads-/kontorsbudgeten, som en utredningspost snarare än en kassabesparing.`,
      });
    }
  }

  findings.sort((a, b) => b.estimated_sek - a.estimated_sek);
  return findings;
}

function sharedAcross(projects, field) {
  if (!projects.length) return [];
  const counts = new Map();
  for (const p of projects) {
    const seen = new Set();
    for (const item of p[field] || []) {
      const k = keyName(item);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      if (!counts.has(k)) counts.set(k, { label: item.trim(), n: 0 });
      counts.get(k).n += 1;
    }
  }
  return [...counts.values()].filter((x) => x.n === projects.length).map((x) => x.label);
}

export function totalSynergyValue(findings) {
  return findings.reduce((s, f) => s + (Number(f.estimated_sek) || 0), 0);
}
