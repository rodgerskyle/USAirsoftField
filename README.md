This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## USAW player and staff tools

Player Hub headlines installation of the Field Companion. Its QR image at `public/assets/usaw-companion-install-qr.png` targets `https://app.usairsoftfield.com/#install`.

The public comparison and milestone pages use the Companion's restricted player projections. Group check-in uses the verified account to prepare a private arrival list. Staff find groups through the existing check-in page and verify each player individually. Rotation planning and the briefing builder are native panels inside the unlocked staff field tools, using `/api/field-mission-tools`.

The illustrated rules retain all published sections. `src/components/Pages/RulesClassic.js` preserves the previous rules component byte for byte, with its original rule styles in `RulesClassic.backup.css`. The previous presentation remains accessible at `/information/rules/classic`.

Compare Players searches registered names, public display names, usernames, player IDs and official player links through `/api/leaderboard?lookup=players`. The selection card links to the public milestone record. The illustrated rules use `src/components/constants/rules-catalog.js`, matching the Companion catalog. Its test checks the complete descriptions against the published rules.

Staff can open a birthday or private booking in **Field Operations → Party Calendar** and choose **Open group check-in**. Enter the organizer’s group code and confirm the booking. Group members see its time and expected size. Calendar edits refresh linked groups, and a moved or removed reservation requires staff review.

New rank promotion dates are recorded by the existing score transaction in `rankMilestones`. Earlier promotion dates may be absent. The website and Companion use matching promotion helpers, and score corrections remove a recorded promotion when its point threshold is no longer met.

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
