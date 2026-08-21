/** External news modules. Feed images are untrusted and never become the hero. */

export const STORAGE_KEY = 'dirigentverket.news.v1';

export const NEWS_KALLOR = ['egen', 'unsplash', 'pexels', 'wikimedia'];

const CORS_ERROR = 'Feed kunde inte hämtas (CORS). Klistra in manuellt.';

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function nid() {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyBild() {
  return { status: 'saknas', kalla: '', credit: '', license: '', src: '' };
}

export function emptyItem() {
  return {
    id: nid(),
    title: '',
    lead: '',
    link: '',
    published: '',
    feedImage: '',
    bild: emptyBild(),
  };
}

export function seedModules() {
  return [
    { id: 'ks-utskick', namn: 'Kapital och Strategi', typ: 'manuell', url: '', verksamhet: 'kapital-strategi', items: [] },
    { id: 'ts-marknad', namn: 'Tradingskolan', typ: 'rss', url: '', verksamhet: 'tradingskolan', items: [] },
    { id: 'fu-extern', namn: 'Fastigheterutomlands', typ: 'rss', url: '', verksamhet: 'fastigheterutomlands', items: [] },
    { id: 'extern', namn: 'Extern feed', typ: 'rss', url: '', verksamhet: '', items: [] },
  ];
}

function normalizeBild(b) {
  const bild = b && typeof b === 'object' ? b : {};
  const kalla = String(bild.kalla || '').trim();
  const credit = String(bild.credit || '').trim();
  const license = String(bild.license || '').trim();
  const src = String(bild.src || '').trim();
  const complete = bild.status === 'godkand' && NEWS_KALLOR.includes(kalla) && credit && license && src;
  return {
    status: complete ? 'godkand' : 'saknas',
    kalla,
    credit,
    license,
    src: complete ? src : src,
  };
}

function normalizeItem(it, index) {
  const raw = it && typeof it === 'object' ? it : {};
  return {
    id: String(raw.id || `n-${index}-${nid()}`),
    title: String(raw.title || ''),
    lead: String(raw.lead || ''),
    link: String(raw.link || ''),
    published: String(raw.published || ''),
    feedImage: String(raw.feedImage || ''),
    bild: normalizeBild(raw.bild),
  };
}

function normalizeModule(m, index) {
  const raw = m && typeof m === 'object' ? m : {};
  return {
    id: String(raw.id || `mod-${index}`),
    namn: String(raw.namn || ''),
    typ: raw.typ === 'manuell' ? 'manuell' : 'rss',
    url: String(raw.url || ''),
    verksamhet: String(raw.verksamhet || ''),
    items: Array.isArray(raw.items) ? raw.items.map(normalizeItem) : [],
  };
}

function readStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore quota / private mode
  }
}

export function loadNews() {
  try {
    const raw = readStorage();
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.modules) && parsed.modules.length) {
        return { modules: parsed.modules.map(normalizeModule), error: '' };
      }
    }
  } catch {
    // corrupt storage — seed
  }
  return { modules: clone(seedModules()), error: '' };
}

export function saveNews(news) {
  const payload = {
    modules: (news?.modules || []).map(normalizeModule),
  };
  writeStorage(JSON.stringify(payload));
}

function findItem(news, itemId) {
  if (!news || !Array.isArray(news.modules)) return null;
  for (const mod of news.modules) {
    const hit = (mod.items || []).find((it) => it.id === itemId);
    if (hit) return hit;
  }
  return null;
}

function findModule(news, moduleId) {
  return (news?.modules || []).find((m) => m.id === moduleId) || null;
}

export function addManualItem(news, moduleId, data) {
  const mod = findModule(news, moduleId);
  if (!mod) return { ok: false, error: 'Modulen saknas.' };
  const title = String(data?.title || '').trim();
  const lead = String(data?.lead || '').trim();
  const link = String(data?.link || '').trim();
  if (!title && !lead) return { ok: false, error: 'Titel eller ingress krävs.' };
  const item = emptyItem();
  item.title = title;
  item.lead = lead;
  item.link = link;
  item.bild = emptyBild();
  mod.items.push(item);
  return { ok: true, item };
}

export function updateModuleUrl(news, moduleId, url) {
  const mod = findModule(news, moduleId);
  if (!mod) return { ok: false, error: 'Modulen saknas.' };
  mod.url = String(url || '').trim();
  return { ok: true, module: mod };
}

/** Never store a publisher/feed image as an approved hero. */
export function stripFeedImage(url) {
  return {
    status: 'saknas',
    kalla: '',
    credit: '',
    license: '',
    src: '',
    discarded: String(url || ''),
  };
}

