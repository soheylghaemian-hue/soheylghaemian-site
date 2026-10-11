import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ROOT } from '../agent/core.mjs';
import { buildForVercel } from '../scripts/vercel-build.mjs';

const roots = [];
after(async () => { for (const root of roots) await rm(root, {recursive:true, force:true}); });
async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'endgame-browser-test-'));
  roots.push(root);
  for (const dir of ['site', 'config', 'agent/knowledge', 'content']) {
    await cp(path.join(ROOT, dir), path.join(root, dir), {recursive:true});
  }
  return root;
}
async function patch(root, updates) {
  const p = path.join(root, 'config/site.json');
  const site = JSON.parse(await readFile(p, 'utf8'));
  await writeFile(p, JSON.stringify({...site, ...updates}));
}
test('first main-branch Vercel import builds an explicitly nonindexable draft', async () => {
  const root = await fixture();
  const result = await buildForVercel({root, env:{VERCEL_ENV:'production'}});
  assert.equal(result.mode, 'preview');
  assert.match(await readFile(path.join(root, 'dist/index.html'), 'utf8'), /noindex,nofollow/);
  const marker=JSON.parse(await readFile(path.join(root, 'dist/.well-known/endgame-site.json'), 'utf8'));
  assert.equal(marker.launchReady, false);
});
test('activation does not bypass missing real publisher/contact/privacy checks', async () => {
  const root = await fixture();
  await patch(root, {launchReady:true});
  await assert.rejects(buildForVercel({root, env:{VERCEL_ENV:'production'}}), /Production blocked/);
});
test('preview environment stays noindex even after explicit launch activation', async () => {
  const root = await fixture();
  await patch(root, {launchReady:true});
  const result = await buildForVercel({root, env:{VERCEL_ENV:'preview'}});
  assert.equal(result.mode, 'preview');
});
test('nonboolean activation values are rejected instead of silently launching', async () => {
  const root = await fixture();
  await patch(root, {launchReady:'true'});
  await assert.rejects(buildForVercel({root, env:{VERCEL_ENV:'production'}}), /must be a boolean/);
});
