import React, { forwardRef, useLayoutEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAppearance } from '../Appearance';

const ThemedCaptcha = forwardRef(function ThemedCaptcha({ onExpired, ...props }, ref) {
  const theme = useAppearance()?.theme || 'light';
  const previousTheme = useRef(theme);

  // Google sets the color scheme when a widget is created. A fresh widget
  // needs a fresh challenge, while the surrounding form keeps its input.
  useLayoutEffect(() => {
    if (previousTheme.current !== theme) {
      previousTheme.current = theme;
      onExpired();
    }
  }, [theme, onExpired]);

  return <ReCAPTCHA {...props} key={theme} ref={ref} theme={theme} onExpired={onExpired} />;
});

export default ThemedCaptcha;
