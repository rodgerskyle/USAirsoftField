import { validCheckInSelection, validMemberCheckIn, returnToPlayerCheckIn } from './groupRentalLink';

import { canUseRentalDesk } from './roles';

const checkInPath = '/admin/field/check-in';

export function checkInSelection(search) {
  const params = new URLSearchParams(search);
  const playerId = params.get('player'), date = params.get('date');
  if (params.getAll('player').length !== 1 || params.getAll('date').length !== 1) return null;
  return validCheckInSelection(playerId, date) ? { playerId, date } : null;
}

export function renewalFromCheckIn(playerId, date, from = 'check-in') {
  if (!validMemberCheckIn(playerId, date) || !['companion', 'check-in'].includes(from)) return null;
  return '/admin/renewal/' + encodeURIComponent(playerId) + '?' + new URLSearchParams({ from, date });
}

export function renewalCheckInReturn(playerId, search) {
  const params = new URLSearchParams(search);
  const from = params.get('from'), date = params.get('date');
  if (!renewalFromCheckIn(playerId, date, from)) return null;
  return returnToPlayerCheckIn({ playerId, date }, from === 'companion');
}

// Carry only a known desk, field day and stable player ID through sign-in.
export function deskLoginLink(pathname, search) {
  if (pathname === checkInPath) {
    const selection = checkInSelection(search);
    return selection && '/login?' + new URLSearchParams({ resume: 'check-in', player: selection.playerId, date: selection.date });
  }
  const uid = /^\/admin\/renewal\/([A-Za-z0-9_-]{10,128})\/?$/.exec(pathname)?.[1];
  if (!uid || !renewalCheckInReturn(uid, search)) return null;
  const params = new URLSearchParams(search);
  return '/login?' + new URLSearchParams({ resume: 'renewal', player: uid, date: params.get('date'), from: params.get('from') });
}

export function deskAfterLogin(search, roles) {
  const params = new URLSearchParams(search);
  const selection = checkInSelection(search);
  if (!selection) return null;
  if (params.get('resume') === 'check-in' && roles.ADMIN) {
    return returnToPlayerCheckIn(selection, false);
  }
  if (params.get('resume') === 'renewal' && canUseRentalDesk(roles)) {
    return renewalFromCheckIn(selection.playerId, selection.date, params.get('from'));
  }
  return null;
}
