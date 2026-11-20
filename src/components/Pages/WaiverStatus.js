import React from 'react';
import { waiverStatusIcon, waiverStatusLabel } from '../constants/waiver-status';

export default function WaiverStatus({ status }) {
  return <span className="waiver-status" data-status={status}>
    <span aria-hidden="true">{waiverStatusIcon(status)}</span>{' '}{waiverStatusLabel(status)}
  </span>;
}
