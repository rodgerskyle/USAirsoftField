import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { AppearanceProvider, useAppearance } from './Appearance';
import { PasswordForgetForm } from './passwordForgot';

jest.mock('./components/Firebase', () => ({ withFirebase: Component => Component }));
jest.mock('react-google-recaptcha', () => {
  const React = require('react');
  return React.forwardRef(({ theme }, ref) =>
    <div ref={ref} aria-label="CAPTCHA challenge" data-theme={theme} />
  );
});

function ThemeToggle() {
  const { onToggle } = useAppearance();
  return <button onClick={onToggle}>Change appearance</button>;
}

test('password reset opens with an empty form and replaces the challenge on theme changes', () => {
  window.localStorage.setItem('usaw-field-theme', 'light');
  render(
    <HelmetProvider>
      <AppearanceProvider><PasswordForgetForm /><ThemeToggle /></AppearanceProvider>
    </HelmetProvider>
  );
  const input = screen.getByRole('textbox', { name: 'Email Address' });
  const submit = screen.getByRole('button', { name: 'Reset My Password' });
  const firstChallenge = screen.getByLabelText('CAPTCHA challenge');
  expect(input).toHaveValue('');
  expect(submit).toBeDisabled();
  expect(firstChallenge).toHaveAttribute('data-theme', 'light');

  fireEvent.click(screen.getByRole('button', { name: 'Change appearance' }));
  expect(firstChallenge).not.toBeInTheDocument();
  expect(screen.getByLabelText('CAPTCHA challenge')).toHaveAttribute('data-theme', 'dark');
  expect(input).toHaveValue('');
  expect(submit).toBeDisabled();
  window.localStorage.removeItem('usaw-field-theme');
});
