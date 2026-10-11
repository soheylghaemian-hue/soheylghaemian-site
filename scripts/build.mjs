import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, isMain, readJson, allArticles, validateArticle, productionIssues, digest } from '../agent/core.mjs';
import { home, method, profile, journal, articlePage, simple, layout, esc } from '../site/templates.mjs';
import { feedXml, rssPage, linkRssPage, rssCss, rssScript } from '../site/rss.mjs';

export async function build({root=ROOT, production=false, now=new Date()}={}) {
 const [site,policy,sources,articles]=await Promise.all([readJson(path.join(root,'config/site.json')),readJson(path.join(root,'config/editor.json')),readJson(path.join(root,'agent/knowledge/approved.json')),allArticles(root)]);
 if(production){const issues=productionIssues(site);if(issues.length)throw new Error(`Production blocked: ${issues.join(' ')}`);}
 const slugs=new Set();
 for(const a of articles){const issues=validateArticle(a,policy,sources,{requireReview:true,production});if(issues.length)throw new Error(`Invalid article ${a.slug}: ${issues.join(' ')}`);if(slugs.has(a.slug))throw new Error('Duplicate slug.');slugs.add(a.slug);}
 articles.sort((a,b)=>(b.publishedDate||'').localeCompare(a.publishedDate||'')||a.slug.localeCompare(b.slug));
 const out=path.join(root,'dist');await rm(out,{recursive:true,force:true});await mkdir(path.join(out,'assets'),{recursive:true});
 const put=async(file,content)=>{const p=path.join(out,file);await mkdir(path.dirname(p),{recursive:true});await writeFile(p,content);};
 for(const f of ['style.css','main.js','favicon.svg'])await copyFile(path.join(root,'site',f),path.join(out,'assets',f));
 await put('assets/rss.css',rssCss);
 await put('assets/rss.js',rssScript);
 const preview=!production;
 const pages=new Map([['index.html',home(site,articles,preview)],['method/index.html',method(site,preview)],['profile/index.html',profile(site,preview)],['blog/index.html',journal(site,articles,preview)],['insights/index.html',journal(site,articles,preview)],...['contact','legal','privacy'].map(k=>[`${k}/index.html`,simple(site,k,preview)])]);
 for(const a of articles)pages.set(`insights/${a.slug}/index.html`,articlePage(site,a,preview));
 pages.set('404.html',layout(site,{title:'Page not found | Soheyl Ghaemian',description:'The requested page could not be found.',path:'/404/',preview:true,body:'<div class="wrap"><section class="page-head"><p class="eyebrow">404</p><h1>This is not the page<br>you were looking for.</h1><a class="text-link" href="/">Return home ↗</a></section></div>'}));
 const legalLabels=html=>html.replace('<a href="/legal/">Legal notice</a>','<a href="/legal/">Impressum / Legal notice</a>').replace('<a href="/privacy/">Privacy</a>','<a href="/privacy/">Datenschutz / Privacy</a>');
 for(const [p,h]of pages)await put(p,legalLabels(linkRssPage(h)));
 // This page deliberately retains its direct link to the raw XML feed.
 await put('rss/index.html',legalLabels(rssPage(site,articles,preview,now)));
 const paths=['/','/profile/','/method/','/blog/','/rss/','/contact/','/legal/','/privacy/',...articles.map(a=>`/insights/${a.slug}/`)];
 const xml=v=>esc(v);
 await put('sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${(production?paths:[]).map(p=>`<url><loc>${xml(site.origin+p)}</loc></url>`).join('')}</urlset>`);
 await put('robots.txt',production?`User-agent: *\nAllow: /\nSitemap: ${site.origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n');
 await put('feed.xml',feedXml(site,articles,{production,now}));
 const buildId=process.env.VERCEL_GIT_COMMIT_SHA||process.env.GITHUB_SHA||'local-preview';
 await put('.well-known/endgame-site.json',JSON.stringify({siteId:site.siteId,origin:site.origin,language:'en',launchReady:production&&site.launchReady,buildId,builtAt:now.toISOString(),articles:articles.map(a=>({slug:a.slug,title:a.title,contentHash:digest(a),date:a.publishedDate}))},null,2));
 return {mode:production?'production':'preview',htmlPages:pages.size,articles:articles.length,output:out};
}
if(isMain(import.meta.url)){try{console.log(JSON.stringify(await build({production:process.env.VERCEL_ENV==='production'||process.argv.includes('--production')}),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
