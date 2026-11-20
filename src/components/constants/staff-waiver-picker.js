const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function waiverPickerMarkup({ name = '', label = 'Find a signed waiver' } = {}) {
  return `<div data-waiver-picker><label class="field">Participant name or waiver reference
    <input data-waiver-name maxlength="120" autocomplete="off" value="${escape(name)}"></label>
    <button class="btn btn-secondary" type="button" data-waiver-find>${escape(label)}</button>
    <div data-waiver-options></div><p role="status" aria-live="polite" data-waiver-message></p></div>`;
}

export function bindWaiverPicker(root, { signal, search, onChoose, isBusy = () => false }) {
  const results = new WeakMap();
  const attempts = new WeakMap();
  const reset = picker => {
    results.delete(picker);
    attempts.delete(picker);
    picker.querySelector('[data-waiver-options]').replaceChildren();
    picker.querySelector('[data-waiver-message]').textContent = '';
  };
  async function find(picker) {
    if (isBusy()) return;
    reset(picker);
    const attempt = Symbol();
    attempts.set(picker, attempt);
    const name = picker.querySelector('[data-waiver-name]').value.trim();
    const status = picker.querySelector('[data-waiver-message]');
    if (name.length < 2) { status.textContent = 'Enter a participant name or waiver reference.'; return; }
    status.textContent = 'Finding signed waivers…';
    try {
      const { matches } = await search(name);
      if (signal.aborted || !picker.isConnected || attempts.get(picker) !== attempt) return;
      results.set(picker, matches);
      status.textContent = matches.length ? 'Confirm the participant and signing date before choosing.' : 'No current match. Check the spelling or copy the reference from Waiver Lookup.';
      picker.querySelector('[data-waiver-options]').innerHTML = matches.map((match, i) => {
        const date = new Date(match.signedAt);
        const signed = Number.isFinite(date.getTime()) ? date.toLocaleString('en-US', {dateStyle:'medium', timeStyle:'short', timeZone:'America/Los_Angeles'}) : '';
        return `<button class="btn btn-secondary" type="button" data-waiver-choice="${i}">${escape(match.name)}${signed ? ' · ' + escape(signed) + ' PT' : ''}</button>`;
      }).join('');
    } catch (error) {
      if (!signal.aborted && attempts.get(picker) === attempt) status.textContent = error.message || 'Waiver search unavailable. Try again.';
    }
  }
  root.addEventListener('input', event => {
    if (event.target.matches('[data-waiver-name]')) reset(event.target.closest('[data-waiver-picker]'));
  }, { signal });
  root.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || !event.target.matches('[data-waiver-name]')) return;
    event.preventDefault();
    void find(event.target.closest('[data-waiver-picker]'));
  }, { signal });
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-waiver-find],[data-waiver-choice]');
    if (!button || isBusy()) return;
    const picker = button.closest('[data-waiver-picker]');
    if (button.hasAttribute('data-waiver-find')) { void find(picker); return; }
    const match = results.get(picker)?.[Number(button.dataset.waiverChoice)];
    if (!match) return;
    reset(picker);
    try { await onChoose(match, picker); }
    catch (error) { if (!signal.aborted) picker.querySelector('[data-waiver-message]').textContent = error.message; }
  }, { signal });
}
