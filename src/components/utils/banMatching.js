export const normalizePersonName = (name = '') => name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const levenshteinDistance = (left, right) => {
    const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
        let diagonal = previous[0];
        previous[0] = leftIndex;

        for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
            const oldValue = previous[rightIndex];
            const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
            previous[rightIndex] = Math.min(
                previous[rightIndex] + 1,
                previous[rightIndex - 1] + 1,
                diagonal + substitutionCost
            );
            diagonal = oldValue;
        }
    }

    return previous[right.length];
};

const similarity = (left, right) => {
    const longestLength = Math.max(left.length, right.length);
    if (longestLength === 0) return 1;
    return 1 - (levenshteinDistance(left, right) / longestLength);
};

const sortedTokens = name => name.split(' ').filter(Boolean).sort().join(' ');

export const matchBannedName = (name, bannedName) => {
    const normalizedName = normalizePersonName(name);
    const normalizedBannedName = normalizePersonName(bannedName);

    if (normalizedName.length < 3 || normalizedBannedName.length < 3) return null;

    if (normalizedName === normalizedBannedName || sortedTokens(normalizedName) === sortedTokens(normalizedBannedName)) {
        return { type: 'exact', score: 1 };
    }

    const shorterName = normalizedName.length <= normalizedBannedName.length ? normalizedName : normalizedBannedName;
    const longerName = normalizedName.length > normalizedBannedName.length ? normalizedName : normalizedBannedName;
    if (shorterName.length >= 5 && shorterName.length / longerName.length >= 0.6 && longerName.includes(shorterName)) {
        return { type: 'possible', score: 0.9 };
    }

    const nameTokens = normalizedName.split(' ');
    const bannedTokens = normalizedBannedName.split(' ');
    if (nameTokens.length >= 2 && bannedTokens.length >= 2) {
        const directTokenScore = (
            similarity(nameTokens[0], bannedTokens[0]) +
            similarity(nameTokens[nameTokens.length - 1], bannedTokens[bannedTokens.length - 1])
        ) / 2;
        const reversedTokenScore = (
            similarity(nameTokens[0], bannedTokens[bannedTokens.length - 1]) +
            similarity(nameTokens[nameTokens.length - 1], bannedTokens[0])
        ) / 2;
        const tokenScore = Math.max(directTokenScore, reversedTokenScore);

        if (tokenScore >= 0.75) return { type: 'possible', score: tokenScore };
    }

    const fullNameScore = similarity(normalizedName, normalizedBannedName);
    return fullNameScore >= 0.82 ? { type: 'possible', score: fullNameScore } : null;
};

export const findPotentialBans = (name, bannedNames = []) => bannedNames
    .map(entry => ({ ...entry, match: matchBannedName(name, entry.name) }))
    .filter(entry => entry.match)
    .sort((left, right) => right.match.score - left.match.score);
