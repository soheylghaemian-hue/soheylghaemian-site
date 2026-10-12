import {isBilingual, bilingualIssues, versions, versionPath} from './bilingual.mjs';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, readdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export function isMain(url) { return Boolean(process.argv[1]) && fileURLToPath(url) === path.resolve(process.argv[1]); }
export const DOMAIN = 'https://soheylghaemian.com';
export const VERCEL_PROJECT_ID = 'prj_QF825pmF1DLvcdbAWpnTRqvtZryS';
export function assertDeployHook(hook) {
  let u;try{u=new URL(hook);}catch{throw new Error('Invalid Vercel deploy hook.');}
  if(u.origin!=='https://api.vercel.com'||u.username||u.password||u.search||u.hash||!new RegExp('^/v1/integrations/deploy/'+VERCEL_PROJECT_ID+'/[A-Za-z0-9_-]+$').test(u.pathname))throw new Error('Invalid Vercel deploy hook or wrong project.');
  return u;
}
export const SITE_ID = 'soheylghaemian-endgame-v1';
export async function readJson(file) { return JSON.parse(await readFile(file, 'utf8')); }
export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, file);
}
export async function listJson(folder) {
  try { return (await readdir(folder)).filter(f => f.endsWith('.json')).sort(); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
export function localDay(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function publicPayload(a) {
  return { ...(isBilingual(a)?{translations:a.translations,image:a.image}:{}), title: a.title, description: a.description, language: a.language, slug: a.slug, topicId: a.topicId, sourceIds: a.sourceIds, sections: a.sections };
}
export function digest(a) { return createHash('sha256').update(JSON.stringify(publicPayload(a))).digest('hex'); }
export function articleText(a) { return a.sections.map(s => `${s.heading}\n${s.paragraphs.join('\n')}`).join('\n\n'); }
export function wordCount(text) { return (text.match(/\b[\p{L}\p{N}][\p{L}\p{N}'’-]*\b/gu) || []).length; }
export function validateArticle(a, policy, sources, { requireReview = false, production = false, language = 'en' } = {}) {
  const issues = [];
  if (!a || typeof a !== 'object' || Array.isArray(a)) return ['Article must be an object.'];
  if(isBilingual(a)) {
    const issues=bilingualIssues(a,policy,sources,{production});
    if(requireReview&&(!a.review?.passed||a.review.contentHash!==digest(a)||!a.review.method))issues.push('Missing or stale editorial review.');
    return issues;
  }
  const permitted = new Set(['title','description','language','slug','topicId','sourceIds','sections','review','publishedDate','createdAt']);
  if (Object.keys(a).some(k => !permitted.has(k))) issues.push('Unexpected article property.');
  if (a.language !== language) issues.push(language==='en'?'English content required.':'German content required.');
  if (typeof a.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug) || a.slug.length > 100) issues.push('Unsafe or invalid slug.');
  if (typeof a.title !== 'string' || a.title.length < 15 || a.title.length > 120) issues.push('Title length invalid.');
  if (typeof a.description !== 'string' || a.description.length < 50 || a.description.length > 180) issues.push('Description length invalid.');
  if (typeof a.topicId !== 'string' || !/^[a-z0-9-]+$/.test(a.topicId)) issues.push('Topic ID invalid.');
  const sourceIds = new Set(sources.sources.map(s => s.id));
  if (!Array.isArray(a.sourceIds) || a.sourceIds.length < 1 || a.sourceIds.some(s => !sourceIds.has(s))) issues.push('Source not in approved register.');
  if (!Array.isArray(a.sections) || a.sections.length < 3 || a.sections.length > 10) issues.push('Article needs 3–10 structured sections.');
  let shapeOK = Array.isArray(a.sections);
  for (const s of (Array.isArray(a.sections) ? a.sections : [])) {
    if (!s || typeof s.heading !== 'string' || s.heading.length > 130 || !Array.isArray(s.paragraphs) || s.paragraphs.length < 1 || s.paragraphs.some(p => typeof p !== 'string' || !p.trim())) { issues.push('Invalid section.'); shapeOK = false; }
    else if (Object.keys(s).some(k => !['heading','paragraphs'].includes(k))) issues.push('Unexpected section property.');
  }
  if (shapeOK) {
    const text = articleText(a);
    const words = wordCount(text);
    if (words < policy.minimumWords || words > policy.maximumWords) issues.push(`Length outside editorial bounds: ${words} words.`);
    if (/[<>]|```/.test(text + a.title + a.description)) issues.push('HTML or executable markup is not allowed.');
    if (/https?:\/\//i.test(text)) issues.push('New URLs require source review.');
    if (/\b(guaranteed ranking|guarantee.*google|scientifically proven|scientifically validated|world.s leading|award-winning|my client|our client|convicted|criminal|lawsuit|lawsuits|diagnosis|dosage)\b/i.test(text)) issues.push('Sensitive or unsupported claim requires human review.');
    if(language==='de'&&/\b(wissenschaftlich bewiesen|wissenschaftlich validiert|garantierte rendite|garantiertes ergebnis|mein kunde|unsere kunden|verurteilt|straftäter|diagnose|dosierung)\b/iu.test(text))issues.push('Sensitive or unsupported German claim requires human review.');
    const occurrences = (text.match(/Soheyl Ghaemian/gi) || []).length;
    if (occurrences > 2) issues.push('Excessive name repetition.');
  }
  if (a.publishedDate != null) {
    const d = new Date(a.publishedDate + 'T00:00:00Z');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.publishedDate) || Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== a.publishedDate) issues.push('Invalid publication date.');
  }
  if (production && !a.publishedDate) issues.push('Production article needs a fixed publication date.');
  if (requireReview && (!a.review?.passed || a.review.contentHash !== digest(a) || !a.review.method)) issues.push('Missing or stale editorial review.');
  return issues;
}
export function tokens(text) { return new Set((text.toLowerCase().match(/[\p{L}]{3,}/gu) || []).filter(w => !['der','die','das','und','ein','eine','mit','für','ist','sind','the','and','for','your','you','with','that','this','from','what','can','not','are','have'].includes(w))); }
export function similarity(a, b) {
  const x = tokens(a), y = tokens(b); const both = [...x].filter(t => y.has(t)).length;
  return both / (new Set([...x,...y]).size || 1);
}
export function shingles(text) {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  return new Set(words.slice(0, -4).map((_, i) => words.slice(i,i+5).join(' ')));
}
export function bodySimilarity(a,b) {
  const x=shingles(a),y=shingles(b); return [...x].filter(v=>y.has(v)).length / (Math.min(x.size,y.size)||1);
}
export function assertNew(a, others, policy) {
  for (const b of others) {
    if(versions(a).some(v=>versions(b).some(w=>versionPath(v)===versionPath(w))))throw new Error('Duplicate language URL.');
    if (a.slug === b.slug || a.topicId === b.topicId) throw new Error('Duplicate article or previously used topic.');
    if (similarity(a.title,b.title) > policy.maximumTitleSimilarity) throw new Error('Title substantially duplicates an existing article.');
    if (bodySimilarity(articleText(a),articleText(b)) > policy.maximumBodySimilarity) throw new Error('Substantial reused text.');
    if(a.translations?.de&&b.translations?.de&&(similarity(a.translations.de.title,b.translations.de.title)>policy.maximumTitleSimilarity||bodySimilarity(articleText(a.translations.de),articleText(b.translations.de))>policy.maximumBodySimilarity))throw new Error('German version substantially duplicates an existing article.');
  }
}
export function productionIssues(site) {
  const issues=[];
  if (site.origin !== DOMAIN || site.siteId !== SITE_ID || site.language !== 'en') issues.push('Wrong site identity or domain.');
  if (site.launchReady !== true) issues.push('Launch has not been activated in config/site.json.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.contactEmail || '')) issues.push('Confirm a public contact email.');
  if ((site.legalNotice || '').trim().length < 80) issues.push('Provide the approved legal notice / publisher details.');
  if ((site.privacyNotice || '').trim().length < 120) issues.push('Provide the approved privacy notice.');
  return issues;
}
export async function allArticles(root = ROOT) {
  const dir = path.join(root,'content/articles');
  return Promise.all((await listJson(dir)).map(f=>readJson(path.join(dir,f))));
}
export async function fetchSafe(url, { allowedOrigin = DOMAIN, as = 'text', fetcher = fetch, timeout = 20000 } = {}) {
  const requested=new URL(url);
  if(requested.origin!==allowedOrigin)throw new Error('Unexpected request origin.');
  const options={redirect:'manual',signal:AbortSignal.timeout(timeout),cache:'no-store',headers:{'User-Agent':'ENDGAME-Publisher/1.0','Cache-Control':'no-cache'}};
  let response=await fetcher(url,options);
  let expectedOrigin=allowedOrigin;
  if([301,302,307,308].includes(response.status)){
    const next=new URL(response.headers?.get('location')||'',url);
    if(allowedOrigin!==DOMAIN||next.origin!=='https://www.soheylghaemian.com'||next.pathname!==requested.pathname||next.search!==requested.search||next.username||next.password)throw new Error('Unexpected domain redirect.');
    response=await fetcher(next.href,options);expectedOrigin=next.origin;
  }
  if(!response.ok)throw new Error(`Verification returned HTTP ${response.status}.`);
  if(response.url&&new URL(response.url).origin!==expectedOrigin)throw new Error('Unexpected response origin.');
  const body=await response.text();
  if(body.length>2000000)throw new Error('Response too large.');
  return as==='json'?JSON.parse(body):body;
}
export async function verifySite(site, fetcher = fetch) {
  const manifest=await fetchSafe(`${DOMAIN}/.well-known/endgame-site.json?verify=${Date.now()}`,{as:'json',fetcher});
  if(manifest.siteId!==SITE_ID||manifest.origin!==DOMAIN||manifest.language!=='en'||manifest.launchReady!==true||!Array.isArray(manifest.articles))throw new Error('The intended English site is not verified live.');
  return manifest;
}
