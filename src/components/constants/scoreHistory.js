export const pointsPerFreeGame = 450;

export function newScoreId() {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Score entry changes the total by one result. A pass date comes only from the
// actual scoring operation that crossed its threshold. Redemption edits the balance only.
function freePassChanges(existing, previousPoints, nextPoints, at) {
  const previous = Math.floor(previousPoints / pointsPerFreeGame);
  const next = Math.floor(nextPoints / pointsPerFreeGame);
  if (!Number.isSafeInteger(next) || !Number.isSafeInteger(previous) || previous === next) return {};
  if (next > previous && next > 0) {
    return { freeGameMilestones: { ...existing, [`pass-${next}`]: { passNumber: next, at } } };
  }
  const key = `pass-${previous}`;
  if (next > previous || !existing || !Object.hasOwn(existing, key)) return {};
  const remaining = { ...existing };
  delete remaining[key];
  return { freeGameMilestones: remaining };
}

export function scoreHistoryFields(player, { day, outcome, at, eventId, dailyCount, removing, previousPoints, nextPoints }) {
  const changes = freePassChanges(player.freeGameMilestones, previousPoints, nextPoints, at);
  const original = player.gameResultHistory?.[day];
  if (removing && !original) return changes;

  const events = { ...original };
  const active = Object.entries(events).filter(([, event]) =>
    event?.outcome === outcome && Number.isSafeInteger(event.at) && event.voided !== true && event.voidedAt == null
  ).sort(([idA, a], [idB, b]) => a.at - b.at || idA.localeCompare(idB));
  const before = Math.max(0, Math.floor(dailyCount));
  // A legacy writer can correct the daily aggregate independently. Retire excess
  // details before adding a new score, without inventing an earlier correction time.
  for (const [id, event] of active.slice(before)) events[id] = { ...event, voided: true };
  if (removing) {
    // Staff corrections identify a day and outcome. Reverse the most recent
    // recorded result of that kind. A legacy-only day has no individual event to mark.
    const latest = active[Math.min(before, active.length) - 1];
    if (latest) events[latest[0]] = { ...latest[1], voided: true, voidedAt: at };
  } else {
    events[eventId] = { outcome, at };
  }
  return { ...changes, gameResultHistory: { ...player.gameResultHistory, [day]: events } };
}
