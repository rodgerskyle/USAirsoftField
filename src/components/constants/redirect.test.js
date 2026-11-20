import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Redirect from './redirect';

jest.mock('../Firebase', () => ({ withFirebase: component => component }));

function CurrentLocation() {
  const { pathname, search } = useLocation();
  return <output aria-label="Current page">{pathname + search}</output>;
}

function visit(pathname, roles) {
  const firebase = { onAuthUserListener: signedIn => { signedIn({ uid: 'fixture-waiver-player', roles }); return jest.fn(); } };
  render(<MemoryRouter initialEntries={[pathname]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Redirect firebase={firebase} /><CurrentLocation />
  </MemoryRouter>);
}

test.each(['/player-hub', '/group-check-in', '/player-comparison', '/player-milestones/FixturePlayer123', '/information/rules/classic'])(
  'a signed-in waiver player can open the player tool %s', async pathname => {
    visit(pathname, { WAIVER: 'WAIVER' });
    expect(await screen.findByLabelText('Current page')).toHaveTextContent(pathname);
  },
);

test('the shared waiver kiosk retains its restricted route', async () => {
  visit('/group-check-in', { WAIVER: 'WAIVER', STATIC: 'STATIC' });
  expect(await screen.findByLabelText('Current page')).toHaveTextContent('/dashboard/waiverform');
});

test('a Companion rental link opens the waiver desk with the same group preselected', () => {
  const query = '?view=new&group=d66f62ef-6dc1-455a-81f3-cefe92f0307a';
  visit('/admin/rentalform' + query, { WAIVER: true });
  expect(screen.getByLabelText('Current page').textContent).toBe('/dashboard/rentalform' + query);
});
