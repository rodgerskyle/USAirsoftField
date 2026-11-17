// Called inside the score transaction so promotions follow the same save and retry.
export function scoreRankMilestones(existing, previousPoints, nextPoints, at, thresholds, names) {
  const records = existing && typeof existing === 'object' ? { ...existing } : {};
  if (!Number.isSafeInteger(at) || !Number.isFinite(new Date(at).getTime())) return records;
  for (let index = 1; index < thresholds.length; index++) {
    const level = index + 1;
    // Prefix keys so Firebase never converts the promotion map to an array.
    const key = `rank-${level}`;
    const legacyKey = String(level);
    const valid = value => value && Number.isSafeInteger(value.at) && Number.isFinite(new Date(value.at).getTime()) && value.rankLevel === level;
    const legacy = records[legacyKey];
    if (valid(legacy)) {
      if (!valid(records[key]) || legacy.at < records[key].at) records[key] = legacy;
      delete records[legacyKey];
    }
    const threshold = thresholds[index];
    if (nextPoints < threshold) {
      delete records[key];
    } else if (previousPoints < threshold && !valid(records[key])) {
      records[key] = { at, rankLevel: level, rankName: names[index] };
    }
  }
  return records;
}
