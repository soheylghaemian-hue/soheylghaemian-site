import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ROOT, readJson, digest } from '../agent/core.mjs';
import { feedArticles, feedXml, linkRssPage, rssPage, rssScript } from '../site/rss.mjs';
import { build } from '../scripts/build.mjs';

const site = await readJson(path.join(ROOT, 'config/site.json'));
const seed = await readJson(path.join(ROOT, 'content/articles/before-you-grow-define-your-personal-goal.json'));
const now = new Date('2026-10-11T16:00:00Z');
const active = { production: true, now };
function reviewed(extra = {}) {
  const article = { ...structuredClone(seed), publishedDate: '2026-10-10', ...extra };
  article.review = { ...article.review, passed: true, contentHash: digest(article) };
  return article;
}
const roots = [];
after(async () => { for (const root of roots) await rm(root, { recursive: true, force: true }); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'endgame-rss-'));
  roots.push(root);
  for (const directory of ['site', 'config', 'agent/knowledge', 'content']) {
    await cp(path.join(ROOT, directory), path.join(root, directory), { recursive: true });
  }
  return root;
}

test('RSS does not distribute preview articles even when they have a date', () => {
  assert.deepEqual(feedArticles([reviewed()], { now }), []);
  const xml = feedXml(site, [reviewed()], { production: false, now });
  assert.doesNotMatch(xml, /<item>/);
  assert.match(xml, /Publication is not enabled yet/);
});
test('a current reviewed essay is included with its stable URL and GUID', () => {
  const article = reviewed();
  const xml = feedXml(site, [article], active);
  const url = `${site.origin}/insights/${article.slug}/`;
  assert.equal(feedArticles([article], active).length, 1);
  assert.ok(xml.includes(`<link>${url}</link>`));
  assert.ok(xml.includes(`<guid>${url}</guid>`));
});
test('RSS excludes undated, future and impossible calendar dates', () => {
  const articles = [reviewed({ publishedDate: null }), reviewed({ publishedDate: '2026-10-12' }), reviewed({ publishedDate: '2026-02-30' })];
  assert.deepEqual(feedArticles(articles, active), []);
});
test('RSS excludes unreviewed or modified content', () => {
  const changed = reviewed(); changed.description += ' Changed after review.';
  const declined = reviewed(); declined.review.passed = false;
  assert.deepEqual(feedArticles([changed, declined], active), []);
});
test('RSS filters by Berlin calendar day and sorts without mutating source data', () => {
  const older = reviewed({ slug: 'older-entry', publishedDate: '2026-10-09' });
  const newer = reviewed({ slug: 'newer-entry', publishedDate: '2026-10-11' });
  const articles = [older, newer];
  const list = feedArticles(articles, { production: true, now: new Date('2026-10-10T22:30:00Z') });
  assert.equal(list[0].slug, 'newer-entry');
  assert.equal(articles[0].slug, 'older-entry');
});
test('RSS has declared UTF-8, an RSS channel and a feed-reader discovery URL', () => {
  const xml = feedXml(site, [], active);
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<rss version="2\.0"/);
  assert.match(xml, /xmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom"/);
  assert.ok(xml.includes(`<atom:link href="${site.origin}/feed.xml" rel="self" type="application/rss+xml"/>`));
  assert.match(xml, /<\/channel><\/rss>/);
});
test('RSS XML escapes text and removes illegal XML control characters', () => {
  const article = reviewed({ title: 'Ownership & <control>', description: 'Test \u0001 & more' });
  const xml = feedXml(site, [article], active);
  assert.match(xml, /Ownership &amp; &lt;control&gt;/);
  assert.match(xml, /Test  &amp; more/);
  assert.ok(!xml.includes('\u0001'));
});
test('browser RSS links change to HTML without breaking automatic feed discovery', () => {
  const html = '<a href="/feed.xml">RSS</a><link rel="alternate" type="application/rss+xml" href="/feed.xml">';
  const changed = linkRssPage(html);
  assert.match(changed, /<a href="\/rss\/">RSS<\/a>/);
  assert.match(changed, /<link rel="alternate" type="application\/rss\+xml" href="\/feed\.xml">/);
  assert.equal(linkRssPage(changed), changed);
});
test('readable RSS page has a copyable address and explains the preview state', () => {
  const html = rssPage(site, [reviewed()], true, now);
  assert.ok(html.includes(`value="${site.origin}/feed.xml"`));
  assert.match(html, /readonly/);
  assert.match(html, /data-copy-rss hidden/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /still in preview/);
  assert.match(html, /href="\/feed.xml">Open the XML feed/);
  assert.match(html, /noindex,nofollow/);
});
test('reader page distinguishes an empty live feed from a published feed', () => {
  assert.match(rssPage(site, [], false, now), /no published essays/);
  assert.match(rssPage(site, [reviewed()], false, now), /1 published essay is available/);
});
test('RSS copy helper has a manual fallback and adds no network or tracking code', () => {
  assert.match(rssScript, /navigator\.clipboard/);
  assert.match(rssScript, /Command\+C/);
  assert.doesNotMatch(rssScript, /fetch\(|localStorage|document\.cookie|readText\(/);
});
test('integrated build emits RSS page, assets and XML without changing launch controls', async () => {
  const root = await fixture();
  await build({ root, now });
  const homepage = await readFile(path.join(root, 'dist/index.html'), 'utf8');
  const landing = await readFile(path.join(root, 'dist/rss/index.html'), 'utf8');
  const xml = await readFile(path.join(root, 'dist/feed.xml'), 'utf8');
  assert.match(homepage, /href="\/rss\/">RSS/);
  assert.match(homepage, /Impressum \/ Legal notice/);
  assert.match(homepage, /Datenschutz \/ Privacy/);
  assert.match(homepage, /type="application\/rss\+xml"[^>]*href="\/feed.xml"/);
  assert.match(landing, /Follow the writing/);
  assert.match(landing, /href="\/feed.xml">Open the XML feed/);
  assert.doesNotMatch(xml, /<item>/);
  assert.equal((await readJson(path.join(root, 'dist/.well-known/endgame-site.json'))).launchReady, false);
  assert.match(await readFile(path.join(root, 'dist/assets/rss.js'), 'utf8'), /Feed address copied/);
  assert.match(await readFile(path.join(root, 'dist/assets/rss.css'), 'utf8'), /rss-address/);
});
test('Vercel declares the RSS media type without a domain redirect', async () => {
  const config = await readJson(path.join(ROOT, 'vercel.json'));
  const headers = config.headers.find(rule => rule.source === '/feed.xml')?.headers;
  assert.ok(headers?.some(header => header.key === 'Content-Type' && header.value === 'application/rss+xml; charset=utf-8'));
  assert.ok(headers.some(header => header.key === 'Cache-Control' && header.value.includes('must-revalidate')));
  assert.equal(config.redirects, undefined);
});
