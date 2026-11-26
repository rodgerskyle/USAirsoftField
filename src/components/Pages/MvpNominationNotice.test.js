import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthUserContext } from '../session';
import { requestPublicFieldTool } from '../constants/fieldStaffApi';
import MvpNominationNotice from './MvpNominationNotice';

jest.mock('../constants/fieldStaffApi', () => ({ requestPublicFieldTool: jest.fn() }));
const id = '065b2ed7-762d-4c27-ae09-815f41b85265';
const otherId = '065b2ed7-762d-4c27-ae09-815f41b85266';
const serverNow = '2026-11-21T22:00:00Z';
const poll = { id, roundTitle: 'Flag Procurement', closesAt: '2026-11-21T22:10:00Z' };
function refresh() { fireEvent(document, new Event('visibilitychange')); }
function desk(actor = null, path = '/player-hub') {
  return <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <AuthUserContext.Provider value={actor}><MvpNominationNotice /></AuthUserContext.Provider>
  </MemoryRouter>;
}
afterEach(() => { jest.clearAllMocks(); localStorage.clear(); });

test('announces only open nominations, supports guests, and suppresses clicked and voted notices', async () => {
  let active = null;
  requestPublicFieldTool.mockImplementation(async () => ({ serverNow, mvpPoll:active }));
  const view = render(desk());
  await waitFor(() => expect(requestPublicFieldTool).toHaveBeenCalledWith('/api/live-games?mvpNotice=1', { signal:expect.anything() }));
  expect(screen.queryByRole('link', { name:'Nominate a player' })).toBeNull();
  active = poll;
  refresh();
  const link = await screen.findByRole('link', { name:'Nominate a player' });
  expect(link.getAttribute('href')).toBe('/live-polls?mvp=' + id + '#round-mvp');
  fireEvent.click(screen.getByRole('button', { name:'Dismiss' }));
  refresh();
  await act(async () => {});
  expect(screen.queryByText('Flag Procurement has ended.')).toBeNull();
  view.rerender(desk({ uid:'other-player' }));
  await screen.findByText('Flag Procurement has ended.');
  act(() => { window.dispatchEvent(new CustomEvent('usaw:mvp-voted', {detail:{pollId:id}})); });
  expect(screen.queryByRole('link')).toBeNull();
  active = {...poll,id:otherId};
  refresh();
  fireEvent.click(await screen.findByRole('link'));
  expect(localStorage.getItem('usaw-mvp-notice:other-player')).toBe(otherId);
  expect(screen.queryByRole('link')).toBeNull();
});

test('drops stale requests after a newer refresh and suppresses elapsed, closed or invalid notices', async () => {
  let finish;
  requestPublicFieldTool.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
    .mockResolvedValue({ serverNow, mvpPoll:{...poll, closesAt:serverNow} });
  render(desk({uid:'expiry'}));
  await waitFor(() => expect(finish).toEqual(expect.any(Function)));
  refresh();
  await act(async () => finish({ serverNow, mvpPoll:poll }));
  expect(screen.queryByRole('link')).toBeNull();
  for (const invalid of [{...poll,closed:true},{...poll,id:'bogus'}]) {
    requestPublicFieldTool.mockResolvedValueOnce({serverNow, mvpPoll:invalid});
    refresh();
    await act(async () => {});
    expect(screen.queryByRole('link')).toBeNull();
  }
});

test('avoids loading the separate notice on the ballot page', async () => {
  render(desk(null,'/live-polls?mvp=' + id + '#round-mvp'));
  await act(async () => {});
  expect(requestPublicFieldTool).not.toHaveBeenCalled();
  expect(screen.queryByRole('link')).toBeNull();
});
