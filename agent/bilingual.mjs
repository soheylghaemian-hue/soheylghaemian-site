import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {validateArticle, readJson, ROOT} from './core.mjs';

export const isBilingual = a => a?.translations != null;
export function versions(a) {
  if (!isBilingual(a)) return [a];
  const {translations, image, ...english} = a;
  return [{...english, image, bundleSlug:a.slug, language:'en'},
    {...translations.de, topicId:a.topicId, sourceIds:a.sourceIds, publishedDate:a.publishedDate, image, bundleSlug:a.slug, language:'de'}];
}
export const versionPath = a => a.bundleSlug ? `/${a.language}/blog/${a.slug}/` : `/insights/${a.slug}/`;
export function bilingualIssues(a, policy, sources, options) {
  const issues=[];
  if (!a.translations || Object.keys(a.translations).join(',')!=='de') return ['Exactly one German version is required.'];
  const de=a.translations.de;
  if (!de || Object.keys(de).some(k=>!['title','description','slug','language','sections'].includes(k))) return ['Invalid German version fields.'];
  const {translations,image,...en}=a;
  issues.push(...validateArticle(en,policy,sources,{...options,requireReview:false}));
  issues.push(...validateArticle({...de,topicId:a.topicId,sourceIds:a.sourceIds,publishedDate:a.publishedDate},policy,sources,{...options,requireReview:false,language:'de'}).map(s=>'DE: '+s));
  if (!image || Object.keys(image).some(k=>!['id','path','sha256','author','sourceUrl','license','licenseUrl','changes','alt','topicIds'].includes(k)) || !/^\/assets\/images\/[a-z0-9-]+\.(jpg|png|webp)$/.test(image.path||'') || !/^[a-f0-9]{64}$/.test(image.sha256||'') || !image.id || !image.author || !image.changes || !['CC BY 2.0','CC BY 4.0','CC0'].includes(image.license)) issues.push('Reviewed image and license metadata required.');
  for(const lang of ['en','de'])if(typeof image?.alt?.[lang]!=='string'||image.alt[lang].trim().length<10)issues.push(`Image alt text required: ${lang}.`);
  for(const key of ['sourceUrl','licenseUrl']){try{if(new URL(image?.[key]).protocol!=='https:')throw new Error();}catch{issues.push('Invalid image credit URL.');}}
  return issues;
}
export async function approvedImage(a,{root=ROOT}={}) {
  const register=await readJson(path.join(root,'config/images.json'));
  const entry=register.find(i=>i.id===a.image?.id);
  if(!entry||JSON.stringify(entry)!==JSON.stringify(a.image)||!entry.topicIds.includes(a.topicId))throw new Error('Image is not approved for this topic.');
  const bytes=await readFile(path.join(root,'site',entry.path.replace('/assets/','')));
  if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw new Error('Approved image bytes changed.');
  return entry;
}
