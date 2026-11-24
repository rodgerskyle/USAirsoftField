import React, { useEffect, useRef } from 'react';
import { bindWaiverPicker, waiverPickerMarkup } from '../constants/staff-waiver-picker';

export default function StaffWaiverPicker({ request, name = '', focus = false, autoSearch = false, disabled, onChoose, searchWaivers }) {
  const root = useRef(null);
  const latest = useRef();
  const pendingSearch = useRef(null);
  const pendingFocus = useRef(false);
  latest.current = { disabled, onChoose };
  useEffect(() => {
    const controller = new AbortController();
    root.current.innerHTML = waiverPickerMarkup({ name });
    const find = bindWaiverPicker(root.current, {
      signal: controller.signal,
      isBusy: () => latest.current.disabled,
      search: query => searchWaivers ? searchWaivers(query, controller.signal) : request('/api/staff-waivers', {
        method: 'POST', body: { name: query }, signal: controller.signal,
      }),
      onChoose: match => latest.current.onChoose(match),
    });
    pendingSearch.current = autoSearch && name.trim().length >= 2 ? () => find(root.current.querySelector('[data-waiver-picker]')) : null;
    pendingFocus.current = focus;
    return () => controller.abort();
  }, [request, name, focus, autoSearch, searchWaivers]);
  useEffect(() => {
    if (disabled) return;
    if (pendingFocus.current) {
      pendingFocus.current = false;
      root.current.querySelector('[data-waiver-name]')?.focus();
    }
    if (pendingSearch.current) {
      const find = pendingSearch.current;
      pendingSearch.current = null;
      void find();
    }
  }, [request, name, focus, autoSearch, searchWaivers, disabled]);
  return <fieldset disabled={disabled}><div ref={root} /></fieldset>;
}
