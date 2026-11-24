import { newSubmissionId } from '../utils/submissionId';

export const pointsPerFreeGame = 450;
export const newScoreId = newSubmissionId;

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

function matchingEvents(events, outcome) {
  return Object.entries(events || {}).filter(([, event]) =>
    event?.outcome === outcome && Number.isSafeInteger(event.at) && event.voided !== true && event.voidedAt == null
  ).sort(([idA, a], [idB, b]) => a.at - b.at || idA.localeCompare(idB));
}

export function activeScoreEvents(events, outcome, dailyCount) {
  return matchingEvents(events, outcome).slice(0, Math.max(0, Math.floor(dailyCount)));
}

export function scoreHistoryFields(player, { day, outcome, at, eventId, dailyCount, removing, previousPoints, nextPoints, mode, side }) {
  const changes = freePassChanges(player.freeGameMilestones, previousPoints, nextPoints, at);
  const original = player.gameResultHistory?.[day];
  if (removing && !original) return changes;

  const events = { ...original };
  const active = matchingEvents(events, outcome);
  const before = Math.max(0, Math.floor(dailyCount));
  // A legacy writer can correct the daily aggregate independently. Retire excess
  // details before adding a new score, without inventing an earlier correction time.
  for (const [id, event] of active.slice(before)) events[id] = { ...event, voided: true };
  if (removing) {
    if (eventId) events[eventId] = { ...events[eventId], voided: true, voidedAt: at };
  } else {
    events[eventId] = { outcome, at, ...(mode && { mode }), ...(side && { side }) };
  }
  return { ...changes, gameResultHistory: { ...player.gameResultHistory, [day]: events } };
}
