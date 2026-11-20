# Player sign-in email administration

This directory deploys the website's `updatePlayerSignInEmail` HTTPS callable to `us-central1` in the `usairsoftfield` Firebase project. It uses the function's runtime service account to access Firebase Authentication and the official Realtime Database at `https://usairsoftfield.firebaseio.com`.

## Deployment

From this directory, use Node.js 22 and a Firebase CLI authenticated to the official project. The deploy command selects the one callable in its own codebase.

```sh
npm ci --prefix functions
npm test --prefix functions
firebase deploy --config firebase.json --project usairsoftfield --only functions:admin-player-email:updatePlayerSignInEmail
```

The deployer needs permission to deploy second-generation functions and use the selected runtime service account. The runtime service account needs Firebase Authentication user read/update access and read/write access to the official Realtime Database. If deployment or a capability check reports insufficient permissions, the project owner should check the selected project, runtime service account and associated IAM grants.

## Who can change an email

The caller must have an active sign-in, an active official `users/{uid}/roles/ADMIN` profile role and an administrator or superuser privilege on the Firebase Auth user record. The function reads these values on each request. It accepts Auth custom claims named `admin` or `super` (case-insensitive), or the equivalent role under `role` or `roles` as a name, list of names or map of enabled flags. When an existing admin can see the website's player management screen but cannot edit emails, the project owner should check the Auth record and the site's existing Super → Upgrade to Admin provisioner. The production project's provisioned claim format must be checked by its owner.

The target must be another active player with an existing email-based sign-in and an active profile. Privileged profile roles and recognized staff Auth claims protect a target independently. The official Database rules should restrict client writes to authorization fields, the account-removal flag and the per-player operation marker `_playerSignInEmailLease`. Check for inherited write permissions at parent paths when reviewing those rules.

## Request and recovery

A signed-in administrator can call `{action: "capabilities"}` to check access without reading or changing a player. It returns `{operation: "updatePlayerSignInEmail", version: 1}`.

A mutation supplies the selected player's `uid`, new `email` and the `expectedEmail` shown when the profile opened. All three are required. An empty expected value is supported for a profile missing an email. The callable reads both services, updates the existing sign-in UID and profile, and confirms both stored addresses before returning `verified: true`. This response flag means the two saved addresses agree. A changed sign-in email resets Firebase Auth's email verification so the player can verify their new address.

If the call has an uncertain outcome, retry with the same values. A request can resume immediately after a confirmed Auth write with a failed profile save. An ambiguous Auth write holds the operation for up to two minutes before retry. A different change can replace an expired operation when both stored addresses agree with the expected or requested address. If an unexpected address appeared, reload the player and have the account owner confirm the actual sign-in address before editing again. Firebase Authentication and Realtime Database have separate commits. The operation marker coordinates calls through this function; external account editors should avoid making simultaneous changes to the same player.

For local end-to-end testing, use a `demo-` project and set the Functions, Auth and Realtime Database emulator environment. Emulator mode requires both `FIREBASE_AUTH_EMULATOR_HOST` and `FIREBASE_DATABASE_EMULATOR_HOST` and never needs production credentials.
