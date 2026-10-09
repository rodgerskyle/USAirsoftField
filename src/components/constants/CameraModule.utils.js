export const normalizeRentalGroups = (groupsObj = {}) => {
  const groupsObject = {};
  const groups = [];
  const groupIndex = {};

  Object.entries(groupsObj || {}).forEach(([key, group]) => {
    if (!group?.name) return;

    groupsObject[key] = { ...group, index: key };
    groups.push(group.name);
    groupIndex[group.name] = key;
  });

  return { groups, groupsObject, groupIndex };
};
