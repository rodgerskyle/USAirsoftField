import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import TeamLeaderboard from './TeamLeaderboard';

const id = '1ba1b987-74ae-4373-8b44-d484c1d10d50';
const field = { id: 'rebels', name: 'Rebels', source: 'field', rank: 1, points: 46, wins: null, losses: null };
const companion = { id, name: 'Rebels', source: 'companion', rank: 2, points: 23, wins: 2, losses: 1 };
const boards = {
    casual: { division: 'casual', teams: [field, companion], page: 1, totalPages: 1, totalTeams: 2 },
    competitive: { division: 'competitive', teams: [], page: 1, totalPages: 1, totalTeams: 0 },
};
const response = data => ({ ok: true, json: async () => data });
const originalFetch = global.fetch;

function mount(path = '/team-leaderboard') {
    return render(
        <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <HelmetProvider><TeamLeaderboard /></HelmetProvider>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    global.fetch = jest.fn(async url => response(boards[url.searchParams.get('division')]));
});

afterEach(() => {
    global.fetch = originalFetch;
});

test('loads public team scores and separates the Casual and Competitive divisions', async () => {
    mount();
    const board = await screen.findByRole('table', { name: 'Casual team standings' });
    expect(screen.getByRole('radio', { name: 'Casual', checked: true })).toBeInTheDocument();
    expect(within(board).getAllByRole('link', { name: 'Rebels Field team' }).map(link => link.getAttribute('href')))
        .toEqual(['/teams/rebels', `/teams/${id}?source=companion`]);
    expect(screen.getByText(/10 points per win and 3 per loss/)).toBeInTheDocument();
    expect(within(board).getAllByText('—')).toHaveLength(2);
    expect(within(board).getByText('2')).toHaveClass('field-lb-wins');
    expect(within(board).getByText('1')).toHaveClass('field-lb-losses');
    expect(within(board).getByText('23')).toHaveClass('field-lb-points');
    expect(global.fetch).toHaveBeenCalledWith(expect.objectContaining({
        href: 'https://app.usairsoftfield.com/api/team-leaderboard?division=casual&page=1',
    }), expect.objectContaining({ credentials: 'omit', headers: { Accept: 'application/json' } }));

    fireEvent.click(screen.getByRole('radio', { name: 'Competitive' }));
    expect(screen.queryByRole('table', { name: 'Casual team standings' })).not.toBeInTheDocument();
    expect(await screen.findByText('No competitive results have been published yet.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Competitive standings' })).toBeInTheDocument();
    expect(global.fetch.mock.calls[1][0].searchParams.get('division')).toBe('competitive');
});

test('opens direct page links and uses server ranks when paging', async () => {
    global.fetch.mockResolvedValueOnce(response({ ...boards.casual, totalPages: 2, totalTeams: 26 }));
    global.fetch.mockResolvedValueOnce(response({
        ...boards.casual, teams: [{ ...companion, rank: 26 }], page: 2, totalPages: 2, totalTeams: 26,
    }));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    expect(await screen.findByText('#26')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(global.fetch.mock.calls[1][0].searchParams.get('page')).toBe('2');
});

test('reports incomplete scores, supports retry, and preserves the selected division', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    global.fetch.mockResolvedValueOnce(response({
        ...boards.casual, teams: [companion], totalTeams: 1, unavailableSources: ['field'], recordedScores: true,
    }));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Team standings could not be loaded.');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Some team scores could not be loaded. These rankings are incomplete.')).toBeInTheDocument();
    expect(screen.getByText('Some teams are showing their last recorded scores.')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Casual team standings' })).toBeInTheDocument();
});

test('opens a direct link to competitive results without fetching casual scores', async () => {
    mount('/team-leaderboard?division=competitive');
    expect(await screen.findByText('No competitive results have been published yet.')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Competitive', checked: true })).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0].searchParams.get('division')).toBe('competitive');
});
