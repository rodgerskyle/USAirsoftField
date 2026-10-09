import { findPotentialBans, matchBannedName, normalizePersonName } from './banMatching';

describe('ban name matching', () => {
    it('normalizes punctuation, accents, and whitespace', () => {
        expect(normalizePersonName("  Jos\u00e9   O'Neil-Smith ")).toBe('jose o neil smith');
    });

    it('matches exact names regardless of order and capitalization', () => {
        expect(matchBannedName('SMITH, John', 'John Smith')).toEqual({ type: 'exact', score: 1 });
    });

    it('identifies small spelling differences as possible matches', () => {
        expect(matchBannedName('Jon Smyth', 'John Smith')?.type).toBe('possible');
    });

    it('does not flag unrelated names', () => {
        expect(matchBannedName('Maria Garcia', 'John Smith')).toBeNull();
    });

    it('returns the strongest matches first', () => {
        const matches = findPotentialBans('John Smith', [
            { id: 'possible', name: 'Jon Smith' },
            { id: 'exact', name: 'John Smith' },
        ]);

        expect(matches.map(match => match.id)).toEqual(['exact', 'possible']);
    });
});
