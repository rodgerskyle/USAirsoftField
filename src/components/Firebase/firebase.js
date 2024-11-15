import { initializeApp } from 'firebase/app';
import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, sendPasswordResetEmail, updatePassword, updateEmail,
    reauthenticateWithCredential
} from 'firebase/auth';
import { ref as db_ref } from 'firebase/database';
import { get, getDatabase } from 'firebase/database';
import { ref as st_ref } from 'firebase/storage';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// import 'firebase/compat/auth';
// import 'firebase/compat/database';
// import 'firebase/compat/storage';
// import 'firebase/compat/functions';
// import 'firebase/compat/analytics'

const config = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    databaseURL: process.env.REACT_APP_DATABASE_URL,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

class Firebase {
    constructor() {
        const app = initializeApp(config)
        // app.analytics()

        this.auth = getAuth(app);
        this.db = getDatabase(app);
        this.st = getStorage(app);
        this.func = getFunctions(app);
        this.ns_auth = getAuth(app);
    }
    // *** Auth API ***
    doCreateUserWithEmailAndPassword = (email, password) =>
        createUserWithEmailAndPassword(this.auth, email, password);

    doSignInWithEmailAndPassword = (email, password) =>
        signInWithEmailAndPassword(this.auth, email, password);

    doSignOut = () => signOut(this.auth);

    doPasswordReset = email => sendPasswordResetEmail(this.auth, email);

    doPasswordUpdate = password =>
        updatePassword(this.auth.currentUser, password);

    doEmailUpdate = email =>
        updateEmail(this.auth.currentUser, email)

    doReauthenticate = (email, password) =>
        reauthenticateWithCredential(this.auth.currentUser, this.ns_auth.EmailAuthProvider.credential(email, password));

    // *** Merge Auth and DB User API *** //
    onAuthUserListener = (next, fallback) =>
        this.auth.onAuthStateChanged(authUser => {
            if (authUser) {
                get(this.user(authUser.uid))
                    .then((snapshot) => {
                        const dbUser = snapshot.val();
                        // default empty roles
                        if (!dbUser.roles) {
                            dbUser.roles = [];
                        }
                        // merge auth and db user
                        authUser = {
                            uid: authUser.uid,
                            email: authUser.email,
                            ...dbUser,
                        };
                        next(authUser);
                    });
            } else {
                fallback();
            }
        });

    // Functions API

    createTeam = () => httpsCallable(this.func, 'createTeam');

    manageTeam = () => httpsCallable(this.func, 'manageTeam');

    acceptRequest = () => httpsCallable(this.func, 'acceptRequest');

    kickMember = () => httpsCallable(this.func, 'kickMember');

    quitTeam = () => httpsCallable(this.func, 'quitTeam');

    disbandTeam = () => httpsCallable(this.func, 'disbandTeam');

    requestTeam = () => httpsCallable(this.func, 'requestTeam');

    mergeUsers = () => httpsCallable(this.func, 'mergeUsers');

    sendMail = () => httpsCallable(this.func, 'sendMail');

    createPrivilegedUser = () => httpsCallable(this.func, 'createPrivilegedUser');

    emailOptMenu = () => httpsCallable(this.func, 'emailOptMenu');

    manageProfile = () => httpsCallable(this.func, 'manageProfile');

    checkRecaptcha = () => httpsCallable(this.func, 'checkRecaptcha');

    sendReceipt = () => httpsCallable(this.func, 'sendReceipt');

    submitWaiver = () => httpsCallable(this.func, 'submitWaiver');

    // Storage Database API

    membersWaivers = pdf => st_ref(this.st, `waivers/members/${pdf}`);

    nonmembersWaivers = pdf => st_ref(this.st, `waivers/non-members/${pdf}`);

    waiversList = () => st_ref(this.st, `waivers/non-members`);

    pictures = img => st_ref(this.st, `images/${img}`);

    teamsPictures = img => st_ref(this.st, `teams/${img}`);

    emailAttachment = () => st_ref(this.st, 'email/emailattachment.png');

    signature = (filename) => st_ref(this.st, 'signatures/' + filename);

    // User API

    user = uid => db_ref(this.db, `users/${uid}`);

    users = () => db_ref(this.db, 'users');

    // Email List API

    emailList = (email) => db_ref(this.db, `emaillist/${email}`)

    emails = () => db_ref(this.db, `emaillist`)

    // Email Templates

    emailTemplateDefault = () => db_ref(this.db, `emailtemplates/default`)

    emailTemplate = (template) => db_ref(this.db, `emailtemplates/list/${template}`)

    emailTemplates = () => db_ref(this.db, `emailtemplates`)

    // Videos API

    videos = () => db_ref(this.db, 'videos/')

    // Rental Forms API

    rentals = () => db_ref(this.db, 'rentals/')

    rentalOptions = () => db_ref(this.db, 'rentals/options/')

    rentalGroups = () => db_ref(this.db, 'rentals/group/')

    rentalGroup = (i) => db_ref(this.db, 'rentals/group/' + i)

    participantsRentals = (i, id) => db_ref(this.db, 'rentals/group/' + i + '/participants/' + id)

    availableRentals = (i) => db_ref(this.db, 'rentals/group/' + i + '/available/')

    // Team API

    team = name => db_ref(this.db, `teams/${name}`);

    teams = () => db_ref(this.db, `teams`);

    // UID API

    uid = () => this.auth.currentUser.uid;

    // Waivers Amount API and validation

    numWaivers = () => db_ref(this.db, 'waivers');

    validatedWaiver = file => db_ref(this.db, `waivers/validated/${file}`);

    validatedWaivers = () => db_ref(this.db, 'waivers/validated');

    digitalWaivers = () => db_ref(this.db, 'digital_waivers');

    digitalWaiver = (ref) => db_ref(this.db, `digital_waivers/${ref}`);

    // Calendar API

    calendar = () => db_ref(this.db, `calendar`);

    calendarEvent = i => db_ref(this.db, `calendar/${i}`);

    // Schedule API

    schedule = () => db_ref(this.db, `schedule`);

    scheduleEvent = i => db_ref(this.db, `schedule/${i}`);

    waivers = () => db_ref(this.db, 'waivers/validated');

}

export default Firebase;