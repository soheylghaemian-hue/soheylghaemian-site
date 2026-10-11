/** Browser-import entry point: an unfinished site remains a noindex draft.
 * The explicit launch switch does not bypass production validation.
 */
import path from 'node:path';
import { ROOT, readJson, isMain } from '../agent/core.mjs';
import { build } from './build.mjs';

export async function buildForVercel({ root = ROOT, env = process.env, now = new Date() } = {}) {
  const site = await readJson(path.join(root, 'config/site.json'));
  if (typeof site.launchReady !== 'boolean') {
    throw new Error('config/site.json launchReady must be a boolean.');
  }
  const production = env.VERCEL_ENV === 'production' && site.launchReady === true;
  return build({ root, production, now });
}

if (isMain(import.meta.url)) {
  try {
    console.log(JSON.stringify(await buildForVercel(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
