import { waiverAge } from './waiverAge';

test('requires the guardian until the birthday begins at the field', () => {
    expect(waiverAge('2008-11-20', new Date('2026-11-20T07:59Z'))).toBe(17);
    expect(waiverAge('2008-11-20', new Date('2026-11-20T08:00Z'))).toBe(18);
    expect(waiverAge('2008-02-30')).toBeNull();
});
