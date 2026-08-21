import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  seedModules,
  emptyItem,
  attachCompliantImage,
  stripFeedImage,
  importRssItems,
  creditLine,
} from './news.js';

function freshNews() {
  return { modules: seedModules(), error: '' };
}

test('attachCompliantImage rejects blank credit', () => {
  const news = freshNews();
  const item = emptyItem();
  item.title = 'Utkast';
  news.modules[0].items.push(item);
  const r = attachCompliantImage(item.id, {
    kalla: 'egen',
    credit: '',
    license: 'egen',
    src: '/bilder/hero.jpg',
  }, news);
  assert.equal(r.ok, false);
  assert.equal(item.bild.status, 'saknas');
});

test('attachCompliantImage egen + all fields → status godkand', () => {
  const news = freshNews();
  const item = emptyItem();
  item.title = 'Utkast';
  news.modules[0].items.push(item);
  const r = attachCompliantImage(item.id, {
    kalla: 'egen',
    credit: 'egen',
    license: 'egen',
    src: '/bilder/hero.jpg',
  }, news);
  assert.equal(r.ok, true);
  assert.equal(item.bild.status, 'godkand');
  assert.equal(item.bild.src, '/bilder/hero.jpg');
  assert.equal(item.bild.kalla, 'egen');
});

test('strip/import: feedImage does not become bild.src', () => {
  const news = freshNews();
  const feed = 'https://cdn.example/publisher-photo.jpg';
  const stripped = stripFeedImage(feed);
  assert.equal(stripped.status, 'saknas');
  assert.equal(stripped.src, '');
  assert.notEqual(stripped.src, feed);

  const r = importRssItems(
    'extern',
    [{ title: 'Rubrik från feed', lead: 'Ingress från feed', link: 'https://example.test/a', published: '', feedImage: feed }],
    news
  );
  assert.equal(r.ok, true);
  const item = news.modules.find((m) => m.id === 'extern').items[0];
  assert.equal(item.title, 'Rubrik från feed');
  assert.equal(item.feedImage, feed);
  assert.notEqual(item.bild.src, feed);
  assert.equal(item.bild.src, '');
  assert.equal(item.bild.status, 'saknas');
});

test('creditLine egen', () => {
  assert.equal(creditLine({ kalla: 'egen', credit: 'egen', license: 'egen', src: '/x.jpg' }), 'Bild: egen, fri att använda.');
});
