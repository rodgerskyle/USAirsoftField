// A receipt links the submission to one private waiting ticket. Staff verify it
// against the signed agreement before the participant can be admitted.
export async function sendDeskReceipt(token, form) {
  const name=form.name.trim();
  const normalized=name.normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase();
  const identity=JSON.stringify([normalized,form.additionalFields.dob,form.participantSignature]);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)));
  const claim='signature_'+Array.from(digest,n=>n.toString(16).padStart(2,'0')).join('');
  const response=await fetch('https://app.usairsoftfield.com/api/waivers/desk-receipt',{
    method:'POST',headers:{Authorization:'Desk '+token,'Content-Type':'application/json'},
    credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',
    body:JSON.stringify({name,claim}),
  });
  if (!response.ok) throw new Error('Return to the check-in desk with your confirmation.');
}
