export const PATCH_DIFFICULTIES = Object.freeze([
  Object.freeze({ factor: 1, name: 'Fieldcraft' }),
  Object.freeze({ factor: 2, name: 'Specialist' }),
  Object.freeze({ factor: 3, name: 'Elite' }),
]);

const specialistPatches = new Set([
  'sticky-bomb', 'three-bomb', 'power-struggle', 'squad-leader', 'field-steward',
  'rookie-mentor', 'interrogation', 'pilot-rescue', 'wolf', 'vip-rescue',
  'bomb-disarmament-bridge', 'multiple-bomb-disarmament', 'red-city-siege',
  'the-purge', 'pfrc', 'icbm-first-strike', 'sabotage', 'operation-airstrike',
  'broken-arrow', 'level-4-biohazard', 'operation-first-strike', 'detonation',
  'fuel-depot-demolition', 'progressive-countdown', 'blackout-protocol',
  'ribbon-flag', 'fallout', 'hvt', 'human-decoy', 'wrong-pocket', 'pocket-bbs',
]);

const elitePatches = new Set([
  'ambassador', 'community-builder', 'objective-mvp', 'buzzer-beater',
  'return-to-sender', 'second-wind', 'no-shots-fired',
]);

export function patchDifficulty(badgeId) {
  if (elitePatches.has(badgeId)) return PATCH_DIFFICULTIES[2];
  if (specialistPatches.has(badgeId)) return PATCH_DIFFICULTIES[1];
  return PATCH_DIFFICULTIES[0];
}
