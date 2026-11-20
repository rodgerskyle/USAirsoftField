function knownStatus(status) {
  return status === 'signed' || status === 'missing' ? status : 'unavailable';
}

const presentation = {
  signed: { icon: '✓', label: 'Waiver verified' },
  missing: { icon: '!', label: 'Waiver needed' },
  unavailable: { icon: '?', label: 'Verification pending' },
};

export function waiverStatusLabel(status) {
  return presentation[knownStatus(status)].label;
}

export function waiverStatusIcon(status) {
  return presentation[knownStatus(status)].icon;
}

export function waiverStatusMarkup(status) {
  const state = knownStatus(status);
  return `<span class="waiver-status" data-status="${state}"><span aria-hidden="true">${waiverStatusIcon(state)}</span> ${waiverStatusLabel(state)}</span>`;
}
