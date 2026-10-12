#!/usr/bin/env bash
# Explicit activation after the site and credentials are ready. Never reads secrets back.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO='soheylghaemian-hue/soheylghaemian-site'
node scripts/launch-check.mjs
node scripts/verify-live.mjs
node --input-type=module <<'JS'
import fs from 'node:fs';
const c=JSON.parse(fs.readFileSync('config/editor.json','utf8'));
if(!c.enabled||!c.automaticRoutinePublication)throw new Error('Review config/editor.json, explicitly enable it and push the reviewed change first.');
JS
printf 'Store API credentials and the Vercel deploy hook in GitHub repository Secrets, never in this chat.\n'
printf 'The following prompts hide the secret values.\n'
gh secret set OPENAI_API_KEY --repo "$REPO"
gh secret set VERCEL_DEPLOY_HOOK --repo "$REPO"
read -r -p 'Supported writing model ID available in your API account: ' MODEL
[[ -n "$MODEL" ]] || { printf 'No model selected. Activation aborted.\n' >&2; exit 1; }
gh variable set OPENAI_MODEL --repo "$REPO" --body "$MODEL"
printf '\nActivation will permit at most one automatically screened evergreen bilingual EN/DE contribution per day.\n'
printf 'Model/API and platform usage can incur charges on your accounts. No plan upgrade is performed.\n'
read -r -p 'Type ENABLE to authorize daily execution: ' CONFIRM
[[ "$CONFIRM" == 'ENABLE' ]] || exit 1
gh variable set PUBLISH_ENABLED --repo "$REPO" --body true
printf 'Activation variable set. Run one controlled end-to-end test and inspect the actual live receipt:\n'
printf 'gh workflow run daily.yml --repo %s\n' "$REPO"
printf 'gh run list --workflow daily.yml --repo %s\n' "$REPO"
printf 'Pause: gh variable set PUBLISH_ENABLED --repo %s --body false\n' "$REPO"
