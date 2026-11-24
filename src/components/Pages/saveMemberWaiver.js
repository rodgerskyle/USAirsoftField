import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { uploadBytes } from 'firebase/storage';
import SignedWaiver from './SignedWaiver';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { memberWaiverMetadata } from '../utils/memberWaiverDocument';

// Keep the uploaded generation while the form stays open. A retry after a lost
// acknowledgement must confirm the same signature, without replacing the PDF.
export function memberWaiverSaver() {
  let previous;
  return async function save(firebase, memberId, signed) {
    const fingerprint = JSON.stringify([memberId, signed]);
    if (!previous || previous.fingerprint !== fingerprint) {
      const blob = await pdf(<SignedWaiver {...signed} />).toBlob();
      const upload = await uploadBytes(firebase.membersWaivers(memberId + '.pdf'), blob, memberWaiverMetadata);
      const generation = upload.metadata.generation;
      if (!generation) throw new Error('Could not confirm the saved waiver. Retry the signature.');
      previous = { fingerprint, generation };
    }
    const result = await requestStaffFieldTool(firebase, firebase.auth?.currentUser?.uid, '/api/waivers/member-pdf', {
      method: 'POST', body: { memberId, generation: previous.generation },
    });
    if (result.success !== true || !Number.isFinite(result.signedAt)) {
      throw new Error('Could not confirm the waiver on this profile. Retry to finish.');
    }
  };
}
