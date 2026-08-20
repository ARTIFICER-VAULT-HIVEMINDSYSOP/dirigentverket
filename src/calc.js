/**
 * Live calculators — per project and portfolio.
 * All money in SEK, shares as decimals (0.08 = 8 %).
 */

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function parseIso(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function durationDays(start, slut) {
  const a = parseIso(start);
  const b = parseIso(slut);
  if (!a || !b) return 0;
  const diff = Math.round((b - a) / 86400000);
  return diff >= 0 ? diff + 1 : 0;
}

export function overlapDays(a, b) {
  const a1 = parseIso(a.start);
  const a2 = parseIso(a.slut);
  const b1 = parseIso(b.start);
  const b2 = parseIso(b.slut);
  if (!a1 || !a2 || !b1 || !b2) return 0;
  const start = a1 > b1 ? a1 : b1;
  const end = a2 < b2 ? a2 : b2;
  if (end < start) return 0;
  return Math.round((end - start) / 86400000) + 1;
}

export function projectMetrics(p) {
  const budget = n(p.budget_sek);
  const kostnad = n(p.kostnad_sek);
  const yta = n(p.yta_m2);
  const avvikelse = kostnad - budget;
  const avvikelse_pct = budget !== 0 ? avvikelse / budget : 0;
  const m2_pris = yta > 0 ? kostnad / yta : 0;
  const tackningsbidrag = budget - kostnad;
  const marginal_pct = budget !== 0 ? tackningsbidrag / budget : 0;
  const duration_days = durationDays(p.start, p.slut);
  const risk = avvikelse_pct > 0.08;
  return {
    budget,
    kostnad,
    yta,
    avvikelse,
    avvikelse_pct,
    m2_pris,
    tackningsbidrag,
    marginal_pct,
    duration_days,
    risk,
  };
}

/**
 * Calendar days where two or more projects are simultaneously active,
 * plus pairwise overlap sum and peak concurrency.
 */
export function overlappingAcross(projects) {
  const ranges = projects
    .map((p) => ({ a: parseIso(p.start), b: parseIso(p.slut) }))
    .filter((r) => r.a && r.b && r.b >= r.a);
  if (ranges.length < 2) {
    return { concurrentDays: 0, pairwiseSum: 0, maxConcurrent: ranges.length, pairCount: 0 };
  }

  let min = ranges[0].a;
  let max = ranges[0].b;
  for (const r of ranges) {
    if (r.a < min) min = r.a;
    if (r.b > max) max = r.b;
  }

  let concurrentDays = 0;
  let maxConcurrent = 0;
  const dayMs = 86400000;
  const startUtc = Date.UTC(min.getFullYear(), min.getMonth(), min.getDate());
  const endUtc = Date.UTC(max.getFullYear(), max.getMonth(), max.getDate());
  for (let t = startUtc; t <= endUtc; t += dayMs) {
    let c = 0;
    for (const r of ranges) {
      const ra = Date.UTC(r.a.getFullYear(), r.a.getMonth(), r.a.getDate());
      const rb = Date.UTC(r.b.getFullYear(), r.b.getMonth(), r.b.getDate());
      if (t >= ra && t <= rb) c += 1;
    }
    if (c > maxConcurrent) maxConcurrent = c;
    if (c >= 2) concurrentDays += 1;
  }

  let pairwiseSum = 0;
  let pairCount = 0;
  for (let i = 0; i < projects.length; i++) {
    for (let j = i + 1; j < projects.length; j++) {
      const d = overlapDays(projects[i], projects[j]);
      if (d > 0) {
        pairwiseSum += d;
        pairCount += 1;
      }
    }
  }

  return { concurrentDays, pairwiseSum, maxConcurrent, pairCount };
}

export function portfolioMetrics(projects) {
  const list = Array.isArray(projects) ? projects : [];
  let budget = 0;
  let kostnad = 0;
  let yta = 0;
  let riskCount = 0;
  const byTyp = {};

  for (const p of list) {
    const m = projectMetrics(p);
    budget += m.budget;
    kostnad += m.kostnad;
    yta += m.yta;
    if (m.risk) riskCount += 1;
    const typ = p.typ || 'övrigt';
    if (!byTyp[typ]) {
      byTyp[typ] = { typ, antal: 0, budget: 0, kostnad: 0, yta: 0, avvikelse: 0 };
    }
    const row = byTyp[typ];
    row.antal += 1;
    row.budget += m.budget;
    row.kostnad += m.kostnad;
    row.yta += m.yta;
    row.avvikelse += m.avvikelse;
  }

  const avvikelse = kostnad - budget;
  const avvikelse_pct = budget !== 0 ? avvikelse / budget : 0;
  const viktat_m2_pris = yta > 0 ? kostnad / yta : 0;
  const tackningsbidrag = budget - kostnad;
  const marginal_pct = budget !== 0 ? tackningsbidrag / budget : 0;
  const overlap = overlappingAcross(list);
  const riskFlag = riskCount > 0;

  for (const row of Object.values(byTyp)) {
    row.avvikelse_pct = row.budget !== 0 ? row.avvikelse / row.budget : 0;
    row.m2_pris = row.yta > 0 ? row.kostnad / row.yta : 0;
  }

  return {
    antal: list.length,
    budget,
    kostnad,
    yta,
    avvikelse,
    avvikelse_pct,
    viktat_m2_pris,
    tackningsbidrag,
    marginal_pct,
    byTyp,
    overlap,
    riskFlag,
    riskCount,
  };
}
