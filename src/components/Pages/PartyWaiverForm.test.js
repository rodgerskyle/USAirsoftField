import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import Waiver from './Waiver';
import AuthUserContext from '../session/context';

jest.mock('../Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('react-signature-pad-wrapper', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ isEmpty: () => false, toDataURL: () => 'data:image/png;base64,abc' })); return null; });
});
jest.mock('react-google-recaptcha', () => {
  const React = require('react');
  return React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ executeAsync: async () => 'mock-recaptcha' })); return null; });
});
const originalFetch = global.fetch;
const originalCrypto = Object.getOwnPropertyDescriptor(window, 'crypto');
beforeAll(() => Object.defineProperty(window, 'crypto', { configurable: true, value: require('crypto').webcrypto }));
afterAll(() => { if (originalCrypto) Object.defineProperty(window, 'crypto', originalCrypto); else delete window.crypto; });
const reply = waiverStatus => ({ok:true,json:async () => ({role:'guest',group:{name:'Sample party',entries:[{displayName:'Sample Player',preparation:{waiverStatus}}]}})});
afterEach(() => { window.history.replaceState(null, '', '/'); global.fetch = originalFetch; });

async function fillAgreement(container) {
  const submit = await screen.findByRole('button',{name:'Submit Waiver'});
  const values = { fname:'Sample', lname:'Player', email:'sample@example.test', phone:'5551234567', address:'Example', city:'Example', state:'CA', zipcode:'96007', dob:'2000-05-10' };
  for (const [name, value] of Object.entries(values)) fireEvent.change(container.querySelector(`[name="${name}"]`), {target:{value}});
  fireEvent.click(screen.getByRole('button',{name:'Save Signature'}));
  fireEvent.click(submit);
}

test('the official public waiver form sends one protected party submission with its existing CAPTCHA and signature', async () => {
  const token = '1'.repeat(64);
  window.history.replaceState(null, '', '/waiver#party/' + token);
  global.fetch = jest.fn().mockResolvedValueOnce(reply('missing')).mockResolvedValueOnce(reply('signed'));
  const firebase = {submitWaiver:jest.fn()};
  const view = render(<HelmetProvider><Waiver firebase={firebase} /></HelmetProvider>);
  expect(await screen.findByRole('link', { name: /Sign in to attach/ })).toHaveAttribute('href', '/login?waiver=member#party/' + token);
  await fillAgreement(view.container);
  expect(await screen.findByText(/Waiver verified/)).toBeVisible();
  expect(firebase.submitWaiver).not.toHaveBeenCalled();
  expect(fetch.mock.calls.map(([,opts]) => opts.method)).toEqual(['GET','POST']);
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({action:'signWaiver',waiverData:{name:'Sample Player',participantSignature:'data:image/png;base64,abc',recaptchaToken:'mock-recaptcha',additionalFields:{dob:'2000-05-10'}}});
});

test('opening the waiver without a party link still submits through the ordinary Firebase flow', async () => {
  window.history.replaceState(null, '', '/waiver');
  global.fetch = jest.fn();
  const signer = jest.fn().mockResolvedValue({data:{success:true}});
  const view = render(<HelmetProvider><Waiver firebase={{submitWaiver:() => signer}} /></HelmetProvider>);
  await fillAgreement(view.container);
  expect(await screen.findByText('Waiver Submitted Successfully!')).toBeVisible();
  expect(signer).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
});

function memberForm(accountName = 'Sample Player') {
  const account = { uid: 'member-account', name: accountName, roles: {} };
  const user = { uid: account.uid, getIdToken: jest.fn().mockResolvedValue('member-token') };
  const guestSubmit = jest.fn().mockResolvedValue({ data: { success: true } });
  const firebase = { auth: { currentUser: user }, submitWaiver: () => guestSubmit };
  const view = render(<HelmetProvider><AuthUserContext.Provider value={account}>
    <Waiver firebase={firebase} />
  </AuthUserContext.Provider></HelmetProvider>);
  return { ...view, guestSubmit, user };
}

test('member signature retries the same submission and only confirms a durable profile link', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Check signature status', code: 'pending' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, linked: true }) });
  const { container, guestSubmit } = memberForm();
  await fillAgreement(container);
  const retry = await screen.findByRole('button', { name: 'Retry member waiver' });
  expect(screen.getByRole('radio', { name: 'Another participant' })).toBeDisabled();
  fireEvent.click(retry);
  expect(await screen.findByText('Signed waiver attached to your member profile.')).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(2);
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('https://app.usairsoftfield.com/api/waivers/member-signature');
  expect(options.headers.Authorization).toBe('Bearer member-token');
  const payload = JSON.parse(options.body);
  expect(payload).toMatchObject({ submissionId: expect.stringMatching(/^[a-f0-9-]{36}$/), waiver: { name: 'Sample Player' } });
  expect(JSON.parse(fetch.mock.calls[1][1].body).submissionId).toBe(payload.submissionId);
  expect(guestSubmit).not.toHaveBeenCalled();
});

test('an account holder can sign for a different participant without claiming their waiver', async () => {
  global.fetch = jest.fn();
  const { container, guestSubmit, user } = memberForm('Guardian Player');
  await fillAgreement(container);
  expect(await screen.findByText(/Use the participant name on your member profile/)).toBeVisible();
  expect(guestSubmit).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('radio', { name: 'Another participant' }));
  fireEvent.click(screen.getByRole('button', { name: 'Submit Waiver' }));
  expect(await screen.findByText('Waiver Submitted Successfully!')).toBeVisible();
  expect(guestSubmit).toHaveBeenCalledTimes(1);
  expect(user.getIdToken).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test('returning to a personal invitation after member sign-in attaches only with the member token', async () => {
  const token = 'b'.repeat(64);
  window.history.replaceState(null, '', '/waiver?member=self#party/' + token);
  global.fetch = jest.fn().mockResolvedValueOnce(reply('missing')).mockResolvedValueOnce(reply('signed'));
  const { container, guestSubmit } = memberForm();
  expect(await screen.findByRole('radio', { name: /My member profile/ })).toBeChecked();
  await fillAgreement(container);
  expect(await screen.findByText(/Waiver verified/)).toBeVisible();
  const [url, options] = fetch.mock.calls[1];
  expect(url).toBe('https://app.usairsoftfield.com/api/party-readiness');
  expect(options.headers.Authorization).toBe('Party ' + token);
  expect(JSON.parse(options.body).memberToken).toBe('member-token');
  expect(guestSubmit).not.toHaveBeenCalled();
});

test.each(['STATIC', 'WAIVER', 'SUPER', 'ADMIN'])('shared %s sessions always start with another participant', role => {
  render(<HelmetProvider><AuthUserContext.Provider value={{uid: 'desk', name: 'Desk Account', roles: { [role]: true }}}>
    <Waiver firebase={{}} />
  </AuthUserContext.Provider></HelmetProvider>);
  expect(screen.getByRole('radio', { name: 'Another participant' })).toBeChecked();
});
