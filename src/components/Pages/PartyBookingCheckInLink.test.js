import React from 'react';
import { render, screen } from '@testing-library/react';
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import AuthUserContext from '../session/context';
import PartyBookingCheckInLink from './PartyBookingCheckInLink';

const booking = { title: 'Fixture family', size: '12', start: '2026-12-06T00:00:00Z', end: '2026-12-06T02:00:00Z' };
const view = admin => (
  <AuthUserContext.Provider value={{ roles: admin ? { ADMIN: true } : { WAIVER: true } }}>
    <PartyBookingCheckInLink booking={booking} />
  </AuthUserContext.Provider>
);

test('opens staff group lookup on the Pacific party date and passes only the booking fingerprint', async () => {
  const originalCrypto = Object.getOwnPropertyDescriptor(window, 'crypto');
  const originalEncoder = Object.getOwnPropertyDescriptor(window, 'TextEncoder');
  try {
    Object.defineProperty(window, 'crypto', { configurable: true, value: webcrypto });
    Object.defineProperty(window, 'TextEncoder', { configurable: true, value: TextEncoder });
    const { rerender } = render(view(true));
    const link = await screen.findByRole('link', { name: /Open group check-in/ });
    expect(link.getAttribute('href')).toMatch(/^\/admin\/field\/check-in\?partyDate=2026-12-05&booking=[a-f0-9]{64}#arriving-group$/);
    expect(link).toHaveAttribute('target', '_blank');
    rerender(view(false));
    expect(screen.queryByRole('link')).toBeNull();
  } finally {
    if (originalCrypto) Object.defineProperty(window, 'crypto', originalCrypto);
    else delete window.crypto;
    if (originalEncoder) Object.defineProperty(window, 'TextEncoder', originalEncoder);
    else delete window.TextEncoder;
  }
});
