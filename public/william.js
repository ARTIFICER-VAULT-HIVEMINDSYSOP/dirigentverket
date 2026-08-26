import { williamMagazine } from './william-data.js';

const mag = williamMagazine({ session: null, rows: [] });
const lamp = document.getElementById('william-lamp');
const lampText = document.getElementById('william-lamp-text');
const list = document.getElementById('william-list');

if (lamp) {
  lamp.classList.remove('lamp-yellow', 'lamp-gold');
  lamp.classList.add(`lamp-${mag.lamp}`);
}
if (lampText) lampText.textContent = mag.lampText;

if (list && !mag.rows.length) {
  list.innerHTML = `<p class="empty">${mag.emptyText}</p>`;
}
