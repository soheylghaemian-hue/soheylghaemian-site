/** Reserve a conservative maximum BEFORE each charge; failures are never refunded.
 * This is an ENDGAME-only guard, not an account-wide OpenAI billing limit.
 */
const repo='soheylghaemian-hue/soheylghaemian-site';
const refName='tags/endgame-budget-ledger';
const refApi=`https://api.github.com/repos/${repo}/git/refs/${refName}`;
const gitApi=`https://api.github.com/repos/${repo}/git`;
const api=`https://api.github.com/repos/${repo}/contents/ledger.json`;
export function allowance(body,now=new Date()) {
 if(body.model!=='gpt-5.4-mini'||body.service_tier!=='default')throw new Error('Budget pricing permits only the approved standard model.');
 if(now>new Date('2026-11-12T00:00:00Z'))throw new Error('Budget pricing review expired. Recheck rates before API use.');
 if(!Number.isInteger(body.max_output_tokens)||body.max_output_tokens<1||body.max_output_tokens>10000)throw new Error('Invalid output token cap.');
 if(Buffer.byteLength(JSON.stringify(body),'utf8')>45000)throw new Error('Request exceeds the budget input bound.');
 // Bound input conservatively by UTF-8 bytes plus generous framing/schema overhead.
 // Standard rates: USD .75/M input, USD 4.50/M output. No tools or premium tier.
 // EUR reserve uses 2 EUR per USD, including exchange/tax margin; not an invoice estimate.
 return Math.ceil((47000*.75+body.max_output_tokens*4.5)/1e6*200);
}
export async function reserveBudget(body,{env=process.env,now=new Date(),fetcher=fetch}={}) {
 const cents=allowance(body,now);
 if(env.ENDGAME_MONTHLY_BUDGET_EUR!=='20'||!env.GITHUB_TOKEN||env.GITHUB_REPOSITORY!==repo||env.GITHUB_REF!=='refs/heads/main')throw new Error('Budget authority missing. No paid request permitted.');
 const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit'}).format(now);
 const headers={Authorization:`Bearer ${env.GITHUB_TOKEN}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'};
 const options={redirect:'error',signal:AbortSignal.timeout(20000)};
 const refResponse=await fetcher(`https://api.github.com/repos/${repo}/git/ref/${refName}`,{...options,headers});
 if(!refResponse.ok)throw new Error('Persistent budget ledger unavailable. No paid request permitted.');
 const ref=await refResponse.json();const parent=ref.object?.sha;
 if(ref.object?.type!=='commit'||!/^([a-f0-9]{40})$/.test(parent||''))throw new Error('Budget reference invalid.');
 const response=await fetcher(api+'?ref='+parent,{...options,headers});
 if(!response.ok)throw new Error('Persistent budget ledger unavailable. No paid request permitted.');
 const record=await response.json();
 let ledger;try{ledger=JSON.parse(Buffer.from(record.content,'base64').toString('utf8'));}catch{throw new Error('Budget ledger malformed.');}
 if(ledger.version!==1||!ledger.months||typeof ledger.months!=='object'||Array.isArray(ledger.months)||typeof record.sha!=='string')throw new Error('Budget ledger malformed.');
 const used=Object.hasOwn(ledger.months,month)?ledger.months[month]:0;
 if(!Number.isSafeInteger(used)||used<0||used>2000)throw new Error('Budget ledger invalid.');
 if(used+cents>2000)throw new Error('ENDGAME monthly budget of 20 EUR reached. No paid request permitted.');
 ledger.months[month]=used+cents;
 const treeResponse=await fetcher(gitApi+'/trees',{...options,method:'POST',headers,body:JSON.stringify({tree:[{path:'ledger.json',mode:'100644',type:'blob',content:JSON.stringify(ledger,null,2)+'\n'}]})});
 if(!treeResponse.ok)throw new Error('Budget tree write failed.');
 const tree=(await treeResponse.json()).sha;
 const commitResponse=await fetcher(gitApi+'/commits',{...options,method:'POST',headers,body:JSON.stringify({message:`Reserve ENDGAME API budget for ${month}`,tree,parents:[parent]})});
 if(!commitResponse.ok)throw new Error('Budget commit failed.');
 const commit=(await commitResponse.json()).sha;
 const saved=await fetcher(refApi,{...options,method:'PATCH',headers,body:JSON.stringify({sha:commit,force:false})});
 // A conflict or uncertain write blocks. Never spend without a confirmed durable reservation.
 if(!saved.ok)throw new Error('Budget reservation failed or conflicted. No paid request permitted.');
 return {month,reservedCents:cents,totalReservedCents:used+cents,limitCents:2000};
}
