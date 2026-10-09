import { normalizeRentalGroups } from './CameraModule.utils';

describe('normalizeRentalGroups', () => {
  it('supports Firebase records with non-numeric keys', () => {
    const result = normalizeRentalGroups({
      '-Nalpha': { name: 'Alpha', size: 10 },
      '-Nbravo': { name: 'Bravo', size: 12 },
    });

    expect(result.groups).toEqual(['Alpha', 'Bravo']);
    expect(result.groupIndex).toEqual({ Alpha: '-Nalpha', Bravo: '-Nbravo' });
    expect(result.groupsObject['-Nalpha']).toEqual({
      name: 'Alpha',
      size: 10,
      index: '-Nalpha',
    });
  });

  it('returns safe empty collections when Firebase has no groups', () => {
    expect(normalizeRentalGroups(null)).toEqual({
      groups: [],
      groupsObject: {},
      groupIndex: {},
    });
  });

  it('ignores malformed groups without names', () => {
    expect(normalizeRentalGroups({ invalid: { size: 10 } }).groups).toEqual([]);
  });
});
