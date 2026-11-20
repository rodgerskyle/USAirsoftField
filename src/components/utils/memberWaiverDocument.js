import { waiverAge } from './waiverAge';

// Signup and renewal use the canvas field names. The PDF renderer expects
// the same participant and guardian fields as an individual digital waiver.
export function memberWaiverDocument({ fname, lname, email, address, city, state, zipcode, phone, dob,
    pgname, pgphone, participantImg, pgImg }) {
    const signature = value => typeof value === 'string' && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]/.test(value);
    const age = waiverAge(dob);
    if (!fname.trim() || !lname.trim() || age === null ||
        !signature(participantImg) || (age < 18 && (!pgname.trim() || !signature(pgImg)))) {
        throw new Error('Complete the participant details and all required signatures.');
    }
    return {
        name: (fname.trim() + ' ' + lname.trim()), email, address, city, state, zipcode, phone, dob, age,
        participantSignature: participantImg,
        ...(age < 18 && { guardian: { name: pgname.trim(), phone: pgphone, signature: pgImg } }),
    };
}

export const memberWaiverMetadata = { contentType: 'application/pdf', customMetadata: { usawSignedMemberForm: 'v1' } };
