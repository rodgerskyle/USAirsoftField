import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { bindGroupDesk, groupDeskMarkup } from '../constants/group-desk';
import './GroupDesk.css';

export default function AdminFieldGroups({ request }) {
  const host = useRef(null);
  const { search } = useLocation();
  useEffect(() => {
    const controller = new AbortController();
    host.current.innerHTML = groupDeskMarkup();
    bindGroupDesk(host.current.firstElementChild, { request, signal: controller.signal, initialId: new URLSearchParams(search).get('group') });
    return () => controller.abort();
  }, [request, search]);
  return <div ref={host} />;
}
