# USAW website maintainer guide

The USAW website serves field information, public player features, and staff workflows. It shares player identity and field data with the USAW Field Companion. This repository contains the React website and its browser-side integrations.

## Local development

Use a maintained Node release compatible with the Firebase SDK. Match the Node and npm versions configured in your deployment environment. Install from the lockfile and start the development server from the repository root. The installer flag accommodates peer dependencies in the existing React 17 dependency tree.

```sh
npm ci --legacy-peer-deps
npm start
```

Open [http://localhost:3000](http://localhost:3000). For a build against a test backend, obtain the Firebase web app configuration for a separate test project and put it in the ignored `.env` file or your shell environment. Restart the development server after changing configuration. The Firebase client is initialized in [`src/components/Firebase/firebase.js`](../src/components/Firebase/firebase.js).

| Environment variable | Purpose |
| --- | --- |
| `REACT_APP_API_KEY`, `REACT_APP_AUTH_DOMAIN`, `REACT_APP_PROJECT_ID`, `REACT_APP_APP_ID` | Firebase web app and Authentication configuration. |
| `REACT_APP_DATABASE_URL`, `REACT_APP_STORAGE_BUCKET` | Realtime Database instance and Cloud Storage bucket. |
| `REACT_APP_MESSAGING_SENDER_ID`, `REACT_APP_MEASUREMENT_ID` | Firebase app identifiers, as configured for the project. |
| `REACT_APP_RECAPTCHA_V2_SITE_KEY`, `REACT_APP_RECAPTCHA_V3_SITE_KEY` | Public site keys used by the login and waiver forms. |
| `REACT_APP_GOOGLE_API_KEY` | Public browser key for the Google Maps integration. |
| `REACT_APP_USAW_BADGE_API_URL` | Optional override for the badge bridge endpoint. |

Create React App embeds `REACT_APP_*` values in the browser bundle. Keep passwords, service-account credentials, reCAPTCHA server secrets, and bridge authentication tokens in their server-side secret stores. Limit browser API keys to the intended services and origins where supported. Firebase Security Rules control access to database and Storage data. [Create React App environment variables](https://create-react-app.dev/docs/adding-custom-environment-variables/) · [Firebase API keys](https://firebase.google.com/docs/projects/api-keys)

Some adapters use fixed hosted URLs. Before testing writes to the badge, display-name, calendar, team, or prestige services, confirm each adapter points to an appropriate test service and that the Firebase project used by that service matches your test accounts. Use synthetic players, teams, waivers, and results.

## Code map

| Area | Entry points | Responsibility |
| --- | --- | --- |
| App shell | [`src/index.js`](../src/index.js), [`src/App.js`](../src/App.js), [`src/Navigation.js`](../src/Navigation.js), [`src/Appearance.js`](../src/Appearance.js) | App and Firebase context, routes, navigation, theme, and site-wide chrome. |
| Public field pages | [`src/components/Pages`](../src/components/Pages), [`public/field-resources.json`](../public/field-resources.json) | Homepage, pricing, field map, rules, game types, and field resources. |
| Player area | [`PlayerHub.js`](../src/components/Pages/PlayerHub.js), [`PlayerProfileView.js`](../src/components/Pages/PlayerProfileView.js), [`leaderboard.js`](../src/components/Pages/leaderboard.js), [`VirtualPatches.js`](../src/components/Pages/VirtualPatches.js) | `/player-hub`, `/profilelookup/:id`, `/account`, `/profilesettings`, `/leaderboard`, and `/virtual-patches`. |
| Schedule and teams | [`Schedule.js`](../src/components/Pages/Schedule.js), [`teamDirectory.js`](../src/components/constants/teamDirectory.js) | `/schedule`, `/teams`, team details, and Companion integrations. |
| Staff | [`Admin.js`](../src/components/Pages/Admin.js), [`ScoreEntry.js`](../src/components/Pages/ScoreEntry.js), [`LeaderboardTvDisplay.js`](../src/components/Pages/LeaderboardTvDisplay.js) | Admin home, score entry, member and waiver workflows, and the TV standings view. The waiver desk also uses `/dashboard` routes. |
| Firebase adapters and session | [`src/components/Firebase`](../src/components/Firebase), [`src/components/session`](../src/components/session), [`roles.js`](../src/components/constants/roles.js) | Firebase references and callable Functions, session context, and browser route guards. |

React Router uses `BrowserRouter`. Configure the host to serve `index.html` for direct requests to browser routes such as `/profilelookup/:id` and `/admin/leaderboard-tv`, while keeping normal asset and API responses intact. The website unregisters its service worker in `src/index.js`. The installable Companion has its own service worker and release cycle.

## Firebase identity and access

Firebase Auth supplies the signed-in UID. Player profile and role data use the matching record under `users/{uid}`. The session clears the old browser-cached profile and watches the matching Firebase record once Auth resolves. Route guards for staff tools such as scoring and TV standings use that session and respond to role changes. Firebase rules and callable Functions must enforce authorization independently of the browser.

The Firebase wrapper also references `teams`, `schedule`, `calendar`, `rentals`, and waiver and mailing records. Player and team photos, waiver documents, and signatures use Cloud Storage. The browser calls Firebase Functions for features such as team management, profile management, account provisioning, waiver submission, and mail. This repository contains clients for those services. Its tracked source does not include the deployed Realtime Database rules, Storage rules, or Firebase Functions implementation.

When changing a protected feature, review the deployed rules or versioned backend with the Firebase project owner. Check access for signed-out visitors, ordinary members, account owners, waiver staff, and admins. Include direct requests that attempt to read another member's private fields, assign a role, or update a staff-only field. Check collection-level reads separately from per-record reads. With Realtime Database, an allowed parent read exposes its descendants, including fields filtered out of the rendered page. Keep public projections limited to the fields the website actually displays. Use local emulators or the test project for permission tests. [Realtime Database Security Rules](https://firebase.google.com/docs/database/security) · [Cloud Storage Security Rules](https://firebase.google.com/docs/storage/security) · [Callable Cloud Functions](https://firebase.google.com/docs/functions/callable)

## Production security changes

### Separate public player data from staff and member records

Plan a shared public data contract for standings, profiles, teams, and patches before changing Firebase rules. With Realtime Database, an allowed parent read includes child fields. Confirm what the existing readers require before deploying a revised contract.

1. Define a public projection backed by a dedicated Firebase collection or a server endpoint. Allowlist the player ID, chosen public name, approved avatar and team summary, score aggregates, and public rank or patch metadata used by the views. Compute the required monthly totals server-side, or project a separate approved public game history if the profile feed requires one. Keep contact details, dates of birth, membership renewal or payment information, waiver records, privileged account metadata, and PINs in protected records. Review any legacy display of a real name or renewal date with the field owner during this change.
2. Backfill the projection and keep it updated from a trusted writer when a score, membership visibility, team, display name, avatar, prestige level, or featured badge changes. Use approved test data first and account for deleted players and records removed from public view. The trusted writer should own the public record and enforce the public field allowlist on every update.
3. Move the public consumers in both releases. Check the website profile lookup, public leaderboard, TV standings, virtual patch standings, team profiles, and the Companion's player and team views. Verify that staff scoring, renewals, QR verification, and account views continue to work with their authorized data sources.
4. Once both clients read the projection, restrict full Firebase user records to approved owner and staff access with the Firebase project owner. Remove broad reads at ancestor paths and check both collection and direct-child access. Roll back faulty client or projection releases while retaining the new privacy protections.

### Review privileged operations and waiver desk PINs

Review the Rules and callable Functions that permit player scoring, membership renewals, waivers, rentals, and privilege changes. Keep grants, revocations, and related records under a trusted backend operation with explicit caller authorization and an audit trail. Verify grant, downgrade, revocation, and partial-failure recovery with the Firebase project owner. Give account owners write access only to approved editable profile fields. Enforce membership status and staff role where a protected action runs, including direct API calls. Use the Firebase test project to prove that anonymous visitors see the public projection, an account owner sees only their own private record, an expired member cannot use gated member services, an active member cannot invoke staff actions, and staff permissions match the operation. Exercise Firebase Storage access to private waiver images, signatures, and player uploads separately.

Rotate any PINs or staff credentials exposed outside the trusted system and revoke affected sessions through the identity provider. Treat browser-only prompts as UI locks. For a PIN that enforces access, use server-side verification, rate limits, and server-only storage. Staff reauthentication can serve the same purpose.

### Rental deposits and payment handling

Use the designated terminal when handling rental deposits. Discuss any changes to deposit processing and historical records with the payment lead and Firebase project owner. Review account access and data retention with the payment lead before changing the rental workflow. [PCI Security Standards Council guidance](https://www.pcisecuritystandards.org/faqs/1280/)

### Set response headers at the production host

Use a CloudFront response headers policy on the website behavior, including SPA fallback responses. Verify HTTPS redirects, then configure HSTS with a scope approved by the domain owner, `X-Content-Type-Options: nosniff`, a referrer policy such as `strict-origin-when-cross-origin`, and a `Permissions-Policy` for features the site needs. Restrict framing with CSP `frame-ancestors` and a compatible `X-Frame-Options` value. Preserve same-origin camera access where tested staff scanner or waiver workflows use it. [CloudFront response headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/modifying-response-headers.html)

Start a Content Security Policy in report-only mode on a test distribution, including the approved Firebase, Companion, bridge, map, video, and reCAPTCHA origins the current build requires. Check browser requests for the home and field pages, player sign-in, staff score and waiver screens, and the TV page. Promote the tested policy to enforcement and verify the delivered headers on the production homepage and a direct deep route. Review caching separately for any protected API served by the host.

```sh
curl -fsSI https://www.usairsoftfield.com/
curl -fsSI https://www.usairsoftfield.com/admin/leaderboard-tv
```

## Staff scoring and TV standings

`/admin/enterwins` and `/admin/enterlosses` use the same `ScoreEntry` component. Staff can search for a player, enter a player ID, or scan a card with a keyboard-wedge scanner. [`scoreCards.js`](../src/components/constants/scoreCards.js) recognizes supported profile URLs and validates a digital member card with the Companion verification endpoint. Scanning and selecting resolve the player before the result is submitted.

[`scoreRecording.js`](../src/components/constants/scoreRecording.js) contains the scoring transaction. It updates the existing player row with the lifetime win or loss, points, free games, and the day's game history in one write. A win adds 10 points, a loss adds 3, and crossing a 450-point threshold earns a free game. Daily history uses the field's Pacific time and the legacy zero-based month format `YYYY-M-D`. For example, November 13, 2026 uses `2026-10-13`. The monthly standings depend on that format. The transaction callback can run more than once during a retry, so keep it free of side effects.

The regular leaderboard and `/admin/leaderboard-tv` share the standings data and player enrichment in `leaderboard.js`. The TV route offers all-time and monthly views, scrolling, and browser fullscreen. Those controls change only the display. Rank and prestige are projected from player data while the all-time standings use lifetime points. A prestige action affects the rank cycle and preserves lifetime standings.

## Shared services

| Feature | Website code | Owner and data flow |
| --- | --- | --- |
| Field schedule | [`Schedule.js`](../src/components/Pages/Schedule.js), [`fieldCalendar.js`](../src/components/constants/fieldCalendar.js) | Staff edits go to Firebase `schedule`, then publish to Companion `/api/field-calendar`. Signed-in users can use the published view when the direct Firebase read fails. The staff birthday calendar uses Firebase `calendar`. |
| Teams | [`teamDirectory.js`](../src/components/constants/teamDirectory.js) | Combines legacy Firebase team and roster information with the Companion team directory. `/api/player-team` supplies a Companion team's public summary for a player without a legacy team assignment. |
| Virtual patches and display names | [`playerBadges.js`](../src/components/constants/playerBadges.js), [`playerDisplayNames.js`](../src/components/constants/playerDisplayNames.js) | The website uses the hosted bridge for `/api/player-badges` and `/api/player-display-names`. Shared awards, selected patches, and names come from the Companion-side service. The badge catalog and images in this checkout provide presentation metadata. |
| Prestige and member cards | [`playerPrestige.js`](../src/components/constants/playerPrestige.js), [`scoreCards.js`](../src/components/constants/scoreCards.js) | The website uses Companion `/api/player-prestige` for ranking metadata and `/api/member-card/verify` for digital card verification. |

For a new patch, use the same identifier in [`badgeCatalog.json`](../src/components/constants/badgeCatalog.json), the Companion catalog, and [`public/badges`](../public/badges). Include the thumbnail if the interface uses one. Check the patch catalog, award history, selected profile patch, and leaderboard display with fixture accounts after changing the shared contract.

Keep the website, Companion, and bridge on compatible API versions. When changing a hosted origin, update the affected adapters and server allowlists together. Verify HTTPS, exact allowed origins, Firebase sign-in, Companion installation, and member card links issued before the change. Keep body fields, authorization, and responses compatible until both clients have rolled out.

## Tests and deployment

```sh
CI=true npm test -- --watchAll=false --runInBand
CI=true npm test -- --watchAll=false --runInBand ScoreEntry scoreRecording scoreCards LeaderboardTvDisplay
npm run build
```

The tests run through Create React App and Jest. Use focused suites while editing a feature, then run the full suite and produce an optimized `build/` with the correct web app configuration. Check resolved dependency advisories with `npm audit` against the lockfile and review reachability in the browser or build tooling before changing transitive packages.

Use a branch and pull request for review. The repository does not contain the production hosting configuration. The release owner should confirm the production branch, the build command, the host's Node/npm settings, the configured frontend environment, and the SPA fallback in the hosting dashboard. The repository contains some historical `build/` files. Review the diff to keep incidental local build output out of source changes.

After deployment to [www.usairsoftfield.com](https://www.usairsoftfield.com), open the home page, public standings, profile, and schedule from a fresh browser and refresh a deep route. Confirm the expected asset build is live. In the test project, also exercise account ownership, admin sign-in, scanner verification, a fixture win/loss, schedule publishing, public badge browsing, and the TV all-time/monthly toggle. Verify any changed website–Companion flow from each client. For a release incident, use the deployment owner's rollback controls or revert the reviewed source change and redeploy.
