const monthDate = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const calendarDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const pacificDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });

export function milestoneDate(value, precision) {
  if (precision === 'unknown' || typeof value !== 'string') return 'Date unavailable';
  const month = /^(\d{4}-(?:0[1-9]|1[0-2]))(?:$|-)/.exec(value);
  if ((precision === 'month' || value.length === 7) && month) return monthDate.format(new Date(month[1] + '-01T00:00:00Z'));
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Date unavailable';
  return (/^\d{4}-\d{2}-\d{2}$/.test(value) ? calendarDate : pacificDate).format(date);
}

function uniqueItems(items, seen) {
  return items.filter(item => {
    if (typeof item?.id !== 'string' || !item.id.trim() || typeof item.title !== 'string' || !item.title.trim() ||
        (item.detail != null && typeof item.detail !== 'string') || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function mergeMilestonePage(id, page, previous = null) {
  if (page?.player?.id !== id || !Array.isArray(page.items) ||
      (page.undatedItems != null && !Array.isArray(page.undatedItems))) {
    throw new Error('The player milestone page could not be verified.');
  }
  const dated = previous?.items || [];
  const seen = new Set(dated.map(item => item.id));
  const additions = uniqueItems(page.items, seen);
  const undated = uniqueItems([...(previous?.undatedItems || []), ...(page.undatedItems || [])], seen);
  const cursors = new Set(previous?.cursors);
  if (previous?.nextCursor) cursors.add(previous.nextCursor);
  const token = page.nextCursor;
  const nextCursor = additions.length && typeof token === 'string' && /^[A-Za-z0-9_-]{1,500}$/.test(token) && !cursors.has(token) ? token : null;
  return { ...page, items: [...dated, ...additions], undatedItems: undated, cursors, nextCursor };
}
