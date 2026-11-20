// The field service decides the role from the official account. Reauthentication
// can only refresh the same Firebase identity that was already signed in.
export function matchesSignedInEmail(firebase, email) {
    const current = firebase?.auth?.currentUser?.email;
    return typeof current === 'string' && typeof email === 'string' && current.toLowerCase() === email.trim().toLowerCase();
}

export async function verifySignedInAdminIdentity(firebase, user, password) {
    const requireSameUser = () => {
        if (!user?.uid || firebase.auth.currentUser !== user) throw new Error('Your signed-in account changed. Reopen the staff tool.');
    };
    requireSameUser();
    try {
        await firebase.doReauthenticate(user.email, password);
    } catch (error) {
        if (['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(error.code)) {
            throw Object.assign(new Error('The password for your signed-in USAW account was not accepted.'), { status: 401 });
        }
        throw error;
    }
    requireSameUser();
    await user.getIdToken(true);
    requireSameUser();
}
