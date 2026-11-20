export const colorBadges = [
    ['red', 'Red'], ['orange', 'Orange'], ['black', 'Black'], ['yellow', 'Yellow'],
    ['blue', 'Blue'], ['green', 'Green'], ['gray', 'Gray'], ['gold-thread', 'Gold'],
];

export const battleBadgeArtUrl = id => '/assets/battle-badges/field-badges.svg#' + id;

export function battleBadgeForAward(totalAwards) {
    if (!Number.isSafeInteger(totalAwards) || totalAwards < 1) return null;
    if (totalAwards <= colorBadges.length) {
        const [id, name] = colorBadges[totalAwards - 1];
        return { id, name: name + ' Battle Badge' };
    }
    if (totalAwards === 9) return { id: 'tower-of-power', name: 'Tower of Power' };
    return (totalAwards - 9) % 20 === 0 ? { id: 'gold-star', name: 'Gold Star' } : { id: 'silver-star', name: 'Silver Star' };
}
