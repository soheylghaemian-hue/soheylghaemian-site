#!/usr/bin/env bash
# Run on the owner's computer. Authentication stays with GitHub/Vercel.
# Creates only the dedicated private repository/project; never modifies other projects.
set -euo pipefail
cd "$(dirname "$0")/.."
MODE="${1:---preview}"
if [[ "$MODE" != "--preview" && "$MODE" != "--production" ]]; then
  printf 'Usage: bash scripts/launch.sh [--preview|--production]\n' >&2; exit 2
fi
REPO="soheylghaemian-hue/soheylghaemian-site"
PROJECT="soheylghaemian-site"
DOMAIN="soheylghaemian.com"
for command in node npm npx git gh; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing %s. Install Node.js 22 and GitHub CLI on your computer first.\n' "$command" >&2
    [[ "$command" == gh ]] && printf 'On a Mac with Homebrew: brew install gh\n' >&2
    exit 1
  fi
done
node --input-type=module -e 'if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Node.js 22 or newer required.")'
if ! gh auth status --hostname github.com >/dev/null 2>&1; then
  gh auth login --hostname github.com --git-protocol https --web
fi
OWNER="$(gh api user --jq .login)"
if [[ "$OWNER" != "soheylghaemian-hue" ]]; then
  printf 'Wrong GitHub account: %s. Expected soheylghaemian-hue. No repository changes made.\n' "$OWNER" >&2; exit 1
fi
if [[ "$MODE" == "--production" ]]; then
  node scripts/launch-check.mjs
fi
npm ci --ignore-scripts
npm run check
# No force pushes, and no borrowing a Meridian or trading repository.
if [[ -d .git ]]; then
  ORIGIN="$(git remote get-url origin 2>/dev/null || true)"
  case "$ORIGIN" in
    "https://github.com/$REPO.git"|"git@github.com:$REPO.git"|"https://github.com/$REPO") ;;
    *) printf 'Unexpected Git origin. Stop rather than overwrite another project.\n' >&2; exit 1;;
  esac
  if [[ "$(git branch --show-current)" != "main" ]]; then printf 'Use the dedicated main branch.\n' >&2; exit 1; fi
  if [[ -n "$(git status --porcelain)" ]]; then
    printf 'There are local changes. Review, commit and push them deliberately, then run this script again.\n' >&2; exit 1
  fi
  gh repo view "$REPO" --json name >/dev/null
else
  if gh repo view "$REPO" --json name >/dev/null 2>&1; then
    printf 'The target repository already exists. Clone and inspect it instead of overwriting it.\n' >&2; exit 1
  fi
  git init -b main
  if ! git config user.name >/dev/null; then git config user.name 'Soheyl Ghaemian'; fi
  if ! git config user.email >/dev/null; then
    GH_ID="$(gh api user --jq .id)"
    git config user.email "${GH_ID}+${OWNER}@users.noreply.github.com"
  fi
  git add -- .github .gitignore .vercelignore .env.example package.json package-lock.json vercel.json README.md LOCAL-TEST-RESULTS.md config site agent scripts tests content
  git commit -m "Add English ENDGAME website and guarded daily publishing workflow"
  gh repo create "$REPO" --private --source=. --remote=origin --push --description 'Personal ENDGAME website and English editorial workflow for soheylghaemian.com'
fi
mkdir -p .local
# npx uses the official Vercel CLI. The login flow is interactive; secrets are not read by this script.
if ! npx --yes vercel whoami >/dev/null 2>&1; then npx --yes vercel login; fi
printf '\nSelect your own Vercel team and the dedicated %s project. Do not select a Meridian project.\n' "$PROJECT"
npx --yes vercel link --project "$PROJECT"
node --input-type=module <<'JS'
import fs from 'node:fs';
const p=JSON.parse(fs.readFileSync('.vercel/project.json','utf8'));
if(!p.projectId||!p.orgId)throw new Error('Vercel project link was not created.');
if(p.projectName&&p.projectName!=='soheylghaemian-site')throw new Error('Unexpected Vercel project; stopped.');
JS
npx --yes vercel git connect --yes
if [[ "$MODE" == "--preview" ]]; then
  npx --yes vercel deploy > .local/preview-url.txt
  printf '\nPreview deployment created: '; cat .local/preview-url.txt
  printf '\nThis is a noindex preview. soheylghaemian.com has NOT been published.\n'
  printf 'Complete config/site.json and the fixed initial publication date, then use --production.\n'
  exit 0
fi
# No purchases, nameserver changes, MX changes, force reassignment or guessed DNS values.
npx --yes vercel deploy --prod > .local/production-url.txt
npx --yes vercel domains add "$DOMAIN" "$PROJECT"
npx --yes vercel domains inspect "$DOMAIN"
printf '\nUse the domain-specific DNS records reported by Vercel. Preserve all mail records.\n'
node scripts/verify-live.mjs
printf '\nWebsite verified on https://%s. Daily publishing is still separately gated.\n' "$DOMAIN"
