import { mergeRentalRoster, rentalGroupSource, rentalHasGroupEntry } from './groupRentalRoster';

const group = { id: 'party-15', name: 'Birthday Game', date: '2019-10-12', kind: 'party' };
const guest = { id: 'guest-1', displayName: 'Echo' };
const member = { id: 'member-entry', displayName: 'Echo', playerId: 'account-42' };

it('keeps same-name guests separate and persists stable identities for guests and members', () => {
    const other = { id: 'guest-2', displayName: 'Echo' };
    const players = mergeRentalRoster([], group, [guest, other, member]);
    expect(players.map(p => [p.name, p.groupId, p.groupEntryId, p.ref])).toEqual([
        ['Echo', 'party-15', 'guest-1', 'group:party-15:guest-1'],
        ['Echo', 'party-15', 'guest-2', 'group:party-15:guest-2'],
        ['Echo', 'party-15', 'member-entry', 'account-42'],
    ]);
    // A ref survives Firebase serialization and a later change of callsign.
    const restored = JSON.parse(JSON.stringify(players));
    expect(rentalHasGroupEntry(restored, group, { ...guest, displayName: 'New callsign' })).toBe(true);
    expect(rentalHasGroupEntry(restored, { ...group, id: 'another-group' }, guest)).toBe(false);
});

it('matches a manually added member by account ref and preserves assigned gear and checkout fields', () => {
    const manual = { name: 'Morgan Smith', ref: member.playerId, isMember: true, date: '2019-10-12T17:00:00Z',
        rentals: [{ key: 'mask-9', amount: 1, returned: false }], gamepass: true };
    const legacy = { 0: manual, 3: { name: 'Casey', ref: 'paper-waiver', isDigital: true } };
    const before = JSON.parse(JSON.stringify(legacy));
    const players = mergeRentalRoster(legacy, group, [member, guest]);
    expect(players).toHaveLength(3);
    expect(players.slice(0, 2)).toEqual(Object.values(before));
    expect(legacy).toEqual(before);
    expect(rentalHasGroupEntry([ { name: 'Echo', ref: member.playerId, isDigital: true } ], group, member)).toBe(false);
});

it('ignores repeated entries in one selection and on subsequent imports but adds a later arrival', () => {
    const first = mergeRentalRoster(null, group, [guest, guest, member]);
    expect(first).toHaveLength(2);
    const restored = Object.assign({}, JSON.parse(JSON.stringify(first)));
    expect(mergeRentalRoster(restored, group, [member, guest])).toEqual(first);
    const newcomer = { id: 'late-arrival', displayName: 'Echo' };
    const added = mergeRentalRoster(restored, group, [guest, newcomer, member, newcomer]);
    expect(added).toHaveLength(3);
    expect(added.slice(0, 2)).toEqual(first);
    expect(added[2]).toMatchObject({groupEntryId: newcomer.id, rentals: []});
});

it('retains the original visit date after expiry and copies only the source and participant fields needed by the rental', () => {
    const source = { ...group, expiresAt: '2019-10-13T00:00:00Z', inviteCode: 'private-code', entries: [guest],
        bookingContact: { email: 'private@example.test' } };
    const proof = { ...guest, waiverRef: 'private-waiver-ref', email: 'guest@example.test' };
    expect(rentalGroupSource(source)).toEqual(group);
    expect(mergeRentalRoster([], source, [proof])).toEqual([{
        ref: 'group:party-15:guest-1', name: 'Echo', groupId: 'party-15', groupEntryId: 'guest-1',
        rentals: [], date: '2019-10-12',
    }]);
});
