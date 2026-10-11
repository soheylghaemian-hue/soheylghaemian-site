# Soheyl Ghaemian — ENDGAME

> **Browser-start edition (11 October 2026).** Follow `BROWSERSTART-DE.md` for a no-terminal upload and import. `vercel.json` now runs `npm run check:vercel`. When `config/site.json` has `launchReady:false`, even the first Vercel main-branch (Production-environment) import renders an explicitly nonindexable draft. This is a staging mode in the application, not a claim that Vercel classified the deployment as a Preview. Setting `launchReady:true` only permits the production validation to run: real contact/publisher/privacy text and valid article publication dates are still required. A noindex draft is **not access-controlled or confidential**. Default daily publishing remains OFF. No design or editorial content has changed.

A real, dependency-free Node.js 22 website implementation plus a GitHub Actions editorial/publishing workflow. English content; intended production domain: **https://soheylghaemian.com**. GitHub → Vercel → exact domain. No WordPress, Railway deployment or substitute production domain.

## Actual status of this package

- Source code implemented locally, with automated and browser checks recorded in `LOCAL-TEST-RESULTS.md` when present.
- No GitHub repository has been created by this session; no files have been pushed.
- No authenticated Vercel connection was available; no preview or production deployment was created.
- Domain and DNS were not changed. Daily GitHub Actions execution is not enabled.
- Live model calls, GitHub pushes, deployment hooks and exact-domain publishing remain untested against the owner's accounts.
- The existing ChatGPT daily drafting task is separate. Once this workflow owns publishing, keep ChatGPT as a drafting-only channel to avoid two publishers.

## Design and public content

The accepted warm-white / navy / burgundy editorial direction is implemented as semantic HTML and CSS, with mobile navigation, an ENDGAME method page, profile, article index, article pages and contact/legal/privacy routes. No generated portrait, no invented clients, no stock success metrics, no dashboard redesign. System font fallbacks are used; **no font files are included**.

Only `dist/` is served by Vercel. Agent instructions, draft files, API keys, tests, internal source registers and this README are not copied to the public output. Public pages are in English. The first draft has been screened as conceptual analysis within the owner's standing evergreen scope; this is not a claim of a separate personal sign-off. Its publication date is intentionally unset until the real launch.

## Local use

Requires Node.js 22; the site and tests have no external npm dependencies.

```sh
npm ci --ignore-scripts
npm run check
npm run preview
```

Open `http://127.0.0.1:4173`. This is local only, not a public deployment. Preview builds are `noindex,nofollow`, have a disallow-all robots file, and expose `launchReady:false` in the site marker.

## Publish using the owner's GitHub and Vercel accounts

Install official GitHub CLI (`gh`) and Node.js 22 on the owner's computer. On a Mac with Homebrew, GitHub CLI can be installed with `brew install gh`. The launch script runs official browser sign-in flows for GitHub and Vercel. Do not send tokens or passwords in chat.

```sh
bash scripts/launch.sh --preview
```

This checks the exact account, creates only a **new private** `soheylghaemian-hue/soheylghaemian-site` repository, connects a dedicated `soheylghaemian-site` Vercel project and creates a noindex preview. It refuses an unrelated Git origin or existing target repository without a reviewed local checkout. Select the correct Vercel team yourself. No paid plans or domains are purchased.

Before production:

1. Set your approved public contact email and completed publisher/legal and privacy notices in `config/site.json`. No private email/address has been inferred or published. These checks are completeness checks, not legal advice or a legal adequacy test.
2. Confirm the working brand and text for public use, set `launchReady:true`, and set the first article's `publishedDate` to the actual launch date (`YYYY-MM-DD`). Commit and push these deliberate changes to the dedicated repository.
3. Run:

```sh
bash scripts/launch.sh --production
```

The script deploys to Vercel, adds the exact domain to the dedicated project, asks Vercel for the required DNS configuration and verifies the live site and article. If the domain is assigned elsewhere or ownership/DNS is unverified, it stops without a forced reassignment. Update only the necessary domain-specific DNS records in the registrar account, preserve MX/SPF/DKIM/DMARC/email configuration, then re-run:

```sh
node scripts/verify-live.mjs
```

