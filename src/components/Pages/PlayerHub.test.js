import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import PlayerHub from './PlayerHub';

jest.mock('./PlayerHubAccount', () => () => <section aria-label="Current player account">Current player</section>);

test('headlines the branded app install link and QR before a signed-in player card', () => {
  render(<HelmetProvider><MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <PlayerHub />
  </MemoryRouter></HelmetProvider>);
  const install = screen.getByRole('region', { name: 'Install the USAW Field Companion' });
  const account = screen.getByRole('region', { name: 'Current player account' });
  expect(install.compareDocumentPosition(account) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Install the app' })).toHaveAttribute('href', 'https://app.usairsoftfield.com/#install');
  expect(screen.getByRole('link', { name: 'Open the USAW app installation page' })).toHaveAttribute('href', 'https://app.usairsoftfield.com/#install');
  expect(screen.getByAltText('Scan to install the USAW Field Companion on your phone')).toHaveAttribute('src', '/assets/usaw-companion-install-qr.png');
  expect(screen.getByText(/iPhone · Add to Home Screen/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Compare players/ })).toHaveAttribute('href', '/player-comparison');
  expect(screen.getByRole('link', { name: /Group check-in/ })).toHaveAttribute('href', '/group-check-in');
});
