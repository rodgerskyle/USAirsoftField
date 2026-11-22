export function groupRentalLink(id, isAdmin = true) {
  const path = isAdmin ? '/admin/rentalform' : '/dashboard/rentalform';
  return path + '?' + new URLSearchParams({ view: 'new', group: id });
}

export function validWalkOnRental(playerId, date) {
  return typeof playerId === 'string' && /^guest:[0-9a-f]{64}$/.test(playerId) &&
    typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function walkOnRentalLink(playerId, date, isAdmin = true, fromCompanion = false) {
  if (!validWalkOnRental(playerId, date)) return null;
  const path = isAdmin ? '/admin/rentalform' : '/dashboard/rentalform';
  const params = new URLSearchParams({ view: 'new', walkOn: playerId, date });
  if (fromCompanion) params.set('from', 'companion');
  return path + '?' + params;
}

export function walkOnAfterLogin(search, isAdmin) {
  const params = new URLSearchParams(search);
  return walkOnRentalLink(params.get('walkOn'), params.get('date'), isAdmin, params.get('from') === 'companion');
}
