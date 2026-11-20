import { memberWaiverDocument } from './memberWaiverDocument';

const input = { fname: 'Ava', lname: 'Reed', dob: '2015-01-01', participantImg: 'data:image/png;base64,AA', pgname: 'Rae Reed', pgphone: '555', pgImg: 'data:image/png;base64,BB' };

test('signup and renewal produce the names and signature fields the saved PDF reads', () => {
    expect(memberWaiverDocument(input)).toMatchObject({
        name: 'Ava Reed', participantSignature: input.participantImg, guardian: { name: 'Rae Reed', phone: '555', signature: input.pgImg },
    });
    expect(() => memberWaiverDocument({ ...input, pgImg: null })).toThrow();
    expect(() => memberWaiverDocument({ ...input, participantImg: null })).toThrow();
    expect(memberWaiverDocument({ ...input, dob: '1980-07-20', pgImg: null }).guardian).toBeUndefined();
});
