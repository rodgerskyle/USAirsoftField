# USAW player account administration

This directory deploys the website's `updatePlayerSignInEmail` and `permanentlyDeletePlayerAccount` HTTPS callables to `us-central1` in the `usairsoftfield` Firebase project. It uses the function's runtime service account to access Firebase Authentication and the official Realtime Database at `https://usairsoftfield.firebaseio.com`.

## Deployment

From this directory, use Node.js 22 and a Firebase CLI authenticated to the official project. Each deploy command selects one callable in the existing `admin-player-email` codebase.

```sh
npm ci --prefix functions
npm test --prefix functions
firebase deploy --config firebase.json --project usairsoftfield --only functions:admin-player-email:updatePlayerSignInEmail
```

The deployer needs permission to deploy second-generation functions and use the selected runtime service account. The runtime service account needs Firebase Authentication user read/update access and read/write access to the official Realtime Database. If deployment or a capability check reports insufficient permissions, the project owner should check the selected project, runtime service account and associated IAM grants.

## Deploy permanent deletion

Publish the Companion version that supports `preparePermanentDeletion` before enabling the new website action. From the root of the merged website checkout, deploy the new function with an account authorized on the USAW Firebase project.

```sh
cd firebase/admin-player-email
npm ci --prefix functions
npm test --prefix functions
firebase deploy --config firebase.json --project usairsoftfield --only functions:admin-player-email:permanentlyDeletePlayerAccount
```

The deletion callable runs as `874564019415-compute@developer.gserviceaccount.com`, the USAW runtime identity that Companion verifies. The deployer needs permission to act as this service account. It needs to read and delete Firebase Auth users, read the official database and update player and team records, and delete profile images (`storage.objects.delete` for `images/{uid}/profilepic.png` in `usairsoftfield.appspot.com`). If Cloud Run blocks the website before the callable receives the Firebase ID token, the project owner can grant invocation on this function:

```sh
gcloud functions add-invoker-policy-binding permanentlyDeletePlayerAccount --project=usairsoftfield --region=us-central1 --member=allUsers
```

Invocation lets the browser reach the callable. Each deletion still requires a valid Firebase admin sign-in and the server-side authorization checks below. An unsigned request to the deployed callable with a JSON body of `{"data":{}}` should return the structured `UNAUTHENTICATED` error. This reachability check does not select or delete a player.

## Permanently deleting a player

The caller must meet the same administrator requirements as for email edits. The request supplies one exact UID in both `playerId` and `confirmation`. Current and previously archived profiles are supported. Staff accounts, the signed-in administrator, and team owners are protected. Transfer an owned team before retrying. The caller cannot select players by email or username.

The function checks the selected UID and sends the original administrator's Firebase ID token to the official Companion `/api/staff-player-accounts` endpoint with `action: "preparePermanentDeletion"`. The callable also supplies a Google-signed ID token for its own runtime identity, bound by audience to the admin UID and selected player UID. Companion retains the waiver lookup and historical field records and cleans up the active Companion identity. The function requires a positive receipt for that UID and verifies the archive marker before it removes the field roster entries, join requests, avatar, Auth user and official profile. The on-file waiver PDF and the mailing list are separate from the avatar and account.

A successful request returns `{deleted:true, playerId}`. After a network or permission failure, retry the same player ID. An archived profile remains available for the admin to retry until the last step. A completed retry makes no further writes. A new registration using the released email or username has its own UID and is independent of the deletion. The function handles one player per confirmed request.

For end-to-end deletion tests in the Functions emulator use a demo project with Auth, Realtime Database and Storage emulators, plus `COMPANION_ACCOUNT_EMULATOR_ORIGIN` pointing to an explicitly configured loopback HTTP test server. Production uses the fixed official Companion origin.

## Who can change an email

The caller must have an active sign-in, an active official `users/{uid}/roles/ADMIN` profile role and an administrator or superuser privilege on the Firebase Auth user record. The function reads these values on each request. It accepts Auth custom claims named `admin` or `super` (case-insensitive), or the equivalent role under `role` or `roles` as a name, list of names or map of enabled flags. When an existing admin can see the website's player management screen but cannot edit emails, the project owner should check the Auth record and the site's existing Super → Upgrade to Admin provisioner. The production project's provisioned claim format must be checked by its owner.

The target must be another active player with an existing email-based sign-in and an active profile. Privileged profile roles and recognized staff Auth claims protect a target independently. The official Database rules should restrict client writes to authorization fields, the account-removal flag and the per-player operation marker `_playerSignInEmailLease`. Check for inherited write permissions at parent paths when reviewing those rules.

## Request and recovery

A signed-in administrator can call `{action: "capabilities"}` to check access without reading or changing a player. It returns `{operation: "updatePlayerSignInEmail", version: 1}`.

A mutation supplies the selected player's `uid`, new `email` and the `expectedEmail` shown when the profile opened. All three are required. An empty expected value is supported for a profile missing an email. The callable reads both services, updates the existing sign-in UID and profile, and confirms both stored addresses before returning `verified: true`. This response flag means the two saved addresses agree. A changed sign-in email resets Firebase Auth's email verification so the player can verify their new address.

If the call has an uncertain outcome, retry with the same values. A request can resume immediately after a confirmed Auth write with a failed profile save. An ambiguous Auth write holds the operation for up to two minutes before retry. A different change can replace an expired operation when both stored addresses agree with the expected or requested address. If an unexpected address appeared, reload the player and have the account owner confirm the actual sign-in address before editing again. Firebase Authentication and Realtime Database have separate commits. The operation marker coordinates calls through this function; external account editors should avoid making simultaneous changes to the same player.

For local end-to-end testing, use a `demo-` project and set the Functions, Auth and Realtime Database emulator environment. Emulator mode requires both `FIREBASE_AUTH_EMULATOR_HOST` and `FIREBASE_DATABASE_EMULATOR_HOST` and never needs production credentials.
