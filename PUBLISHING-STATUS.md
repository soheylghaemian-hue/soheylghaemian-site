# Bilingual publishing repair — 12 October 2026

Technical support is implemented; automatic publication remains disabled until the real prerequisites pass. This change does not activate launch, publish any article, alter DNS, migrate existing article URLs or change the homepage.

## New publication contract

One JSON record under `content/articles/` represents one contribution with English copy, `translations.de` and the same registered local image. It produces `/en/blog/<english-slug>/` and `/de/blog/<german-slug>/`, separate titles/descriptions/alt text/canonicals, reciprocal hreflang and BlogPosting metadata. Existing `/insights/` articles stay at their original addresses. `/blog/` remains the main overview; `/en/blog/` and `/de/blog/` are language indexes. Legacy undated essays are never silently assigned dates.

The daily workflow uses one serialized publisher, runs at 06:17 UTC, and counts calendar dates in Europe/Berlin. It prepares and stages at most one contribution per day. A prior unverified contribution is recovered first. There are no backlog dumps, force pushes, automatic branch-protection changes, or writes outside the one new article record. Existing homepage copy and its legacy article selection remain unchanged by new bilingual contributions.

The exact apex domain is always requested first. Only one HTTPS redirect to `www.soheylghaemian.com`, preserving the path and query, is permitted. Other origins, changed paths, repeated redirects and non-production markers fail closed. The same site ID, origin and launch marker are required; a HTTP 200 alone is insufficient.

The final check reads both language URLs, full ordered bodies, canonical URLs, hreflang, title, language, image attribution and image bytes. Success produces `agent/out/receipt.json` and a GitHub Actions summary with the actual EN/DE URLs. A failed deployment never produces a successful receipt.

## Current blockers requiring real account/content input

- `config/site.json` still has `launchReady:false` and empty owner-approved public contact, publisher and privacy text. These are existing implementation checks, not a new legal assessment. They must not be filled with guessed addresses or boilerplate presented as approved.
- The seed article is undated. Its date must be the real, deliberately authorized initial publication day.
- GitHub had no repository secrets or variables at audit time. The publisher needs an owner-provided `OPENAI_API_KEY`, a supported `OPENAI_MODEL`, and a `VERCEL_DEPLOY_HOOK` for this exact project's main branch. The verified Vercel project ID is `prj_QF825pmF1DLvcdbAWpnTRqvtZryS`; hooks for any other project are rejected. Do not borrow another project's key, expose secret values, upgrade plans or incur unapproved API charges.
- Keep the old ChatGPT channel drafting-only; this GitHub pipeline must be the sole publisher.

## Activation after those inputs are supplied

1. Complete approved public notices and the real initial article date in a separately reviewed change; validate a production build without changing unrelated pages.
2. Confirm the same Vercel project and main branch. Store keys/hook using GitHub's secure secret inputs. No secret belongs in this file or chat.
3. Commit the deliberate policy switches `enabled:true` and `automaticRoutinePublication:true`; verify the live marker reports `launchReady:true` on the same site identity. Do not enable them merely to bypass failed prerequisites.
4. Set `PUBLISH_ENABLED=true`, run one controlled manual `daily.yml` job, and require both actual URLs in the verified receipt. Then the schedule can operate within the same gates. Pause by setting `PUBLISH_ENABLED=false` and separately cancelling any currently running job.

Images are an explicit, reviewed finite register in `config/images.json`, including topics, licence links, attribution, localised alt text and SHA-256. The initial architecture photograph is Adrian Boliston's Tate Modern staircase, CC BY 2.0, resized to 1280 pixels. Source and licence: https://commons.wikimedia.org/wiki/File:Curved_concrete_stairs_Blavatnik_building_at_the_Tate_Modern_2025-03-18.jpg and https://creativecommons.org/licenses/by/2.0/. Topics without an approved image stop before model requests; extend the register with verified relevant photography rather than claiming unlimited image coverage.

## Validation

The prior suite and bilingual tests pass. Tests cover exact redirects, wrong-site redirects, changed translation review hashes, unsafe DE input, missing or altered licensed images, paired URL output, unchanged homepage, one-file staging, same-day retries, rejecting English-only candidates, both complete article bodies and image-byte verification. Existing public files were compared byte-for-byte against main; only the sitemap/marker and new language pages differ. Paid model calls, real publication and final production read-back are pending the missing inputs above.
