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
const config=await readJson(path.join(ROOT,'vercel.json'));
const roots=[];
after(async()=>{for(const root of roots) await rm(root,{recursive:true,force:true});});
async function fixture(){
 const root=await mkdtemp(path.join(os.tmpdir(),'endgame-blog-')); roots.push(root);
 for(const dir of ['site','config','agent/knowledge','content']) await cp(path.join(ROOT,dir),path.join(root,dir),{recursive:true});
 return root;
}
const publicPages=()=>[home(site,[seed],true),method(site,true),profile(site,true),journal(site,[seed],true),articlePage(site,seed,true),simple(site,'contact',true)];

test('personal site no longer offers a consultation or advisory engagement',()=>{
 for(const html of publicPages()) assert.doesNotMatch(html,/Your next move|Get in touch|Start with that conversation|Discuss your next move|I work with entrepreneurs|developing advisory framework|Book a call/i);
 assert.match(home(site,[seed],true),/My model\. My strategy\./);
});
test('navigation consistently exposes About, My model and Blog',()=>{
 for(const html of publicPages()){
  assert.match(html,/<a href="\/profile\/"[^>]*>About<\/a>/);
  assert.match(html,/<a href="\/method\/"[^>]*>My model<\/a>/);
  assert.match(html,/<a href="\/blog\/"[^>]*>Blog<\/a>/);
 }
});
test('blog index has its own canonical URL and Blog structured data',()=>{
 const html=journal(site,[seed],true);
 assert.ok(html.includes(`rel="canonical" href="${DOMAIN}/blog/"`));
 assert.match(html,/"@type":"Blog"/);
 assert.match(html,/<a href="\/blog\/" aria-current="page">Blog<\/a>/);
 assert.ok(html.includes(articlePath(seed)));
});
test('posts use BlogPosting and the exact reviewed body hash',()=>{
 const html=articlePage(site,seed,true);
 assert.match(html,/"@type":"BlogPosting"/);
 assert.ok(html.includes(`href="${DOMAIN}${articlePath(seed)}"`));
 assert.ok(html.includes(`content="${digest(seed)}"`));
 assert.match(html,/href="\/blog\/">All essays/);
});
test('undated essays do not get invented publication dates',()=>{
 const html=articlePage(site,{...seed,publishedDate:null},true);
 assert.match(html,/Undated essay/);
 assert.doesNotMatch(html,/datePublished|<time /);
});
test('known publication dates appear without being rewritten',()=>{
 const html=articlePage(site,{...seed,publishedDate:'2026-10-11'},false);
 assert.match(html,/<time datetime="2026-10-11">2026-10-11<\/time>/);
});
test('blog handles an empty inventory and more than one article',()=>{
 assert.match(journal(site,[],true),/first essay is being prepared/);
 const second={...seed,slug:'another-essay',title:'A different question about ownership'};
 assert.ok(journal(site,[seed,second],true).includes('/insights/another-essay/'));
});
test('blog titles and excerpts remain escaped',()=>{
 const unsafe={...seed,title:'<script>bad</script>',description:'<img onerror="bad">'};
 const html=journal(site,[unsafe],true);
 assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
 assert.ok(!html.includes('<img onerror='));
});
test('no fabricated contact details, images or testimonial counters are added',()=>{
 const html=home(site,[seed],true)+profile(site,true)+simple({...site,contactEmail:''},'contact',true);
 assert.doesNotMatch(html,/<img\b|mailto:|trusted by|clients served|client testimonial/i);
 assert.match(html,/not yet been confirmed/);
});
test('editor policy prohibits sales pitches and invented first-person experience',()=>{
 assert.match(policy.rules.join(' '),/not a consulting sales page/);
 assert.match(policy.rules.join(' '),/invented first-person experiences are not/);
});
test('existing article URLs are preserved without redirect conflicts',()=>{
 assert.equal(articlePath(seed),`/insights/${seed.slug}/`);
 assert.equal(config.redirects,undefined);
 assert.ok(!('public' in config));
});
test('build includes the blog, stable posts and canonical archive fallback',async()=>{
 const root=await fixture(); await build({root});
 for(const file of ['blog/index.html','insights/index.html',`insights/${seed.slug}/index.html`]){
  const html=await readFile(path.join(root,'dist',file),'utf8');
  assert.match(html,/noindex,nofollow/);
  const canonical=file===`insights/${seed.slug}/index.html` ? DOMAIN+articlePath(seed) : DOMAIN+'/blog/';
  assert.ok(html.includes(`rel="canonical" href="${canonical}"`));
 }
});
test('production sitemap uses the blog index and RSS retains stable post URLs',async()=>{
 const root=await fixture();
 const active={...site,launchReady:true,contactEmail:'example@example.com',legalNotice:'Test-only publisher details. '.repeat(6),privacyNotice:'Test-only privacy information. '.repeat(8)};
 await writeFile(path.join(root,'config/site.json'),JSON.stringify(active));
 await writeFile(path.join(root,'content/articles',`${seed.slug}.json`),JSON.stringify({...seed,publishedDate:'2026-10-11'}));
 await build({root,production:true});
 const sitemap=await readFile(path.join(root,'dist/sitemap.xml'),'utf8');
 assert.ok(sitemap.includes(`${DOMAIN}/blog/`));
 assert.ok(sitemap.includes(DOMAIN+articlePath(seed)));
 assert.ok(!sitemap.includes(`<loc>${DOMAIN}/insights/</loc>`));
 const feed=await readFile(path.join(root,'dist/feed.xml'),'utf8');
 assert.ok(feed.includes(`<link>${DOMAIN}${articlePath(seed)}</link>`));
 assert.ok(feed.includes(`<guid>${DOMAIN}${articlePath(seed)}</guid>`));
 const manifest=await readJson(path.join(root,'dist/.well-known/endgame-site.json'));
 assert.equal(manifest.articles[0].url,DOMAIN+articlePath(seed));
});
