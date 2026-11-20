import React, { useEffect, useRef } from 'react';
import { bindWaiverPicker, waiverPickerMarkup } from '../constants/staff-waiver-picker';

export default function StaffWaiverPicker({ request, name = '', disabled, onChoose }) {
  const root = useRef(null);
  const latest = useRef();
  latest.current = { disabled, onChoose };
  useEffect(() => {
    const controller = new AbortController();
    root.current.innerHTML = waiverPickerMarkup({ name });
    bindWaiverPicker(root.current, {
      signal: controller.signal,
      isBusy: () => latest.current.disabled,
      search: query => request('/api/staff-waivers', {
        method: 'POST', body: { name: query }, signal: controller.signal,
      }),
      onChoose: match => latest.current.onChoose(match),
    });
    return () => controller.abort();
  }, [request, name]);
  return <fieldset disabled={disabled}><div ref={root} /></fieldset>;
}
