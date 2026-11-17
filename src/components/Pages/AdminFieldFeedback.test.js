import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminFieldFeedback from './AdminFieldFeedback';

const suggestion = {
  id: 'suggestion-one', kind: 'suggestion', category: 'field', message: 'More covered tables, please.',
  createdAt: '2026-11-15T22:00:00Z', updatedAt: '2026-11-15T22:00:00Z', status: 'new',
};
const recap = {
  id: 'recap-one', kind: 'recap', date: '2026-11-14', overall: 4, gameVariety: 5,
  breakTimes: null, teamBalance: 3, comment: '<img src=x onerror=alert(1)>',
  createdAt: '2026-11-15T23:00:00Z', updatedAt: '2026-11-15T23:00:00Z', status: 'reviewed',
};

test('paginates shared feedback and changes review state without rendering identities or HTML', async () => {
  const request = jest.fn()
    .mockResolvedValueOnce({ items: [suggestion], nextCursor: 'next-page' })
    .mockResolvedValueOnce({ items: [recap], nextCursor: null })
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce({ items: [], nextCursor: null });
  render(<AdminFieldFeedback request={request} />);
  expect(await screen.findByText(suggestion.message)).toBeInTheDocument();
  expect(request).toHaveBeenNthCalledWith(1, '/api/player-feedback?kind=all&status=new', expect.any(Object));
  fireEvent.click(screen.getByRole('button', { name: 'Load more feedback' }));
  expect(await screen.findByText(recap.comment)).toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
  expect(screen.getByText('4 / 5')).toBeInTheDocument();
  expect(screen.queryByText('Break times')).not.toBeInTheDocument();
  expect(request).toHaveBeenNthCalledWith(2, '/api/player-feedback?kind=all&status=new&cursor=next-page', expect.any(Object));
  fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }));
  expect(await screen.findByText('Marked reviewed.')).toBeInTheDocument();
  expect(screen.queryByText(suggestion.message)).not.toBeInTheDocument();
  expect(request).toHaveBeenNthCalledWith(3, '/api/player-feedback', expect.objectContaining({
    method: 'POST', body: { kind: 'suggestion', id: suggestion.id, status: 'reviewed', updatedAt: suggestion.updatedAt },
  }));
});

test('asks staff to refresh when the reviewed entry changed during the request', async () => {
  const request = jest.fn()
    .mockResolvedValueOnce({ items: [suggestion], nextCursor: null })
    .mockRejectedValueOnce(Object.assign(new Error('Entry changed.'), { status: 409 }));
  render(<AdminFieldFeedback request={request} />);
  await screen.findByText(suggestion.message);
  fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('This feedback changed. Refresh the list before reviewing it.');
  expect(screen.getByText(suggestion.message)).toBeInTheDocument();
});

test('aborts the previous filter request and prevents late results from replacing current results', async () => {
  let finishOld;
  let oldSignal;
  const request = jest.fn()
    .mockImplementationOnce((_, options) => {
      oldSignal = options.signal;
      return new Promise(resolve => { finishOld = resolve; });
    })
    .mockResolvedValueOnce({ items: [suggestion], nextCursor: null })
    .mockResolvedValueOnce({ items: [{ ...suggestion, status: 'reviewed' }], nextCursor: null });
  render(<AdminFieldFeedback request={request} />);
  fireEvent.change(screen.getByLabelText('Submission type'), { target: { value: 'suggestion' } });
  expect(await screen.findByText(suggestion.message)).toBeInTheDocument();
  expect(oldSignal.aborted).toBe(true);
  await act(async () => finishOld({ items: [recap], nextCursor: null }));
  expect(screen.queryByText(recap.comment)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Review status'), { target: { value: 'reviewed' } });
  expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument();
  await waitFor(() => expect(request).toHaveBeenLastCalledWith(
    '/api/player-feedback?kind=suggestion&status=reviewed', expect.any(Object),
  ));
});

test('clears private entries when access fails and aborts requests when the panel unmounts', async () => {
  let pendingSignal;
  const request = jest.fn()
    .mockResolvedValueOnce({ items: [suggestion], nextCursor: null })
    .mockRejectedValueOnce(Object.assign(new Error('Staff session expired.'), { status: 403 }))
    .mockImplementationOnce((_, options) => {
      pendingSignal = options.signal;
      return new Promise(() => {});
    });
  const view = render(<AdminFieldFeedback request={request} />);
  await screen.findByText(suggestion.message);
  fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Staff session expired.');
  expect(screen.queryByText(suggestion.message)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh feedback' }));
  view.unmount();
  expect(pendingSignal.aborted).toBe(true);
});

test('refreshes averages for the selected filters after reviewing changes that subset', async () => {
  const request = jest.fn().mockResolvedValueOnce({
    items: [suggestion], nextCursor: null,
    summary: { recaps: 2, suggestions: 1, unreviewed: 3, averages: { overall: 4.5, gameVariety: 4, breakTimes: null, teamBalance: 3.5 } },
  }).mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({
    items: [], nextCursor: null,
    summary: { recaps: 2, suggestions: 0, unreviewed: 2, averages: { overall: 4.5, gameVariety: 4, breakTimes: null, teamBalance: 3.5 } },
  });
  render(<AdminFieldFeedback request={request} />);
  expect(await screen.findByRole('heading', { name: 'Filtered feedback overview' })).toBeInTheDocument();
  expect(screen.getByText('4.5 / 5')).toBeInTheDocument();
  expect(screen.getByText('No ratings')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Mark reviewed' }));
  await screen.findByText('Marked reviewed.');
  expect(await screen.findByText('2 game-day responses · 0 suggestions')).toBeInTheDocument();
  expect(screen.getByText('4.5 / 5')).toBeInTheDocument();
});

test('review followed by reopen uses the refreshed revision without a manual refresh', async () => {
  let entry = { ...suggestion };
  const request = jest.fn(async (path, options) => {
    if (options.method === 'POST') {
      if (options.body.updatedAt !== entry.updatedAt) throw Object.assign(new Error('Entry changed.'), { status: 409 });
      entry = { ...entry, status: options.body.status, updatedAt: entry.status === 'new' ? '2026-11-15T22:00:01Z' : '2026-11-15T22:00:02Z' };
      return { ok: true };
    }
    return { items: [{ ...entry }], nextCursor: null };
  });
  render(<AdminFieldFeedback request={request} />);
  await screen.findByText(suggestion.message);
  fireEvent.change(screen.getByLabelText('Review status'), { target: { value: 'all' } });
  fireEvent.click(await screen.findByRole('button', { name: 'Mark reviewed' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Reopen' }));
  expect(await screen.findByText('Feedback reopened.')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: 'Mark reviewed' })).toBeEnabled();
  const writes = request.mock.calls.filter(([, options]) => options.method === 'POST');
  expect(writes).toHaveLength(2);
  expect(writes[1][1].body).toEqual({
    kind: 'suggestion', id: suggestion.id, status: 'new', updatedAt: '2026-11-15T22:00:01Z',
  });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
