// Diagnostic screening only. This script never stages, commits or deploys an article.
import path from 'node:path';
import {ROOT,readJson,allArticles,assertNew,verifySite} from '../agent/core.mjs';
import {screenArticle} from '../agent/provider.mjs';
const site=await readJson(path.join(ROOT,'config/site.json'));
await verifySite(site);
const policy=await readJson(path.join(ROOT,'config/editor.json'));
const sources=await readJson(path.join(ROOT,'agent/knowledge/approved.json'));
const article=await readJson(path.join(ROOT,'content/queue/the-commitment-hidden-inside-a-good-offer.json'));
const inventory=await allArticles();
assertNew(article,inventory,policy);
await screenArticle({article,sources,policy,inventory});
console.log('Diagnostic screening passed. No publication was attempted.');
