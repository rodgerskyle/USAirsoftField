import { mountGroupMemberPicker } from './group-member-picker.js';
import { newScoreId as newRequestId } from './scoreHistory.js';
import { websiteInvitationLink } from './groupInvitationLinks.js';
import { groupRentalLink } from './groupRentalLink.js';
import { bindWaiverPicker, waiverPickerMarkup } from './staff-waiver-picker.js';
import { groupExperienceLabels } from './groupExperience.js';
import { waiverStatusMarkup } from './waiver-status.js';

const endpoint = '/api/staff-groups';
const memberProfileHref = id => '/profilelookup/' + encodeURIComponent(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fieldDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' });
function pacificToday() {
  const { year, month, day } = Object.fromEntries(fieldDate.formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${year}-${month}-${day}`;
}
const displayDay = date => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date + 'T12:00:00Z'));
const calendarTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' });
function partySummary(start, size) {
  const time = Date.parse(start);
  const parts = [];
  if (Number.isFinite(time)) parts.push(calendarTime.format(time));
  if (size > 0) parts.push(`Booked for ${size}`);
  return parts.length ? ' · ' + parts.join(' · ') : '';
}
const people = count => `${count} ${count === 1 ? 'player' : 'players'}`;

export function groupDeskMarkup() {
  return `<div class="group-desk" data-group-desk>
    <p data-desk-status role="status" aria-live="polite"></p>
    <div class="group-desk__layout">
      <section class="group-desk__section" aria-label="Group directory">
        <div class="group-desk__directory-heading"><h2>Group directory</h2>
          <button class="btn btn-primary" type="button" data-new-group aria-controls="staff-new-group" aria-expanded="false">New group</button>
        </div>
        <form id="staff-new-group" data-create-group class="group-desk__form group-desk__create" aria-label="New group" hidden>
          <label>New group name<input name="name" maxlength="80" required></label>
          <label>Visit date<input type="date" name="date" min="${pacificToday()}" required></label>
          <label>Visit type<select name="kind"><option value="visit">Game-day group</option><option value="party">Birthday or private event</option></select></label>
          <label>Expected players<input name="headcount" type="number" inputmode="numeric" min="1" max="30" value="1" required></label>
          <small>Group invitation codes and rosters expire five days after creation.</small>
          <div class="group-desk__actions"><button class="btn btn-primary" type="submit">Create group</button>
            <button class="btn btn-secondary" type="button" data-cancel-create>Cancel</button></div>
        </form>
        <form data-directory class="group-desk__form">
          <label>Show groups<select name="range"><option value="from">On or after date</option><option value="date">On this date</option></select></label>
          <label>Field date<input type="date" name="date" required value="${pacificToday()}"></label>
          <button class="btn btn-secondary" type="submit">Find groups</button>
        </form>
        <div data-desk-list></div>
      </section>
      <section class="group-desk__section" aria-label="Selected group" data-desk-detail><h2>Group details</h2><p>Select a group to see its roster and invitation code.</p></section>
    </div>
  </div>`;
}

function listMarkup(result, selectedId) {
  if (!result.groups.length) return '<p>No groups found for these dates.</p>';
  const rows = result.groups.map(item => `<li><button class="group-desk__choice" type="button" data-open="${escape(item.id)}" aria-pressed="${item.id === selectedId}">
    <strong>${escape(item.name)}</strong><span>${escape(displayDay(item.date))} · ${people(item.memberCount)}${item.kind === 'party' ? ' · Party' : ''}${partySummary(item.partyStart, item.partySize)}${item.codeSuffix ? ' · Code ending ' + escape(item.codeSuffix) : ''}</span>
  </button></li>`).join('');
  return `<ul class="group-desk__list">${rows}</ul>${result.totalPages > 1 ? `<nav class="group-desk__actions" aria-label="Group directory pages">
    ${result.page > 1 ? `<button type="button" class="btn btn-secondary" data-page="${result.page - 1}">Previous</button>` : ''}
    <span>Page ${result.page} of ${result.totalPages}</span>
    ${result.page < result.totalPages ? `<button type="button" class="btn btn-secondary" data-page="${result.page + 1}">Next</button>` : ''}</nav>` : ''}`;
}

function experienceOptions(current = 'unrated') {
  return Object.entries(groupExperienceLabels).map(([band, label]) =>
    `<option value="${band}"${band === current ? ' selected' : ''}>${label}</option>`).join('');
}

function guestPreparation(prep) {
  if (!prep) return '';
  const rental = prep.rentalIntent === 'requested' ? 'Rental gear requested' : prep.rentalIntent === 'bringing' ? 'Bringing own gear' : 'Rental choice needed';
  return `<small>${prep.ready ? 'Ready for arrival' : 'Needs attention'} · ${rental}</small>`;
}

function arrivalSummary(group) {
  const organizerUrl = websiteInvitationLink('organizer', group.organizerToken);
  const organizerActions = organizerUrl ? `<a class="btn btn-secondary" href="${escape(organizerUrl)}" rel="noreferrer" target="_blank">Open organizer readiness link</a>
    <button type="button" class="btn btn-secondary" data-copy-link="${escape(organizerUrl)}">Copy organizer link</button>` : '';
  if (!group.readiness) return organizerActions;
  const {ready, expected, unlisted, rentalsRequested} = group.readiness;
  return `<section aria-label="Party readiness"><h3>Party readiness</h3>
    <p><strong>${escape(ready)} of ${escape(expected)} ready</strong> · ${escape(rentalsRequested)} rental ${rentalsRequested === 1 ? 'request' : 'requests'}</p>
    ${unlisted ? `<p>${escape(unlisted)} expected ${unlisted === 1 ? 'guest still needs' : 'guests still need'} to be added to the roster.</p>` : ''}
    <button type="button" class="btn btn-secondary" data-refresh-party>Refresh party readiness</button>
    ${organizerActions}</section>`;
}

function rosterRow(entry) {
  const kind = entry.kind === 'guest' ? 'Guest player' : 'USAW player';
  const guestUrl = websiteInvitationLink('guest', entry.preparation?.guestToken);
  return `<li><div><strong>${escape(entry.displayName)}</strong><small>${kind}${entry.isOrganizer ? ' · Organizer' : ''} · ${groupExperienceLabels[entry.experienceBand] || groupExperienceLabels.unrated}</small>${waiverStatusMarkup(entry.waiverStatus)}${guestPreparation(entry.preparation)}</div>
    ${guestUrl ? `<button type="button" class="btn btn-secondary" data-copy-link="${escape(guestUrl)}">Copy guest checklist<span class="visually-hidden"> for ${escape(entry.displayName)}</span></button>` : ''}
    ${entry.waiverStatus !== 'signed' ? `<details data-waiver-entry="${escape(entry.id)}"><summary>Link signed waiver<span class="visually-hidden"> for ${escape(entry.displayName)}</span></summary>${waiverPickerMarkup({ name: entry.displayName })}</details>` : ''}
    ${entry.playerId ? `<a href="${escape(memberProfileHref(entry.playerId))}" target="_blank" rel="noopener noreferrer" aria-label="View profile for ${escape(entry.displayName)}">View profile</a>` : ''}
    ${entry.pending && entry.playerId ? `<button class="btn btn-secondary" type="button" data-confirm-member="${escape(entry.playerId)}">Confirm member<span class="visually-hidden"> ${escape(entry.displayName)}</span></button>` : ''}
    <details><summary>Edit player name<span class="visually-hidden"> for ${escape(entry.displayName)}</span></summary>
      <form data-rename-entry="${escape(entry.id)}" class="group-desk__form"><label>Roster name or callsign<input required name="displayName" minlength="2" maxlength="80" value="${escape(entry.displayName)}"></label>
      <button class="btn btn-secondary">Save player name</button></form></details>
    <details><summary>Edit experience<span class="visually-hidden"> for ${escape(entry.displayName)}</span></summary>
      <form data-experience="${escape(entry.id)}" class="group-desk__form"><label>Experience for ${escape(entry.displayName)}<select name="experienceBand">${experienceOptions(entry.experienceBand)}</select></label>
      <button class="btn btn-secondary">Save experience</button></form></details>
    ${entry.canRemove ? `<button type="button" class="btn btn-secondary" data-remove="${escape(entry.id)}" data-entry-kind="${escape(entry.kind)}" aria-label="Remove ${escape(entry.displayName)}">Remove</button>` : ''}</li>`;
}

function detailMarkup(group, confirmDelete) {
  if (!group) return '<h2>Group details</h2><p>Select a group to see its roster and invitation code.</p>';
  const inviteUrl = websiteInvitationLink('join', group.code);
  const schedule = group.partyStatus === 'confirmed' ? ' · Party Calendar linked' : group.partyStatus === 'review' ? ' · Booking needs review' : '';
  return `<h2 tabindex="-1" data-selection-title>${escape(group.name)}</h2>
    <p>${escape(displayDay(group.date))} · ${people(group.entries.length)}${schedule}${partySummary(group.party?.start, group.party?.size)}</p>
    <div class="group-desk__visit-actions">
    ${group.id && group.date === pacificToday() ? `<a class="btn btn-primary" href="/admin/field/check-in?group=${escape(encodeURIComponent(group.id))}#arriving-group">Check in this group</a>` : ''}
    ${group.id && group.partyStatus !== 'review' ? `<a class="btn btn-secondary" href="${escape(groupRentalLink(group.id))}" target="_blank" rel="noopener noreferrer">Open rental form</a>` : ''}
    </div>
    <div class="group-desk__code"><label>Invitation code<input readonly data-invite value="${escape(group.code)}" autocomplete="off"></label>
      <button class="btn btn-secondary" type="button" data-copy>Copy code</button>
      ${inviteUrl ? `<button class="btn btn-secondary" type="button" data-copy-link="${escape(inviteUrl)}">Copy guest invitation</button>` : ''}</div>
    ${group.expiresAt ? `<p>Expires ${escape(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(group.expiresAt)))} Pacific</p>` : ''}
        ${arrivalSummary(group)}
    <h3>Group roster</h3>
    ${group.entries.length ? `<p>${group.entries.filter(entry => entry.waiverStatus === 'signed').length} of ${group.entries.length} waivers verified</p>
      ${group.entries.some(entry => entry.waiverStatus === 'unavailable' || !entry.waiverStatus) ? '<button type="button" class="btn btn-secondary" data-refresh-waivers>Retry waiver verification</button>' : ''}
      <ul class="group-desk__roster">${group.entries.map(rosterRow).join('')}</ul>` : '<p>No players on the list yet.</p>'}
    <div data-staff-member-picker></div>
    <h3>Add a walk-on</h3>
    <form data-add class="group-desk__form">${waiverPickerMarkup()}<label>Player name or callsign<input required name="displayName" minlength="2" maxlength="80" autocomplete="off"></label>
      <label>Airsoft experience<select name="experienceBand">${experienceOptions()}</select></label>
      <button class="btn btn-primary" type="submit">Add player</button></form>
    <form data-rename class="group-desk__form"><label>Group name<input required name="name" maxlength="80" value="${escape(group.name)}"></label>
      <button class="btn btn-secondary" type="submit">Save name</button></form>
    ${confirmDelete ? `<div class="group-desk__confirm"><strong>Remove ${escape(group.name)} and its roster?</strong><p>The Party Calendar reservation and completed player check-ins stay on file.</p>
      <div class="group-desk__actions"><button class="btn btn-danger" type="button" data-delete>Yes, remove group</button>
      <button class="btn btn-secondary" type="button" data-keep>Keep group</button></div></div>` : '<button class="btn btn-outline-danger" type="button" data-confirm-delete>Remove group</button>'}`;
}

export function bindGroupDesk(root, { request, signal, initialId }) {
  const list = root.querySelector('[data-desk-list]');
  const detail = root.querySelector('[data-desk-detail]');
  const status = root.querySelector('[data-desk-status]');
  const filters = root.querySelector('[data-directory]');
  const createForm = root.querySelector('[data-create-group]');
  const createButton = root.querySelector('[data-new-group]');
  let createAttempt = null;
  let range = 'from', date = filters.elements.date.value, page = 1;
  let selected = null, directory = null, confirming = false, busy = false;
  const drawList = () => { list.innerHTML = directory ? listMarkup(directory, selected?.id) : ''; };
  let disposeMemberPicker;
  function drawDetail() {
    disposeMemberPicker?.();
    disposeMemberPicker = null;
    detail.innerHTML = detailMarkup(selected, confirming);
    if (selected) {
      disposeMemberPicker = mountGroupMemberPicker(detail.querySelector('[data-staff-member-picker]'), {
        endpoint: 'https://app.usairsoftfield.com/api/leaderboard', profileHref: memberProfileHref,
        rosterIds: () => selected.entries.map(entry => entry.playerId).filter(Boolean),
        isFull: () => selected.entries.length >= (selected.capacity ?? 30),
        onAdd: playerId => run(() => change('addMember', { playerId }, 'Member added to the group.'), true),
      });
    }
  }
  signal.addEventListener('abort', () => disposeMemberPicker?.(), { once: true });

  bindWaiverPicker(root, { signal, isBusy: () => busy,
    search: name => request('/api/staff-waivers', { method: 'POST', body: { name }, signal }),
    onChoose: (match, picker) => {
      const row = picker.closest('[data-waiver-entry]');
      if (row) {
        return run(() => change('linkWaiver', { entryId: row.dataset.waiverEntry, waiverRef: match.ref }, 'Waiver linked. Roster updated.'));
      }
      const form = picker.closest('[data-add]');
      form.elements.displayName.value = match.name;
      form.dataset.waiverRef = match.ref;
      picker.querySelector('[data-waiver-message]').textContent = 'Waiver selected for ' + match.name + '. Add player to verify.';
    },
  });
  root.addEventListener('input', event => {
    const form = event.target.closest('[data-add]');
    if (form && event.target.matches('[data-waiver-name]')) delete form.dataset.waiverRef;
  }, { signal });

  async function loadList() {
    const params = new URLSearchParams({ [range]: date, page: String(page) });
    const result = await request(`${endpoint}?${params}`, { signal });
    if (signal.aborted) return;
    directory = result;
    page = result.page;
    drawList();
  }
  async function open(id) {
    let result;
    try {
      result = await request(`${endpoint}?id=${encodeURIComponent(id)}`, { signal });
    } catch (error) {
      if (!signal.aborted && error.status === 404) {
        selected = null; confirming = false; drawDetail(); await loadList();
      }
      throw error;
    }
    if (signal.aborted) return;
    selected = result.group;
    confirming = false;
    drawDetail(); drawList();
  }
  async function run(work, reportToPicker = false) {
    if (busy || signal.aborted) {
      if (reportToPicker) throw new Error('Please wait for the current group change.');
      return;
    }
    busy = true;
    root.setAttribute('aria-busy', 'true');
    status.textContent = '';
    // Member search manages its own duplicate, capacity and pagination controls.
    const controls = [...root.querySelectorAll('button,form input,select')].filter(el => !el.disabled && !el.closest('[data-staff-member-picker]'));
    controls.forEach(el => { el.disabled = true; });
    try { await work(); }
    catch (error) {
      if (signal.aborted) return;
      if (error.status === 401 || error.status === 403) {
        selected = null; directory = null; drawDetail(); drawList();
      }
      status.textContent = error.message || 'Group management could not load. Please try again.';
      if (reportToPicker) throw error;
    } finally {
      if (!signal.aborted) {
        busy = false;
        root.removeAttribute('aria-busy');
        controls.forEach(el => { el.disabled = false; });
      }
    }
  }
  function showCreate(open) {
    createForm.hidden = !open;
    createButton.setAttribute('aria-expanded', String(open));
    if (open) {
      createForm.elements.date.value = date >= pacificToday() ? date : pacificToday();
      createForm.elements.name.focus();
    } else {
      createForm.reset();
      createAttempt = null;
    }
  }
  async function createGroup() {
    const fields = { name: createForm.elements.name.value.trim(), date: createForm.elements.date.value,
      kind: createForm.elements.kind.value, headcount: Number(createForm.elements.headcount.value) };
    const key = JSON.stringify(fields);
    if (key !== createAttempt?.key) createAttempt = { key, id: newRequestId() };
    const result = await request(endpoint, { method: 'POST', signal,
      body: { action: 'create', requestId: createAttempt.id, ...fields } });
    if (signal.aborted) return;
    selected = result.group;
    confirming = false;
    showCreate(false);
    range = 'date'; date = selected.date; page = 1;
    filters.elements.range.value = range; filters.elements.date.value = date;
    drawDetail();
    detail.querySelector('[data-selection-title]')?.focus();
    await refreshAfterSave('Group created. You can now add players.');
  }
  async function change(action, fields, message) {
    const { id, version } = selected;
    try {
      const result = await request(endpoint, { method: 'POST', signal, body: { action, id, version, ...fields } });
      if (signal.aborted) return;
      selected = result.group;
      confirming = false;
      drawDetail();
    } catch (error) {
      if (signal.aborted) return;
      if (error.status === 409) {
        await open(id);
      } else if (error.status === 404) {
        selected = null; drawDetail(); await loadList();
      }
      throw error;
    }
    await refreshAfterSave(message);
  }
  async function refreshAfterSave(message) {
    // Display the saved roster immediately even if a directory refresh fails.
    try { await loadList(); }
    catch (error) {
      if (signal.aborted) return;
      if (error.status === 401 || error.status === 403) throw error;
      directory = null; drawList();
      status.textContent = message + ' Use Find groups to refresh the directory.';
      return;
    }
    if (!signal.aborted) status.textContent = message;
  }
  root.addEventListener('submit', event => {
    const form = event.target;
    event.preventDefault();
    if (busy) return;
    if (form === createForm) {
      void run(createGroup);
    } else if (form === filters) {
      range = filters.elements.range.value; date = filters.elements.date.value; page = 1;
      selected = null; directory = null; confirming = false; drawDetail(); drawList();
      void run(loadList);
    } else if (selected && form.matches('[data-add]')) {
      void run(() => change('addGuest', { ...(form.dataset.waiverRef ? {waiverRef: form.dataset.waiverRef} : {}), displayName: form.elements.displayName.value.trim(), experienceBand: form.elements.experienceBand.value }, 'Player added.'));
    } else if (selected && form.matches('[data-rename-entry]')) {
      void run(() => change('renameEntry', { entryId: form.dataset.renameEntry, displayName: form.elements.displayName.value.trim() }, 'Player name saved.'));
    } else if (selected && form.matches('[data-experience]')) {
      void run(() => change('setExperience', { entryId: form.dataset.experience, experienceBand: form.elements.experienceBand.value }, 'Experience saved.'));
    } else if (selected && form.matches('[data-rename]')) {
      void run(() => change('rename', { name: form.elements.name.value.trim() }, 'Group name saved.'));
    }
  }, { signal });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || busy) return;
    if (button === createButton || button.hasAttribute('data-cancel-create')) {
      showCreate(button === createButton && createForm.hidden);
      if (createForm.hidden) createButton.focus();
    } else if (button.dataset.open) {
      const id = button.dataset.open;
      void run(async () => { await open(id); if (!signal.aborted) detail.querySelector('[data-selection-title]')?.focus(); });
    } else if (button.dataset.page) {
      page = Number(button.dataset.page); void run(loadList);
    } else if (!selected) return;
    else if (button.dataset.confirmMember) {
      void run(() => change('addMember', { playerId: button.dataset.confirmMember }, 'Member confirmed on the group roster.'));
    } else if (button.hasAttribute('data-refresh-waivers') || button.hasAttribute('data-refresh-party')) {
      void run(async () => {
        await open(selected.id);
        if (!signal.aborted) status.textContent = button.hasAttribute('data-refresh-party') ? 'Party readiness refreshed.' : 'Waiver statuses refreshed.';
      });
    } else if (button.dataset.copyLink) {
      const url = button.dataset.copyLink;
      void run(async () => {
        try {
          await navigator.clipboard.writeText(url);
          if (button.isConnected) status.textContent = 'Link copied.';
        } catch {
          if (!button.isConnected) return;
          const field = document.createElement('input');
          field.readOnly = true;
          field.value = url;
          field.setAttribute('aria-label', 'Copy this link');
          status.replaceChildren('Select and copy the link. ', field);
          field.focus();
          field.select();
        }
      });
    } else if (button.hasAttribute('data-copy')) {
      const field = detail.querySelector('[data-invite]');
      field.select();
      void run(async () => {
        try { await navigator.clipboard.writeText(field.value); if (!signal.aborted) status.textContent = 'Invitation code copied.'; }
        catch { if (!signal.aborted) status.textContent = 'The invitation code is selected. Use Copy on this device.'; }
      });
    } else if (button.dataset.remove) {
      const action = button.dataset.entryKind === 'player' ? 'removeMember' : 'removeGuest';
      void run(() => change(action, { entryId: button.dataset.remove }, 'Player removed from the group.'));
    } else if (button.hasAttribute('data-confirm-delete') || button.hasAttribute('data-keep')) {
      confirming = button.hasAttribute('data-confirm-delete'); drawDetail();
      detail.querySelector(confirming ? '[data-keep]' : '[data-confirm-delete]')?.focus();
    } else if (confirming && button.hasAttribute('data-delete')) {
      void run(() => change('delete', {}, 'Group removed.'));
    }
  }, { signal });
  void run(async () => {
    if (/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(initialId || '')) {
      await open(initialId);
      if (signal.aborted) return;
      range = 'date'; date = selected.date;
      filters.elements.range.value = range; filters.elements.date.value = date;
    }
    await loadList();
  });
}
