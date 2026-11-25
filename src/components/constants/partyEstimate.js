const dollars = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2,
});

export const money = cents => dollars.format(cents / 100);

function cents(value) {
  const match = /^\$((?:\d+|\d{1,3}(?:,\d{3})+))(?:\.(\d{2}))?$/.exec(value);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, '')) * 100 + Number(match[2] || 0);
  return Number.isSafeInteger(amount) ? amount : null;
}

// Extract prices from the same published cards that guests see. An incomplete
// or newly worded card remains viewable without generating a guessed quote.
export function partyPackages(parties) {
  if (!parties) return [];
  const cards = [...(parties.weekend || []), ...(parties.weekday || [])];
  if (parties.nerf) {
    cards.push({ name: 'Private Nerf session', price: parties.nerf.price, items: parties.nerf.details });
  }
  return cards.flatMap(card => {
    const items = Array.isArray(card.items) ? card.items : [];
    const allowance = items.map(item => /^(?:Up to )?(\d+) players?$/i.exec(item)).find(Boolean);
    const extra = items.map(item => /^(?:Additional players are (\$[\d.,]+) each|(\$[\d.,]+) each additional player)$/i.exec(item)).find(Boolean);
    const base = cents(card.price);
    const perExtra = extra ? cents(extra[1] || extra[2]) : null;
    const included = Number(allowance?.[1]);
    if (!card.name || !Number.isSafeInteger(included) || included < 1 || base === null || perExtra === null) return [];
    return [{ name: card.name, included, base, perExtra,
      inclusions: items.filter(item => item !== allowance[0] && item !== extra[0]) }];
  });
}

export function estimateParty(pack, count) {
  if (!pack || !/^\d+$/.test(String(count))) return null;
  const players = Number(count);
  if (!Number.isSafeInteger(players) || players < 1) return null;
  const extra = Math.max(0, players - pack.included);
  const total = pack.base + extra * pack.perExtra;
  return Number.isSafeInteger(total) ? { players, extra, total } : null;
}

export function breakdown(pack, quote) {
  return `${money(pack.base)} package + ${quote.extra} additional ${quote.extra === 1 ? 'player' : 'players'} × ${money(pack.perExtra)}`;
}

export function bookingPath(pack, quote) {
  return '/contact?' + new URLSearchParams({ party: pack.name, players: String(quote.players) });
}
