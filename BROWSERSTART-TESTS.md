# Browser-start verification — 11 October 2026

Command: `VERCEL_ENV=production npm run check:vercel`
Runtime: Node.js v22.16.0, local execution only.

Result: 54 tests passed; 0 failed. Nine HTML pages built in application preview mode.
Verified: an initial main-branch import remains noindex while launchReady is false;
activation does not bypass publisher/contact/privacy checks; Vercel Preview environment
remains noindex after activation; nonboolean launch switches are rejected.

The workflow is OFF. No API credential, GitHub write, Vercel deployment or domain
change was made. No new browser rendering or live model invocation was performed.
The website templates, assets and article data match the preceding accepted package.
