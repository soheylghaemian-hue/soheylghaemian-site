import { digest, localDay } from '../agent/core.mjs';
import { layout, esc } from './templates.mjs';

// Keep article URLs and RSS GUIDs stable; this change does not migrate the blog.
const articleUrl = (site, article) => `${site.origin}${article.translations?`/en/blog/${article.slug}/`:`/insights/${article.slug}/`}`;
const xml = value => esc(String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''));

export function feedArticles(articles, { production = false, now = new Date() } = {}) {
  if (production !== true) return [];
  const today = localDay(now);
  return articles.filter(article => {
    const day = article.publishedDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '') || day > today) return false;
    const date = new Date(`${day}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) return false;
    return article.review?.passed === true && article.review.contentHash === digest(article);
  }).sort((a, b) => b.publishedDate.localeCompare(a.publishedDate) || a.slug.localeCompare(b.slug));
}

export function feedXml(site, articles, options = {}) {
  const posts = feedArticles(articles, options);
  const description = options.production === true
    ? 'Personal essays on entrepreneurship, ownership and strategic decisions.'
    : 'Publication is not enabled yet. Preview essays are not distributed in this feed.';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${xml(site.author)} — Blog</title><link>${xml(site.origin)}/blog/</link><description>${xml(description)}</description><language>${xml(site.language || 'en')}</language><atom:link href="${xml(site.origin)}/feed.xml" rel="self" type="application/rss+xml"/><ttl>60</ttl>${posts.map(article => `<item><title>${xml(article.title)}</title><link>${xml(articleUrl(site, article))}</link><guid>${xml(articleUrl(site, article))}</guid><description>${xml(article.description)}</description><pubDate>${new Date(`${article.publishedDate}T12:00:00Z`).toUTCString()}</pubDate></item>`).join('')}</channel></rss>\n`;
}

// Human-facing links use an ordinary HTML page. Feed-reader discovery stays XML.
export function linkRssPage(html) {
  return html.replace(/(<a\b[^>]*\bhref=)(["'])\/feed\.xml\2/g, '$1$2/rss/$2');
}

export function rssPage(site, articles, preview, now = new Date()) {
  const posts = feedArticles(articles, { production: !preview, now });
  const address = `${site.origin}/feed.xml`;
  const status = preview
    ? 'This website is still in preview. Publishing is not enabled, so the feed does not include the preview essays. You can save its address now.'
    : posts.length
      ? `${posts.length} published ${posts.length === 1 ? 'essay is' : 'essays are'} available in the feed. New published essays will appear at the same address.`
      : 'There are no published essays in the feed yet. You can save the address and check back for the first publication.';
  const body = `<div class="wrap"><section class="page-head"><p class="eyebrow">Blog / RSS</p><h1>Follow the writing.<br>On your terms.</h1><p class="lead">Read new essays in your feed reader. No email subscription or account on this website is needed.</p></section><div class="article-layout"><aside><p>SOHEYL GHAEMIAN</p><a href="/blog/">Back to the blog ↗</a></aside><article class="prose"><section><h2>Your feed address</h2><p>Copy this address into the subscription field of your RSS reader:</p><label class="eyebrow" for="rss-address">RSS feed URL</label><input id="rss-address" class="rss-address" type="url" readonly value="${esc(address)}" aria-describedby="rss-copy-status"><button type="button" class="rss-copy" data-copy-rss hidden>Copy feed address</button><p id="rss-copy-status" class="caption" aria-live="polite"></p><p class="note">${esc(status)}</p></section><section><h2>What happens when I subscribe?</h2><p>Your reader checks this address for updates. The feed contains published essay titles, summaries and links to the complete articles.</p><p>Some browsers display RSS as XML or download it instead of showing a normal web page. The address above is intended for a feed reader; this page explains how to use it.</p><a class="text-link" href="/feed.xml">Open the XML feed ↗</a></section><section><h2>Reading without a feed reader</h2><p>The same essays remain available on the blog. You do not have to subscribe to read them.</p><a class="text-link" href="/blog/">Read the blog ↗</a></section></article></div></div>`;
  return layout(site, { title: 'RSS | Soheyl Ghaemian', description: 'Follow the blog in an RSS reader. Find the feed address, publication status and instructions.', path: '/rss/', body, preview })
    .replace('</head>', '<link rel="stylesheet" href="/assets/rss.css"></head>')
    .replace('</body>', '<script src="/assets/rss.js" defer></script></body>');
}

export const rssCss = `.rss-address{display:block;width:100%;max-width:100%;min-width:0;margin:12px 0 16px;padding:14px;border:1px solid var(--rule);background:var(--white);color:var(--ink);font-size:16px}.rss-address:focus-visible{outline:2px solid var(--accent);outline-offset:3px}.rss-copy{padding:10px 16px;border:1px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer;margin-bottom:12px}.rss-copy:hover{border-color:var(--accent);color:var(--accent)}.rss-copy[hidden]{display:none}#rss-copy-status{min-height:1.6em}\n`;
export const rssScript = `(() => {
  const field = document.getElementById('rss-address');
  const button = document.querySelector('[data-copy-rss]');
  const status = document.getElementById('rss-copy-status');
  if (!field || !button || !status) return;
  button.hidden = false;
  field.addEventListener('click', () => field.select());
  button.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(field.value);
      status.textContent = 'Feed address copied. Paste it into your RSS reader.';
    } catch {
      field.focus();
      field.select();
      field.setSelectionRange(0, field.value.length);
      status.textContent = 'Address selected. Press Command+C on Mac or Ctrl+C on Windows to copy.';
    }
  });
})();\n`;