Do not describe a Vercel preview URL as the live `soheylghaemian.com` site. No old cached GIGBAY page is accepted as evidence of this site being live.

## Daily editorial pipeline

`daily.yml` is scheduled at 06:17 UTC (local time shifts with daylight saving). GitHub schedules can be delayed or skipped and are not an exact-time SLA. The file must be on the default `main` branch. Default activation is OFF.

When enabled:

1. Freshly verify the exact live English domain and its site identity.
2. Recover a previously staged but unverified deployment before attempting a new article.
3. Check the local calendar day in Europe/Berlin; at most one new article is staged for that day, including manual retries.
4. Select an unused reviewed topic. Use a pre-screened queue entry or call the configured model to draft an original article from the approved internal reasoning register.
5. Run a separate model screening pass plus deterministic checks for structure, source IDs, unsafe markup, suspicious claims, duplicates and stale reviews. These are screens, **not a guarantee of factual accuracy**.
6. Stage only a new `content/articles/<slug>.json`, run tests/build, commit and fast-forward push. Never overwrite existing articles or force push.
7. Trigger a private Vercel Deploy Hook explicitly if the target is not already live. This does not rely on a second GitHub Actions workflow firing from `GITHUB_TOKEN` commits.
8. Read back the exact public URL, canonical, English language, content hash, title and every paragraph. Report a live URL only after this succeeds.

Routine autonomous writing is restricted to original conceptual analysis grounded in the supplied owner-approved reasoning. This implementation does **not** autonomously verify new external factual claims. Biographical material, third-party names, client stories, legal disputes, statistics, credentials and new service promises require human review. A full knowledge base, research/SERP provider and Search Console integration are not silently assumed to exist. No guarantee of Google ranking, removal or de-indexing is made.

The initial topic queue contains 12 defined topics (one already used by the seed article), not an unlimited content generator. When exhausted, the run fails visibly instead of recycling or publishing filler. Source-grounded research topics can be added after their facts and sources are reviewed.

## Activate, test, pause

Review and explicitly enable `enabled` and `automaticRoutinePublication` in `config/editor.json`, then commit and push the change. Create a Vercel Deploy Hook for this repository's `main` branch in the dedicated project's Settings → Git. Keep the URL secret.

```sh
bash scripts/activate-daily.sh
```

The script requests `OPENAI_API_KEY`, `VERCEL_DEPLOY_HOOK` and a supported model ID through local GitHub CLI prompts. The authorizing owner must review possible API/platform charges. No model IDs, balances, secrets or subscription permissions are guessed. It does not run publication until activated.

Perform one controlled live run and inspect its Actions summary. A staged commit is not the same as a verified public article. If live verification fails, recover that article before starting a new one; do not bulk-publish a backlog.

Pause subsequent runs (also cancel any already-running job in GitHub Actions):

```sh
gh variable set PUBLISH_ENABLED --repo soheylghaemian-hue/soheylghaemian-site --body false
```

Revert an erroneous article with a reviewed Git revert and redeploy. Do not remove unrelated old pages or submit unsupported legal/removal complaints. Depend on neither fake reviews nor link schemes nor misleading affiliations.

## Explicit limits

- Search Console reporting / search-position monitoring / evidence-based removal requests are not implemented in this release.
- No automatic ownership override, DNS purchase or registrar connection.
- Automatic model screening can miss issues; retain human audits and use the manual queue for sensitive topics.
- First production release still needs genuine public contact/publisher/privacy text. Placeholder notices cannot pass the production check.
- Protected branches may refuse the publishing push. Do not weaken protection automatically: use a reviewed publishing branch/release arrangement instead.
- If Vercel or GitHub requires a plan change or permissions, obtain the owner's authorization separately.

## Primary implementation references

- https://vercel.com/docs/git/vercel-for-github
- https://vercel.com/docs/cli/git
- https://vercel.com/docs/deploy-hooks
- https://vercel.com/docs/project-configuration/vercel-json
- https://vercel.com/docs/projects/deploy-from-cli
- https://cli.github.com/manual/gh_repo_create
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://developers.openai.com/api/reference/resources/responses/methods/create

ENDGAME is a developing advisory application of established principles, not a claim of a scientifically validated, uniquely original or guaranteed result-producing methodology.
