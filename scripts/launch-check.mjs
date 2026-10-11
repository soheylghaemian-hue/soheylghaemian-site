import {ROOT,readJson,allArticles,productionIssues,localDay} from '../agent/core.mjs';import path from 'node:path';
const site=await readJson(path.join(ROOT,'config/site.json'));const issues=productionIssues(site);
for(const a of await allArticles()){
 if(!a.publishedDate)issues.push(`Set the initial publication date on ${a.slug} when you actually launch (today: ${localDay()}).`);
}
if(issues.length){console.error('Production blocked:\n'+issues.map(x=>' - '+x).join('\n'));process.exitCode=1;}else console.log('Production configuration checks passed. This is not a legal review.');
