'use strict';
const { initializeApp } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { removePlayer } = require('./player-deletion');
const { getAuth } = require('firebase-admin/auth');
const { getDatabaseWithUrl } = require('firebase-admin/database');
const { HttpsError, onCall } = require('firebase-functions/v2/https');
const { handle } = require('./player-email');

const app = initializeApp();
function services() {
  const project = app.options.projectId || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  let databaseURL = 'https://usairsoftfield.firebaseio.com';
  if (process.env.FUNCTIONS_EMULATOR === 'true') {
    if (!project?.startsWith('demo-') || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
      throw new HttpsError('failed-precondition', 'Local testing requires a demo project and both Auth and Database emulators.');
    }
    databaseURL = app.options.databaseURL || `https://${project}-default-rtdb.firebaseio.com`;
  } else if (project !== 'usairsoftfield') {
    throw new HttpsError('failed-precondition', 'Deploy this function to the official USAW Firebase project.');
  }
  return { auth: getAuth(app), db: getDatabaseWithUrl(databaseURL, app) };
}

exports.updatePlayerSignInEmail = onCall({ region: 'us-central1', timeoutSeconds: 30 }, request =>
  handle(request, services()));

exports.permanentlyDeletePlayerAccount = onCall({
  region: 'us-central1', timeoutSeconds: 120,
  serviceAccount: '874564019415-compute@developer.gserviceaccount.com',
}, request => {
  const dependencies = services();
  const emulator = process.env.FUNCTIONS_EMULATOR === 'true';
  if (emulator && !process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    throw new HttpsError('failed-precondition', 'Local deletion testing requires a Storage emulator.');
  }
  const bucket = emulator ? (app.options.storageBucket || `${process.env.GCLOUD_PROJECT}.appspot.com`) : 'usairsoftfield.appspot.com';
  return removePlayer(request, {
    ...dependencies,
    removeAvatar: uid => getStorage(app).bucket(bucket).file(`images/${uid}/profilepic.png`).delete({ ignoreNotFound: true }),
  });
});
