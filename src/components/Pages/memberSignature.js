export async function memberToken(firebase, memberId) {
  const user = firebase.auth?.currentUser;
  if (!user || user.uid !== memberId) throw new Error('Sign in to the participant’s member account to attach this waiver.');
  const token = await user.getIdToken();
  if (firebase.auth.currentUser !== user) throw new Error('The signed-in account changed. Return to the participant’s account.');
  return token;
}

export async function submitMemberSignature(token, submissionId, waiver) {
  const response = await fetch('https://app.usairsoftfield.com/api/waivers/member-signature', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ submissionId, waiver }), credentials: 'omit', cache: 'no-store',
    redirect: 'error', referrerPolicy: 'no-referrer',
  });
  const data = await response.json().catch(() => null);
  if (response.ok && data?.success === true && data.linked === true) return;
  const failure = new Error(data?.error || 'Could not confirm the waiver. Retry this submission to check its status.');
  failure.definite = ['invalid', 'declined', 'identity', 'auth'].includes(data?.code);
  throw failure;
}
