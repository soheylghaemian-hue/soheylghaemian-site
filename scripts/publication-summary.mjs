import {appendFile} from 'node:fs/promises';
import path from 'node:path';
import {ROOT,readJson} from '../agent/core.mjs';
let text='Publication was not verified. Inspect the failed step; do not publish a backlog or create another article before recovery.\n';
try{const r=await readJson(path.join(ROOT,'agent/out/receipt.json'));if(r.verified)text=`Verified one contribution:\n${r.urls.map(url=>`- ${url}`).join('\n')}\nChecked: both languages, canonical URLs, reviewed paragraphs, language links and image bytes.\n`;}catch{}
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,text);
console.log(text);
