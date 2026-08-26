import {
  LUCKOR_SNAPSHOT,
  todayEmpties,
  tomorrowEmpties,
  suggestions,
} from './luckor-data.js';

const chipsEl = document.getElementById('chips');
const detailEl = document.getElementById('detail');
const pillsEl = document.getElementById('pills');
const stampEl = document.getElementById('stamp');

const chips = suggestions();
const today = todayEmpties();
const tomorrow = tomorrowEmpties();

let selected = chips[0].id;

function renderChips() {
  chipsEl.innerHTML = chips
    .map(
      (c) => `
      <button type="button" class="suggest${c.id === selected ? ' is-on' : ''}" data-id="${c.id}" aria-pressed="${c.id === selected}">
        ${c.label}
      </button>`
    )
    .join('');
}

function renderDetail() {
  const chip = chips.find((c) => c.id === selected);
  if (!chip) {
    detailEl.innerHTML = '';
    return;
  }
  if (chip.example) {
    const ex = chip.example;
    detailEl.innerHTML = `
      <p class="hint">${chip.lede}</p>
      <div class="example">
        <p class="who">${ex.namn}</p>
        <p class="meta">ForceX ${ex.forcex} · sista kommentar ${ex.kommentar}</p>
        <p class="meta">${ex.note}</p>
      </div>`;
    return;
  }
  detailEl.innerHTML = `<p class="hint">${chip.lede}</p>`;
}

function renderPills() {
  const items = [
    ...today.map((t) => ({ t, day: 'idag' })),
    ...tomorrow.map((t) => ({ t, day: 'tor' })),
  ];
  pillsEl.innerHTML = items
    .map((x) => `<span class="pill">${x.t}<small>${x.day}</small></span>`)
    .join('');
}

chipsEl.addEventListener('click', (ev) => {
  const btn = ev.target.closest('[data-id]');
  if (!btn) return;
  selected = btn.getAttribute('data-id');
  renderChips();
  renderDetail();
});

stampEl.textContent = `Kalender ${LUCKOR_SNAPSHOT.calendar} · avläst ${LUCKOR_SNAPSHOT.verifiedLabel} · paper`;

renderChips();
renderDetail();
renderPills();
