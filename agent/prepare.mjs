import {isBilingual,approvedImage} from './bilingual.mjs';
import path from 'node:path';
import {ROOT,isMain,readJson,writeJson,listJson,allArticles,localDay,productionIssues,validateArticle,assertNew,digest,verifySite,assertDeployHook} from './core.mjs';
import {generateAndReview,screenArticle} from './provider.mjs';

export async function prepare({root=ROOT,env=process.env,now=new Date(),fetcher=fetch,generate=generateAndReview}={}){
 const [site,policy,sources,topics,inventory]=await Promise.all([readJson(path.join(root,'config/site.json')),readJson(path.join(root,'config/editor.json')),readJson(path.join(root,'agent/knowledge/approved.json')),readJson(path.join(root,'agent/knowledge/topics.json')),allArticles(root)]);
 if(env.PUBLISH_ENABLED!=='true'||!policy.enabled||!policy.automaticRoutinePublication)throw new Error('Daily publication is not activated.');
 const launchIssues=productionIssues(site);if(launchIssues.length)throw new Error(`Publication blocked: ${launchIssues.join(' ')}`);
 if(!env.VERCEL_DEPLOY_HOOK)throw new Error('Deploy hook must be configured before preparing a publishing commit.');
 assertDeployHook(env.VERCEL_DEPLOY_HOOK);
 const manifest=await verifySite(site,fetcher);
 if(manifest.articles.some(m=>!inventory.some(a=>a.slug===m.slug&&digest(a)===m.contentHash)))throw new Error('Live inventory differs from the authorized repository. Reconcile before publishing.');
 const today=localDay(now);
 // Recover a previously committed but not verified article before writing another.
 const outstanding=inventory.filter(a=>!manifest.articles.some(m=>m.slug===a.slug&&m.contentHash===digest(a))).sort((a,b)=>(a.publishedDate||'').localeCompare(b.publishedDate||''));
 if(outstanding.length){const record={action:'recover',slug:outstanding[0].slug,day:today,contentHash:digest(outstanding[0])};await writeJson(path.join(root,'agent/out/run.json'),record);return record;}
 const sameDay=inventory.find(a=>a.publishedDate===today);
 if(sameDay){const record={action:'recover',slug:sameDay.slug,day:today,contentHash:digest(sameDay)};await writeJson(path.join(root,'agent/out/run.json'),record);return record;}
 const topic=topics.find(t=>!inventory.some(a=>a.topicId===t.id));
 if(!topic)throw new Error('Topic backlog exhausted. Add reviewed topics; do not recycle articles.');
 let article;
 for(const f of await listJson(path.join(root,'content/queue'))){const candidate=await readJson(path.join(root,'content/queue',f));if(candidate.topicId===topic.id){article=candidate;break;}}
 if(article&&!article.review?.passed){await screenArticle({article,sources,policy,inventory,env,fetcher,root});article.review={passed:true,method:'automatic-independent-screening-existing-draft',contentHash:digest(article),reviewedAt:now.toISOString()};}
 if(!article){const generated=await generate({topic,sources,policy,inventory,env,fetcher,root});article={...generated.article,publishedDate:null,createdAt:now.toISOString()};article.review={passed:true,method:'automatic-independent-screening',contentHash:digest(article),reviewedAt:now.toISOString()};}
 if(article.topicId!==topic.id)throw new Error('Generated article does not match the selected topic.');
 if(policy.bilingualRequired&&!isBilingual(article))throw new Error('Both EN and DE versions are required.');
 if(isBilingual(article))await approvedImage(article,{root});
 const issues=validateArticle(article,policy,sources,{requireReview:true});if(issues.length)throw new Error(issues.join(' '));
 assertNew(article,inventory,policy);
 await writeJson(path.join(root,'agent/out/candidate.json'),article);
 const record={action:'ready',day:today,slug:article.slug,contentHash:digest(article)};await writeJson(path.join(root,'agent/out/run.json'),record);return record;
}
if(isMain(import.meta.url)){try{console.log(JSON.stringify(await prepare()));}catch(e){console.error(e.message);process.exitCode=1;}}
