import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import Waiver from './Waiver';

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
