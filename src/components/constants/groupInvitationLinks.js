import { isGroupCode } from './groupCode';

const groupPage = 'https://www.usairsoftfield.com/group-check-in';
export const validPartyToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);

function validInvitation(role, value) {
  if (role === 'join') return isGroupCode(value);
  return (role === 'guest' || role === 'organizer') && validPartyToken(value);
}

export function websiteInvitationLink(role, value) {
  return validInvitation(role, value) ? groupPage + '#' + role + '/' + value : null;
}

export function readGroupInvitation(hash) {
  if (!hash) return null;
  const match = /^#(join|guest|organizer)\/([^/]+)$/.exec(hash);
  return match && validInvitation(match[1], match[2]) ? { role: match[1], value: match[2] } : { role: 'invalid' };
}
