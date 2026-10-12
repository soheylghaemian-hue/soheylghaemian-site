import {isBilingual,versions,versionPath,approvedImage} from './bilingual.mjs';
import {createHash} from 'node:crypto';
import path from 'node:path';import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {ROOT,isMain,DOMAIN,readJson,writeJson,allArticles,localDay,productionIssues,validateArticle,assertNew,digest,fetchSafe,verifySite,assertDeployHook} from './core.mjs';
import {esc} from '../site/templates.mjs';
export async function stage({root=ROOT,env=process.env,now=new Date(),fetcher=fetch}={}){
 const run=await readJson(path.join(root,'agent/out/run.json'));
 if(run.action!=='ready')return {changed:false,action:run.action};
 const [site,policy,sources,a,inventory]=await Promise.all([readJson(path.join(root,'config/site.json')),readJson(path.join(root,'config/editor.json')),readJson(path.join(root,'agent/knowledge/approved.json')),readJson(path.join(root,'agent/out/candidate.json')),allArticles(root)]);
 if(env.PUBLISH_ENABLED!=='true'||!policy.enabled||!policy.automaticRoutinePublication||productionIssues(site).length)throw new Error('Publication gate not satisfied.');
 await verifySite(site,fetcher);
 const today=localDay(now);if(today!==run.day)throw new Error('Local day changed. Prepare a fresh decision before staging.');
 if(inventory.some(x=>x.publishedDate===today))throw new Error('An article is already staged for this local day.');
 if(run.contentHash!==digest(a)||run.slug!==a.slug)throw new Error('Prepared content changed.');
 if(policy.bilingualRequired&&!isBilingual(a))throw new Error('Both EN and DE versions are required.');
 if(isBilingual(a))await approvedImage(a,{root});
 a.publishedDate=today;
 const issues=validateArticle(a,policy,sources,{requireReview:true,production:true});if(issues.length)throw new Error(issues.join(' '));
 assertNew(a,inventory,policy);
 const file=path.join(root,'content/articles',`${a.slug}.json`);await mkdir(path.dirname(file),{recursive:true});
 await writeFile(file,JSON.stringify(a,null,2)+'\n',{flag:'wx',mode:0o600});
 await writeJson(path.join(root,'agent/out/run.json'),{...run,action:'staged-not-live'});
 return {changed:true,action:'staged-not-live',slug:a.slug};
}
export async function requestDeploy({hook=process.env.VERCEL_DEPLOY_HOOK,fetcher=fetch}={}){
 assertDeployHook(hook);
 let response;try{response=await fetcher(hook,{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000)});}catch{throw new Error('Vercel deployment request failed.');}
 if(!response.ok)throw new Error(`Vercel deploy hook returned HTTP ${response.status}.`);
 return {requested:true};
}
export async function verifyArticle(a,{fetcher=fetch}={}){
 const manifest=await verifySite({},fetcher);
 if(!manifest.articles.some(m=>m.slug===a.slug&&m.contentHash===digest(a)))throw new Error('Expected article is not in the live build.');
 const urls=[];
 for(const v of versions(a)){
  const url=DOMAIN+versionPath(v);
  const html=await fetchSafe(url+'?verify='+Date.now(),{fetcher});
  if(!html.includes(`<html lang="${v.language}"`)||!html.includes(`content="${digest(a)}"`)||!html.includes(`href="${url}"`)||!html.includes(`<h1>${esc(v.title)}</h1>`))throw new Error('Public article read-back did not match.');
  if(/name="robots" content="[^\"]*noindex/.test(html))throw new Error('Article is still a noindex preview.');
  const reviewedBody=v.sections.map(section=>`<section><h2>${esc(section.heading)}</h2>${section.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('');
  if(!html.includes(reviewedBody))throw new Error('Published body does not match the reviewed text.');
  if(isBilingual(a)){
    for(const peer of versions(a))if(!html.includes(`hreflang="${peer.language}" href="${DOMAIN+versionPath(peer)}"`))throw new Error('Language links missing.');
    if(!html.includes(`src="${a.image.path}"`)||!html.includes(`alt="${esc(a.image.alt[v.language])}"`)||!html.includes(esc(a.image.author))||!html.includes(esc(a.image.licenseUrl)))throw new Error('Reviewed image or credit missing.');
  }
  urls.push(url);
 }
 if(isBilingual(a)){
  const r=await fetcher(DOMAIN+a.image.path,{redirect:'manual',signal:AbortSignal.timeout(20000),cache:'no-store'});
  let result=r;
  if([301,302,307,308].includes(r.status)){
    const next=new URL(r.headers?.get('location')||'',DOMAIN+a.image.path);
    if(next.origin!=='https://www.soheylghaemian.com'||next.pathname!==a.image.path||next.search||next.username||next.password)throw new Error('Unexpected image redirect.');
    result=await fetcher(next.href,{redirect:'manual',signal:AbortSignal.timeout(20000),cache:'no-store'});
  }
  if(result.url&&!['https://soheylghaemian.com','https://www.soheylghaemian.com'].includes(new URL(result.url).origin))throw new Error('Unexpected image response origin.');
  if(!result.ok||createHash('sha256').update(Buffer.from(await result.arrayBuffer())).digest('hex')!==a.image.sha256)throw new Error('Published image bytes differ.');
 }
 return {verified:true,url:urls[0],urls,contentHash:digest(a)};
}
export async function deployAndVerify({root=ROOT,env=process.env,fetcher=fetch,attempts=18,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const run=await readJson(path.join(root,'agent/out/run.json'));
 if(run.action==='already-published')return {action:'already-published'};
 if(!['staged-not-live','recover'].includes(run.action))throw new Error('No committed article selected for deployment.');
 const [site,policy,sources]=await Promise.all([readJson(path.join(root,'config/site.json')),readJson(path.join(root,'config/editor.json')),readJson(path.join(root,'agent/knowledge/approved.json'))]);
 if(env.PUBLISH_ENABLED!=='true'||!policy.enabled||!policy.automaticRoutinePublication||productionIssues(site).length)throw new Error('Publication gate not satisfied.');
 const a=await readJson(path.join(root,'content/articles',`${run.slug}.json`));
 const issues=validateArticle(a,policy,sources,{requireReview:true,production:true});if(issues.length)throw new Error(issues.join(' '));
 if(isBilingual(a))await approvedImage(a,{root});
 await verifySite(site,fetcher);
 if(digest(a)!==run.contentHash)throw new Error('Committed article differs from prepared review.');
 try{const result=await verifyArticle(a,{fetcher});await writeJson(path.join(root,'agent/out/receipt.json'),{...result,verifiedAt:new Date().toISOString()});return result;}catch{}
 await requestDeploy({hook:env.VERCEL_DEPLOY_HOOK,fetcher});
 let lastError;
 for(let i=0;i<attempts;i++){await sleep(10000);try{const result=await verifyArticle(a,{fetcher});await writeJson(path.join(root,'agent/out/receipt.json'),{...result,verifiedAt:new Date().toISOString()});return result;}catch(e){lastError=e;}}
 throw new Error(`Deployment requested, but live verification failed: ${lastError?.message||'timeout'}. Do not claim publication; retry this article before creating another.`);
}
if(isMain(import.meta.url)){try{const action=process.argv[2];if(action==='stage')console.log(JSON.stringify(await stage()));else if(action==='verify')console.log(JSON.stringify(await deployAndVerify()));else throw new Error('Use stage or verify.');}catch(e){console.error(e.message);process.exitCode=1;}}
