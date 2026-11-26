const guestId = /^guest:[0-9a-f]{64}$/;
const memberId = /^[A-Za-z0-9_-]{10,128}$/;

export function groupRentalLink(id, isAdmin = true, view = 'new') {
  const path = isAdmin ? '/admin/rentalform' : '/dashboard/rentalform';
  return path + '?' + new URLSearchParams({ view, group: id });
}

function validDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date;
}

export function validWalkOnRental(playerId, date) {
  return typeof playerId === 'string' && guestId.test(playerId) && validDate(date);
}

export function validMemberCheckIn(playerId, date) {
  return typeof playerId === 'string' && memberId.test(playerId) && validDate(date);
}

export function validCheckInSelection(playerId, date) {
  return validMemberCheckIn(playerId, date) || validWalkOnRental(playerId, date);
}

export function rentalCheckInParams(params) {
  const walkOn = params.has('walkOn');
  const key = walkOn ? 'walkOn' : 'member';
  const playerId = params.get(key), date = params.get('date');
  if (params.has('group') || (walkOn && params.has('member')) ||
      params.getAll(key).length !== 1 || params.getAll('date').length !== 1 ||
      !validDate(date) || !(walkOn ? guestId : memberId).test(playerId)) return null;
  return { playerId, date, key };
}

export function checkInRentalLink(playerId, date, isAdmin = true, fromCompanion = false, view = 'new') {
  if (!validCheckInSelection(playerId, date)) return null;
  const path = isAdmin ? '/admin/rentalform' : '/dashboard/rentalform';
  const params = new URLSearchParams({ view, [guestId.test(playerId) ? 'walkOn' : 'member']: playerId, date });
  if (fromCompanion) params.set('from', 'companion');
  return path + '?' + params;
}

export function walkOnRentalLink(playerId, date, isAdmin = true, fromCompanion = false) {
  return validWalkOnRental(playerId, date) ? checkInRentalLink(playerId, date, isAdmin, fromCompanion) : null;
}

export function walkOnAfterLogin(search, isAdmin) {
  const params = new URLSearchParams(search);
  if ([...params.keys()].length === 1 && params.get('view') === 'pickup') {
    return (isAdmin ? '/admin/rentalform' : '/dashboard/rentalform') + '?view=pickup';
  }
  const player = rentalCheckInParams(params);
  if (params.get('view') === 'edit') {
    const key = /^[A-Za-z0-9_-]{1,128}$/;
    const form = params.get('form'), instance = params.get('instance');
    const allowed = ['view','form','instance','walkOn','member','date','from','group','pickup'];
    if (!key.test(form || '') || (instance !== null && !key.test(instance)) ||
        [...params.keys()].some(name => !allowed.includes(name) || params.getAll(name).length !== 1)) return null;
    if ((params.has('member') || params.has('walkOn') || params.has('date')) && !player) return null;
    const group = params.get('group');
    if (group !== null && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(group)) return null;
    if ((params.has('pickup') && params.get('pickup') !== 'arrived') ||
        (params.has('from') && params.get('from') !== 'companion')) return null;
    return (isAdmin ? '/admin/rentalform' : '/dashboard/rentalform') + '?' + params;
  }
  if (player) return checkInRentalLink(player.playerId, player.date, isAdmin, params.get('from') === 'companion') +
    (params.get('pickup') === 'arrived' ? '&pickup=arrived' : '');
  const group = params.get('group');
  if (params.get('view') === 'new' && params.size === 3 && params.get('pickup') === 'arrived' &&
      /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(group || '')) {
    return groupRentalLink(group, isAdmin) + '&pickup=arrived';
  }
  return null;
}

export function returnToPlayerCheckIn({ playerId, date }, companion) {
  if (companion) return 'https://app.usairsoftfield.com/#staff-check-in/player/' + encodeURIComponent(playerId) + '/' + date;
  return '/admin/field/check-in?' + new URLSearchParams({ player: playerId, date });
}
