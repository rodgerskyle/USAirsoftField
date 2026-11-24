import React from 'react';
import { render, screen } from '@testing-library/react';
import SignedWaiver from './SignedWaiver';

jest.mock('@react-pdf/renderer', () => {
  const React = require('react');
  const container = ({children}) => <div>{children}</div>;
  const text = ({children}) => <span>{children}</span>;
  const image = ({src}) => <img src={src} alt="Waiver signature" />;
  return { Document: container, Page: container, Text: text, Image: image, StyleSheet: { create: styles => styles } };
});

const participant = 'data:image/png;base64,cGFydGljaXBhbnQ=';
const guardianInk = 'data:image/png;base64,Z3VhcmRpYW4=';
const record = {
  name: 'Alex Morgan', email: 'alex@example.test', participantSignature: participant,
  // July 15 UTC is still July 14 at the field, the day before this signer turned 18.
  timestamp: Date.parse('2025-07-15T03:00:00Z'),
};
const details = { dob: '2007-07-15', city: 'Redding', phone: '555-0100' };
const guardian = { name: 'Jamie Morgan', phone: '555-0130', signature: guardianInk };

test.each([
  ['desk form', { ...details, guardian }],
  ['public form', { additionalFields: { ...details, guardianName: guardian.name, guardianPhone: guardian.phone, guardianSignature: guardianInk } }],
  ['flat archive form', { ...details, guardianName: guardian.name, guardianPhone: guardian.phone, guardianSignature: guardianInk }],
])('prints both signatures and the original field date for a minor’s %s', (source, fields) => {
  render(<SignedWaiver {...record} {...fields} />);
  expect(screen.getByText('Alex Morgan')).toBeVisible();
  expect(screen.getByText('Jamie Morgan')).toBeVisible();
  expect(screen.getByText('555-0130')).toBeVisible();
  expect(screen.getByText('17')).toBeVisible();
  expect(screen.getByText('Redding')).toBeVisible();
  expect(screen.getByText('7/14/2025')).toBeVisible();
  expect(screen.getAllByAltText('Waiver signature').map(node => node.getAttribute('src'))).toEqual([participant, guardianInk]);
});

test('prints the signing date for adults without adding a guardian section', () => {
  render(<SignedWaiver {...record} {...details} dob="2000-07-15" />);
  expect(screen.getByText('24')).toBeVisible();
  expect(screen.getByText('7/14/2025')).toBeVisible();
  expect(screen.queryByText(/Print Parent or Guardian/)).toBeNull();
  expect(screen.getAllByAltText('Waiver signature')).toHaveLength(1);
});
