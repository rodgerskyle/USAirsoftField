This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## USAW player and staff tools

Player Hub headlines installation of the Field Companion. Its QR image at `public/assets/usaw-companion-install-qr.png` targets `https://app.usairsoftfield.com/#install`.

Compare Players, Milestones and Game History use shared player services hosted by the Companion. Guests and signed-in players can create or join a private arrival list under **Group Check-In**. A guest organizer can reopen the group in the same browser on the same site. The invitation code works across the website and Companion. New codes use the group name and expected headcount. Each group expires five days after creation. In Player Check-In, staff can search by group name or code, use the players’ experience estimates, place the whole group on one side, and move individuals afterward. Staff still verify each player at arrival. Rotation planning and the briefing builder are native panels inside the unlocked staff field tools, using `/api/field-mission-tools`.

In **Badge Awards**, **Wins & Losses**, and the **Field Operations** tools, staff can select **Use my admin account**. Each desk verifies the signed-in Firebase account against the official admin role. When the sign-in is too old, enter that account’s password to verify it with Firebase. The site sends the identity token to the Companion to obtain the appropriate short-lived staff session. Staff access is independent of paid player membership. Existing shared staff unlocks remain available.

In **Wins & Losses**, select a game mode and player to see the round’s eligible patches. Select the artwork for each patch earned and record the win or loss. Staff badge access is required to grant awards. A first award requires a reason. Any pending patch can be retried on the score desk after the score is saved.

**US Airsoft World Battle Badges** appear in both staff Badge Awards and Wins & Losses. Select an active member and their Camo or Solid side, then use the MVP award button. Both desks share one MVP slot per Pacific field date with the Companion. Staff can correct a mistaken selection for the day and award the intended player. Recording the round result and awarding its ordinary patches are separate actions from choosing the daily MVP.

Player profiles show the eight colored Battle Badges in award order, followed by Tower of Power on the ninth award. Each subsequent MVP earns a silver star. Every twenty silver stars convert to one gold star, with the remaining silver stars displayed alongside it. For example, a player with 30 MVP awards has Tower of Power, one gold star and one silver star. Battle Badges have their own ledger and do not contribute to score, prestige or the virtual patch leaderboard.

The illustrated rules retain all published sections. `src/components/Pages/RulesClassic.js` preserves the previous rules component byte for byte, with its original rule styles in `RulesClassic.backup.css`. The previous presentation remains accessible at `/information/rules/classic`.

Compare Players searches registered names, public display names, usernames, player IDs and official player links through `/api/leaderboard?lookup=players`. The selection card links to the public milestone record. The illustrated rules use `src/components/constants/rules-catalog.js`, matching the Companion catalog. Its test checks the complete descriptions against the published rules.

Open a saved booking in **Field Operations → Party Calendar**. Use **Create group code** or **Link existing group**, then copy the invitation code into group check-in. **Field Operations → Manage Groups** lets staff find a group by date, rename it, add or remove walk-ons, or confirm removal of its roster. The reservation and completed individual check-ins stay on file. Group members see the linked time and expected size. Moved or cancelled bookings require staff review.

Player profiles show current and next ranks on the progress bar. The milestone timeline uses recorded promotion and free-pass awards first. For older records, it can recover dates when the dated score totals reconcile with career points. Achievements with an unknown date appear separately. The available pass balance changes on redemption and is separate from the award history.

**Player profile → Game history** requests `/api/player-game-history` and loads 25 entries at a time, newest first. New wins and losses store an individual score event in the same player transaction as the points, result counters and receipt. Corrections void the matching event. Earlier records can provide only day, month or lifetime totals. The service subtracts individually shown results from the corresponding aggregate to avoid counting them twice. The client removes the load button at the last page.

**Staff operations → Game day → Wins & Losses** opens the website score desk at `/admin/scores`. Choose the game mode and the player’s field team (yellow for Camo, blue for Solid), identify the member by card, name or ID, and select **Record win** or **Record loss**. Switch the team as the other side comes through. **Start new round** lets the same players score again. **Clear entries** clears the desk view and keeps pending submissions available for review. Both old scoring bookmarks open this desk.

The Firebase transaction saves the score and its individual `gameResultHistory` entry together. After confirmation, the website sends the event’s player ID, field date and event ID to `/api/staff-round-result-receipts`. The Companion verifies the administrator, reads the official result, places it in the player’s private receipt inbox and attempts push delivery to enrolled devices. Receipt preferences control alerts. Opening the inbox and scheduled reconciliation can also recover a missed sync. **Review results** lets staff correct the specific round. **Flagged round receipts** shows reports players submitted from the Companion.

## Available Scripts

In the project directory, you can run with:

### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: https://facebook.github.io/create-react-app/docs/code-splitting

### Analyzing the Bundle Size

This section has moved here: https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size

### Making a Progressive Web App

This section has moved here: https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app

### Advanced Configuration

This section has moved here: https://facebook.github.io/create-react-app/docs/advanced-configuration

### Deployment

This section has moved here: https://facebook.github.io/create-react-app/docs/deployment

### `npm run build` fails to minify

This section has moved here: https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify
