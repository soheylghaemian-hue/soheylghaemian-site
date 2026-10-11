import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ROOT, DOMAIN, readJson, digest } from '../agent/core.mjs';
import { build } from '../scripts/build.mjs';
import { home, method, profile, journal, articlePage, articlePath, simple } from '../site/templates.mjs';

const site=await readJson(path.join(ROOT,'config/site.json'));
const seed=await readJson(path.join(ROOT,'content/articles/before-you-grow-define-your-personal-goal.json'));
const policy=await readJson(path.join(ROOT,'config/editor.json'));
const roots=[];
after(async()=>{for(const root of roots) await rm(root,{recursive:true,force:true});});
async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'endgame-blog-')); roots.push(root);
 for(const dir of ['site','config','agent/knowledge','content']) await cp(path.join(ROOT,dir),path.join(root,dir),{recursive:true});
 return root;
}
const pages=()=>[home(site,[seed],true),method(site,true),profile(site,true),journal(site,[seed],true),articlePage(site,seed,true),simple(site,'contact',true)];

test('personal pages do not pitch an advisory engagement',()=>{
 for(const html of pages()) assert.doesNotMatch(html,/Your next move|Get in touch|Start with that conversation|Discuss your next move|I work with entrepreneurs|developing advisory framework|Book a call/i);
 assert.match(home(site,[seed],true),/My model\. My strategy\./);
});
test('About, My model and Blog are visible navigation labels',()=>{
 for(const html of pages()){
  assert.match(html,/<a href="\/profile\/"[^>]*>About<\/a>/);
  assert.match(html,/<a href="\/method\/"[^>]*>My model<\/a>/);
  assert.match(html,/<a href="\/blog\/"[^>]*>Blog<\/a>/);
 }
});
test('blog index has a distinct canonical URL and Blog structured data',()=>{
 const html=journal(site,[seed],true);
 assert.ok(html.includes(`rel="canonical" href="${DOMAIN}/blog/"`));
 assert.match(html,/"@type":"Blog"/);
 assert.match(html,/<a href="\/blog\/" aria-current="page">Blog<\/a>/);
});
test('article addresses and reviewed-body verification remain compatible',()=>{
 assert.equal(articlePath(seed),`/insights/${seed.slug}/`);
 const html=articlePage(site,seed,true);
 assert.match(html,/"@type":"BlogPosting"/);
 assert.ok(html.includes(`href="${DOMAIN}${articlePath(seed)}"`));
 assert.ok(html.includes(`content="${digest(seed)}"`));
 assert.match(html,/<a href="\/blog\/" aria-current="page">Blog<\/a>/);
});
test('undated essays do not get fabricated publication dates',()=>{
 const html=articlePage(site,{...seed,publishedDate:null},true);
 assert.match(html,/Undated essay/);
 assert.doesNotMatch(html,/datePublished|<time /);
});
test('known dates are displayed without rewriting publication history',()=>{
 const html=articlePage(site,{...seed,publishedDate:'2026-10-11'},false);
 assert.match(html,/<time datetime="2026-10-11">2026-10-11<\/time>/);
});
test('blog works with zero, one and several essays',()=>{
 assert.match(journal(site,[],true),/first essay is being prepared/);
 assert.match(journal(site,[seed],true),/Opening essay/);
 const second={...seed,slug:'another-essay',title:'A different question about ownership'};
 const html=journal(site,[seed,second],true);
 assert.match(html,/Latest essay/);
 assert.ok(html.includes('/insights/another-essay/'));
});
test('blog content remains HTML-escaped',()=>{
 const unsafe={...seed,title:'<script>bad</script>',description:'<img onerror="bad">'};
 const html=journal(site,[unsafe],true);
 assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
 assert.ok(!html.includes('<img onerror='));
});
test('no invented contact address, portrait or testimonials are added',()=>{
 const html=home(site,[seed],true)+profile(site,true)+simple({...site,contactEmail:''},'contact',true);
 assert.doesNotMatch(html,/<img\b|mailto:|trusted by|clients served|client testimonial/i);
 assert.match(html,/not yet been confirmed/);
});
test('editorial policy disallows sales pitches and fictional experience',()=>{
 assert.match(policy.rules.join(' '),/not a consulting sales page/);
 assert.match(policy.rules.join(' '),/invented first-person experiences are not/);
});
test('build preserves existing paths and adds the blog without lifting launch gates',async()=>{
 const root=await fixture(); await build({root});
 for(const file of ['blog/index.html','insights/index.html',`insights/${seed.slug}/index.html`]){
  const html=await readFile(path.join(root,'dist',file),'utf8');
  assert.match(html,/noindex,nofollow/);
 }
 const oldIndex=await readFile(path.join(root,'dist/insights/index.html'),'utf8');
 assert.ok(oldIndex.includes(`rel="canonical" href="${DOMAIN}/blog/"`));
});
test('production sitemap and RSS use the blog index and stable article URLs',async()=>{
 const root=await fixture();
 const active={...site,launchReady:true,contactEmail:'example@example.com',legalNotice:'Test-only publisher details. '.repeat(6),privacyNotice:'Test-only privacy information. '.repeat(8)};
 await writeFile(path.join(root,'config/site.json'),JSON.stringify(active));
 await writeFile(path.join(root,'content/articles',`${seed.slug}.json`),JSON.stringify({...seed,publishedDate:'2026-10-11'}));
 await build({root,production:true});
 const sitemap=await readFile(path.join(root,'dist/sitemap.xml'),'utf8');
 assert.ok(sitemap.includes(`${DOMAIN}/blog/`));
 assert.ok(sitemap.includes(`${DOMAIN}${articlePath(seed)}`));
 assert.ok(!sitemap.includes(`<loc>${DOMAIN}/insights/</loc>`));
 const feed=await readFile(path.join(root,'dist/feed.xml'),'utf8');
 assert.ok(feed.includes(`<link>${DOMAIN}/blog/</link>`));
 assert.ok(feed.includes(`<guid>${DOMAIN}${articlePath(seed)}</guid>`));
});
