import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { mountGroupMemberPicker } from './group-member-picker';

const originalFetch = global.fetch;
const endpoint = '/api/leaderboard';
const alex = { id: 'FixtureAlpha001', name: 'Alex Fox', displayName: 'Fox', rankName: 'Recruit' };
const otherAlex = { ...alex, id: 'FixtureBravo002', rankName: 'Corporal' };
let cleanup;

function mount(overrides = {}) {
  const element = document.createElement('div');
  document.body.appendChild(element);
  const onAdd = jest.fn().mockResolvedValue(undefined);
  cleanup = mountGroupMemberPicker(element, {
    endpoint, profileHref: id => `/profile/${id}`, rosterIds: () => [], isFull: () => false,
    onAdd, ...overrides,
  });
  return onAdd;
}

function enter(value) {
  fireEvent.input(screen.getByLabelText('Member name, callsign, ID or profile link'), { target: { value } });
}

function search(value) {
  enter(value);
  fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
}

function response(players, pagination = {}) {
  return { ok: true, json: async () => ({ players, page: 1, totalPages: 1, totalPlayers: players.length, ...pagination }) };
}

function deferred() {
  let resolve;
  const promise = new Promise(finish => { resolve = finish; });
  return { promise, resolve };
}

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => {
  if (cleanup) cleanup();
  cleanup = undefined;
  document.body.replaceChildren();
  global.fetch = originalFetch;
});

test('an explicit public search distinguishes identical names by profile and adds the selected account ID', async () => {
  const pending = deferred();
  global.fetch.mockReturnValue(pending.promise);
  const onAdd = mount();
  enter('Fox');
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
  expect(screen.getByText(/searching|loading|looking up/i)).toBeVisible();
  const [resource, options] = global.fetch.mock.calls[0];
  const url = new URL(resource, window.location.href);
  expect(url.pathname).toBe(endpoint);
  expect(Object.fromEntries(url.searchParams)).toMatchObject({ lookup: 'players', q: 'Fox', page: '1' });
  expect(options.credentials).toBe('omit');
  const headers = options.headers;
  expect(headers?.get ? headers.get('Authorization') : Object.keys(headers || {}).find(key => key.toLowerCase() === 'authorization')).toBeFalsy();

  pending.resolve(response([alex, otherAlex]));
  const profiles = await screen.findAllByRole('link', { name: 'View profile' });
  expect(profiles.map(link => link.getAttribute('href'))).toEqual([`/profile/${alex.id}`, `/profile/${otherAlex.id}`]);
  const [first, second] = profiles.map(link => within(link.closest('li')));
  expect(first.getByText('Alex Fox')).toBeVisible();
  expect(second.getByText('Alex Fox')).toBeVisible();
  expect(first.getByText(/Recruit/)).toBeVisible();
  expect(second.getByText(/Corporal/)).toBeVisible();
  fireEvent.click(second.getByRole('button', { name: 'Add to group' }));
  expect(onAdd.mock.calls.map(call => call[0])).toEqual([otherAlex.id]);
});

test('members already on the roster and members blocked by the capacity limit cannot be added', async () => {
  global.fetch.mockResolvedValue(response([alex, otherAlex]));
  const onAdd = mount({ rosterIds: () => [alex.id], isFull: () => true });
  search('Fox');
  const existing = await screen.findByRole('button', { name: 'On roster' });
  const full = screen.getByRole('button', { name: 'Group full' });
  expect(existing).toBeDisabled();
  expect(full).toBeDisabled();
  fireEvent.click(existing);
  fireEvent.click(full);
  expect(onAdd).not.toHaveBeenCalled();
});

test('paging reuses the submitted search and displays the matching profile on each page', async () => {
  const first = response([alex], { page: 1, totalPages: 2, totalPlayers: 2 });
  const second = response([otherAlex], { page: 2, totalPages: 2, totalPlayers: 2 });
  global.fetch.mockResolvedValueOnce(first).mockResolvedValueOnce(second).mockResolvedValueOnce(first);
  mount();
  search('Fox');
  expect(await screen.findByRole('link', { name: 'View profile' })).toHaveAttribute('href', `/profile/${alex.id}`);
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute('href', `/profile/${otherAlex.id}`));
  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  await waitFor(() => expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute('href', `/profile/${alex.id}`));
  expect(global.fetch.mock.calls.map(([resource]) => {
    const query = new URL(resource, window.location.href).searchParams;
    return [query.get('q'), query.get('page')];
  })).toEqual([['Fox', '1'], ['Fox', '2'], ['Fox', '1']]);
});

test('editing a search aborts it and a late response cannot replace the next results or restore an old selection', async () => {
  const first = deferred();
  global.fetch.mockReturnValueOnce(first.promise).mockResolvedValueOnce(response([otherAlex]));
  mount();
  search('Alpha');
  const oldSignal = global.fetch.mock.calls[0][1].signal;
  search('Bravo');
  expect(oldSignal.aborted).toBe(true);
  await screen.findByRole('link', { name: 'View profile' });
  first.resolve(response([alex]));
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(screen.getByRole('link', { name: 'View profile' })).toHaveAttribute('href', `/profile/${otherAlex.id}`);
  enter('Another search');
  expect(screen.queryByRole('button', { name: 'Add to group' })).toBeNull();
});

test('empty results and failed searches have distinct feedback and a failed search can be retried', async () => {
  global.fetch.mockResolvedValueOnce(response([]))
    .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
    .mockResolvedValueOnce(response([alex]));
  mount();
  search('Missing');
  expect(await screen.findByText(/no .*?(found|match|results)|no members/i)).toBeVisible();
  search('Fox');
  expect(await screen.findByText(/unavailable|try again|could not|couldn’t|failed/i)).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Add to group' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Search members' }));
  expect(await screen.findByRole('button', { name: 'Add to group' })).toBeEnabled();
});

test('cleanup aborts the active search and prevents late results and subsequent searches', async () => {
  const pending = deferred();
  global.fetch.mockReturnValueOnce(pending.promise);
  mount();
  search('Fox');
  const signal = global.fetch.mock.calls[0][1].signal;
  const button = screen.getByRole('button', { name: 'Search members' });
  cleanup();
  cleanup = undefined;
  expect(signal.aborted).toBe(true);
  pending.resolve(response([alex]));
  await new Promise(resolve => setTimeout(resolve, 0));
  fireEvent.click(button);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Add to group' })).toBeNull();
});
