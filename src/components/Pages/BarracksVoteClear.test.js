import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import BarracksTV from './BarracksTV';
import { LIVE_ROUNDS_PATH } from './FieldRoundsShared';

test('Barracks TV drops a cleared vote and can display the next one while the same round, break and award remain onscreen', async () => {
  jest.useFakeTimers();
  try {
    const start = Date.now();
    const at = seconds => new Date(start + seconds * 1000).toISOString();
    const original = { id: 'first', title: 'Previous poll', closesAt: at(300), closed: true,
      options: [{modeId: 'three-flag', label: '3 Flag', votes: 5}], winnerModeIds: ['three-flag'], publishedGameId: 'round' };
    let poll = original;
    let awarded = false;
    let offline = false;
    const request = jest.fn(async path => {
      if (offline && path === LIVE_ROUNDS_PATH) throw Error('Offline');
      if (path === LIVE_ROUNDS_PATH) return {
        serverNow: new Date().toISOString(), poll, celebrationCursor: awarded ? 5 : 4,
        games: [{ id: 'round', status: 'queued', title: 'Afternoon round', startsAt: at(300), endsAt: at(1800) }],
        barracksClock: {kind:'break', endsAt:at(300), revision:1},
      };
      if (path.endsWith('After=4') && awarded) return { cursor:5, events:[
        { sequence:5, kind:'virtual', playerName:'Night Owl', patchName:'Battle Buddy' },
      ] };
      return { cursor:awarded ? 5 : 4, events:[] };
    });
    render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <BarracksTV request={request} />
    </MemoryRouter></HelmetProvider>);
    await act(async () => {});
    expect(screen.getByText('Voting closed')).toBeInTheDocument();
    expect(screen.getByText('5 votes')).toBeInTheDocument();
    expect(screen.getByText('Winning round is on the schedule.')).toBeInTheDocument();
    const timer = screen.getByRole('timer', {name:'Time until break ends'});
    await act(async () => { jest.advanceTimersByTime(7000); });
    awarded = true;
    await act(async () => { jest.advanceTimersByTime(3000); });
    const celebration = screen.getByRole('heading', {name:'Night Owl'});
    poll = null;
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.queryByText('Previous poll')).not.toBeInTheDocument();
    expect(screen.queryByText('5 votes')).not.toBeInTheDocument();
    expect(screen.queryByText('Winning round is on the schedule.')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {name:'Night Owl'})).toBe(celebration);
    expect(screen.getByRole('timer', {name:'Time until break ends'})).toBe(timer);
    expect(timer).toHaveTextContent('04:50');
    expect(screen.getByRole('heading', {name:'Afternoon round'})).toBeInTheDocument();

    poll = { ...original, id:'next', title:'Evening poll', closed:false, winnerModeIds:[], publishedGameId:null,
      options:[{modeId:'countdown',label:'Countdown',votes:0}] };
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.getByRole('heading', {name:'Evening poll'})).toBeInTheDocument();
    expect(screen.getByText('Voting open')).toBeInTheDocument();
    expect(screen.getByText('0 votes')).toBeInTheDocument();
    expect(timer).toHaveTextContent('04:40');

    offline = true;
    poll = null;
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.getByText(/Live updates interrupted/)).toBeInTheDocument();
    expect(screen.queryByText('Voting open')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', {name:'Afternoon round'})).toBeInTheDocument();
    offline = false;
    await act(async () => { jest.advanceTimersByTime(10000); });
    expect(screen.queryByText(/Live updates interrupted/)).not.toBeInTheDocument();
    expect(screen.queryByRole('timer', {name:'Voting time remaining'})).not.toBeInTheDocument();
    expect(screen.queryByText('Evening poll')).not.toBeInTheDocument();
  } finally { jest.useRealTimers(); }
});