export function attachCompliantImage(itemId, fields, news) {
  const state = news || loadNews();
  const item = findItem(state, itemId);
  if (!item) return { ok: false, error: 'Artikeln saknas.', news: state };
  const kalla = String(fields?.kalla || '').trim();
  const credit = String(fields?.credit || '').trim();
  const license = String(fields?.license || '').trim();
  const src = String(fields?.src || '').trim();
  if (!kalla || !credit || !license || !src) {
    return { ok: false, error: 'kalla, credit, license och src krävs.', news: state };
  }
  if (!NEWS_KALLOR.includes(kalla)) {
    return { ok: false, error: 'Ogiltig källa.', news: state };
  }
  item.bild = { status: 'godkand', kalla, credit, license, src };
  if (!news) saveNews(state);
  return { ok: true, item, news: state };
}

export function importRssItems(moduleId, items, news) {
  const state = news || loadNews();
  const mod = findModule(state, moduleId);
  if (!mod) return { ok: false, error: 'Modulen saknas.', news: state };
  const existing = new Set((mod.items || []).map((it) => it.link).filter(Boolean));
  const existingTitles = new Set((mod.items || []).map((it) => `${it.title}\n${it.link}`));
  for (const raw of items || []) {
    const title = String(raw?.title || '').trim();
    const lead = String(raw?.lead || '').trim();
    const link = String(raw?.link || '').trim();
    const published = String(raw?.published || '').trim();
    const feedImage = String(raw?.feedImage || '').trim();
    if (!title && !lead) continue;
    const key = `${title}\n${link}`;
    if (link && existing.has(link)) continue;
    if (existingTitles.has(key)) continue;
    const item = emptyItem();
    item.title = title;
    item.lead = lead;
    item.link = link;
    item.published = published;
    item.feedImage = feedImage;
    const stripped = stripFeedImage(feedImage);
    item.bild = {
      status: stripped.status,
      kalla: '',
      credit: '',
      license: '',
      src: stripped.src,
    };
    mod.items.push(item);
    if (link) existing.add(link);
    existingTitles.add(key);
  }
  if (!news) saveNews(state);
  return { ok: true, news: state };
}

function decodeXml(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripTags(s) {
  return decodeXml(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function innerTag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}

function extractLink(block) {
  const href = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (href) return href[1].trim();
  const text = innerTag(block, 'link');
  if (text) return stripTags(text);
  const guid = innerTag(block, 'guid');
  if (guid) return stripTags(guid);
  return '';
}

function extractImage(block) {
  const enc = block.match(/<enclosure[^>]*>/gi) || [];
  for (const tag of enc) {
    const url = (tag.match(/url=["']([^"']+)["']/i) || [])[1];
    const type = (tag.match(/type=["']([^"']+)["']/i) || [])[1] || '';
    if (!url) continue;
    if (!type || /^image\//i.test(type) || /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(url)) {
      return url;
    }
  }
  const media = block.match(/<(?:media:content|media:thumbnail)[^>]*url=["']([^"']+)["'][^>]*>/i);
  if (media) return media[1];
  const decoded = decodeXml(block);
  const img = decoded.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  if (img) return img[1];
  return '';
}

function parseChunk(block) {
  const title = stripTags(innerTag(block, 'title'));
  const lead = stripTags(innerTag(block, 'description') || innerTag(block, 'summary') || innerTag(block, 'content'));
  const link = extractLink(block);
  const published = stripTags(
    innerTag(block, 'pubDate') || innerTag(block, 'published') || innerTag(block, 'updated')
  );
  const feedImage = extractImage(block);
  return { title, lead, link, published, feedImage };
}

export function parseRssXml(xml) {
  const text = String(xml || '');
  const chunks = [
    ...(text.match(/<item[\s\S]*?<\/item>/gi) || []),
    ...(text.match(/<entry[\s\S]*?<\/entry>/gi) || []),
  ];
  const out = [];
  for (const block of chunks) {
    const row = parseChunk(block);
    if (!row.title && !row.lead) continue;
    out.push(row);
  }
  return out;
}

async function readBody(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('bad status');
  return await res.text();
}

export async function fetchRss(url) {
  const target = String(url || '').trim();
  if (!target) return { ok: false, error: CORS_ERROR };
  try {
    const xml = await readBody(target);
    return { ok: true, items: parseRssXml(xml) };
  } catch {
    try {
      const xml = await readBody(`https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`);
      return { ok: true, items: parseRssXml(xml) };
    } catch {
      return { ok: false, error: CORS_ERROR };
    }
  }
}

export function creditLine(bild) {
  if (!bild) return '';
  if (bild.kalla === 'egen') return 'Bild: egen, fri att använda.';
  const credit = String(bild.credit || '').trim();
  const kalla = String(bild.kalla || '').trim();
  const license = String(bild.license || '').trim();
  return `Foto: ${credit} / ${kalla}, ${license}.`;
}
