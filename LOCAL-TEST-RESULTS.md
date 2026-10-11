# Local verification — 11 October 2026

## Passed

- 50 automated Node.js tests; 0 failed, 0 skipped.
- Dependency-free preview build: 9 HTML pages, including the 404 page; 1 English article.
- Production build paths tested using isolated, explicitly synthetic configurations. No test operator details were used in the deliverable site configuration.
- Both GitHub workflow YAML files parsed successfully.
- Both shell setup scripts passed Bash syntax validation.
- Eight generated pages rendered in Chromium at desktop width 1440 and mobile width 390; no horizontal overflow, one H1 per page, English language metadata.
- Mobile menu toggle passed; no JavaScript page errors in the final render run.
- All internal page targets referenced by the rendered pages exist in the generated output.
- No font files, generated portraits, secrets or internal editorial notes included in public output.

## What this does NOT prove

- GitHub repository creation or pushes: not executed. The proposed repository lookup returned 404 (not found or not accessible).
- Vercel authentication, account/project creation, Git integration and live builds: not executed.
- Domain/DNS/certificate configuration: not executed or changed.
- Actual model API generation: not executed; provider behavior used mocked responses in tests.
- Real deploy-hook invocation and production read-back: not executed; mocked in tests.
- Browser network navigation to localhost was unavailable under this environment's browser policy. Visual and DOM checks therefore rendered the generated local HTML/CSS/JS in memory. This is not a browser end-to-end test of a deployed server.
- Search Console, indexation or ranking improvement: not implemented/verified in this release.

## Safety checks exercised

The tests cover publication disabled, wrong domain/site identity, preview mistaken for production, missing credentials/hook, unsafe markup/path/unknown source, stale review, duplicate topic/body, Berlin calendar-day limits, same-day reruns, recovery of a prior unverified article, committed-but-not-live state, changed public text, missing publication dates, and failed/successful mocked deployment read-back.

Default state: launchReady=false; automatic daily publication disabled. Operator contact and legal/privacy notices must be supplied before the production gate opens. The first article's date remains unset until the actual launch.
