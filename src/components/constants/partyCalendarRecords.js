import { runTransaction } from 'firebase/database';
import { normalizePartyBooking, partyBookingIdentity } from './partyBookingKey';

const bookingIdPattern = /^[a-f0-9]{64}$/;
const editableFields = ['title', 'start', 'end', 'size', 'receipt', 'deposit', 'depositAmt', 'notes'];
const changedMessage = 'This booking changed or could not be identified. Reopen it on the calendar and try again.';
const rowObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const validId = value => typeof value === 'string' && bookingIdPattern.test(value);
const explicitId = row => validId(row?.bookingId) ? row.bookingId : null;

export function newPartyBookingId() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Firebase can expose numeric children as an array or an object. Null means absent.
function contents(value) {
  return JSON.stringify(value, (_, node) => {
    if (node === null || typeof node !== 'object') return node;
    return Object.fromEntries(Object.keys(node).sort()
      .filter(key => node[key] != null).map(key => [key, node[key]]));
  });
}

function equalRowKeys(records, signature) {
  return Object.keys(records).filter(key => rowObject(records[key]) && contents(records[key]) === signature).sort();
}

function nextKey(records) {
  let last = -1;
  for (const key of Object.keys(records)) {
    if (/^(?:0|[1-9]\d*)$/.test(key)) last = Math.max(last, Number(key));
  }
  if (!Number.isSafeInteger(last + 1)) throw new Error('This calendar could not allocate another booking.');
  return String(last + 1);
}

function makeSelection(index, original, originalCalendar) {
  if (!rowObject(original) || index == null) throw new Error(changedMessage);
  const signature = contents(original);
  const keys = originalCalendar ? equalRowKeys(originalCalendar, signature) : null;
  if (keys && !keys.includes(String(index))) throw new Error(changedMessage);
  return { key: String(index), id: explicitId(original), signature, keys };
}

function findSelection(records, selection) {
  if (selection.id) {
    const keys = Object.keys(records).filter(key => explicitId(records[key]) === selection.id);
    return keys.length === 1 && contents(records[keys[0]]) === selection.signature ? keys[0] : null;
  }
  const keys = equalRowKeys(records, selection.signature);
  if (!keys.includes(selection.key)) return null;
  // An old client can splice an array, moving an indistinguishable sibling into
  // this slot. Once the original set of equal rows changes, ask staff to reopen.
  const safe = selection.keys ? contents(keys) === contents(selection.keys) : keys.length === 1;
  return safe ? selection.key : null;
}

function editedFields(values) {
  if (!rowObject(values)) throw new Error('Enter the booking details before saving.');
  return Object.fromEntries(editableFields.filter(key => Object.hasOwn(values, key) && values[key] !== undefined)
    .map(key => [key, values[key] instanceof Date ? values[key].toJSON() : values[key]]));
}

function uniqueId(records) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = newPartyBookingId();
    if (!Object.values(records).some(row => explicitId(row) === id)) return id;
  }
  throw new Error('A booking ID could not be allocated. Try opening the form again.');
}

function legacySignatures(records) {
  const rows = [];
  for (const [key, row] of Object.entries(records || {})) {
    if (!rowObject(row) || explicitId(row)) continue;
    const details = normalizePartyBooking(row);
    if (details) rows.push({ key, details, signature: contents(details) });
  }
  return rows;
}

async function resolveFingerprints(rows, resolved) {
  const unique = new Map(rows.map(row => [row.signature, row.details]));
  await Promise.all(Array.from(unique, async ([signature, details]) => {
    resolved.set(signature, await partyBookingIdentity(details));
  }));
}

export async function mutatePartyCalendar(calendarRef, { action, index, original, originalCalendar, values, bookingId }) {
  if (!['create', 'edit', 'remove'].includes(action)) throw new Error('Choose a calendar action.');
  const creating = action === 'create';
  const selection = creating ? null : makeSelection(index, original, originalCalendar);
  const fields = action === 'remove' ? null : editedFields(values);
  if (fields && !normalizePartyBooking({ ...original, ...fields })) {
    throw new Error('Enter a booking title and an end time after the start.');
  }
  const createId = creating ? bookingId ?? newPartyBookingId() : null;
  if (creating && !validId(createId)) throw new Error('The new booking ID is invalid. Reopen the form.');
  const previousId = creating ? null : explicitId(original) || await partyBookingIdentity(original);
  const previousDetails = creating ? null : normalizePartyBooking(original);
  const deletingIdentified = action === 'remove' && Boolean(selection.id);
  const fingerprints = new Map();
  if (deletingIdentified) await resolveFingerprints(legacySignatures(originalCalendar), fingerprints);
  let unknown = [];
  let saved = null;

  function update(current) {
    unknown = [];
    saved = null;
    // Firebase may first supply null from its local cache. Returning the same
    // value lets it fetch the actual server version and retry the transaction.
    if (current === null && !creating) return null;
    if (current !== null && typeof current !== 'object') return undefined;
    const records = { ...current };

    if (creating) {
      const matches = Object.keys(records).filter(key => explicitId(records[key]) === createId);
      const row = { ...fields, bookingId: createId };
      if (matches.length && (matches.length !== 1 || contents(records[matches[0]]) !== contents(row))) return undefined;
      const key = matches[0] ?? nextKey(records);
      records[key] = row;
      saved = { key, bookingId: createId, refreshBookingIds: [] };
      return records;
    }

    const key = findSelection(records, selection);
    if (key === null) return undefined;
    let id = previousId;
    if (deletingIdentified) {
      // An old client may have added a legacy row matching the booking's
      // original fingerprint after staff gave that booking a new title/date.
      const legacy = legacySignatures(records);
      unknown = legacy.filter(row => !fingerprints.has(row.signature));
      if (unknown.length) return undefined;
      for (const sibling of legacy) {
        if (fingerprints.get(sibling.signature) === previousId) {
          records[sibling.key] = { ...records[sibling.key], bookingId: uniqueId(records) };
        }
      }
    } else if (!selection.id && previousDetails) {
      const sameDetails = contents(previousDetails);
      const otherLegacyKeys = Object.keys(records).filter(other =>
        other !== key && rowObject(records[other]) && !explicitId(records[other]) &&
        contents(normalizePartyBooking(records[other])) === sameDetails);
      const claimed = Object.values(records).some(row => explicitId(row) === previousId);
      if (otherLegacyKeys.length || claimed) {
        // The old fingerprint cannot identify which family was originally
        // linked. Retire it for all unkeyed twins so staff can reconfirm.
        for (const other of otherLegacyKeys) {
          records[other] = { ...records[other], bookingId: uniqueId(records) };
        }
        id = null;
      }
    }
    if (action === 'remove') {
      delete records[key];
    } else {
      id ??= uniqueId(records);
      records[key] = { ...records[key], ...fields, bookingId: id };
    }
    const refreshBookingIds = [...new Set([previousId, id].filter(Boolean))];
    saved = { key, bookingId: id || previousId, refreshBookingIds };
    return records;
  }

  // Web Crypto hashing is asynchronous. If an old client adds legacy rows
  // during an identified removal, resolve just those rows before retrying.
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await runTransaction(calendarRef, update, { applyLocally: false });
    if (result.committed && saved) return saved;
    if (!unknown.length || result.committed) break;
    await resolveFingerprints(unknown, fingerprints);
  }
  throw new Error(changedMessage);
}
