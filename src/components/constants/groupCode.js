export function isGroupCode(value) {
  if (typeof value !== 'string' || value.length > 64) return false;
  return /^[A-Za-z0-9_-]{16}$/.test(value) || /^[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/i.test(value);
}
