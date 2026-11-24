import { uploadBytes } from 'firebase/storage';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';
import { memberWaiverSaver } from './saveMemberWaiver';

jest.mock('firebase/storage', () => ({ uploadBytes: jest.fn() }));
jest.mock('@react-pdf/renderer', () => ({ pdf: () => ({ toBlob: async () => new Blob(['signed']) }) }));
jest.mock('./SignedWaiver', () => () => null);
jest.mock('../constants/fieldStaffApi', () => ({ requestStaffFieldTool: jest.fn() }));

test('a membership form retries the same account and uploaded generation after a lost acknowledgement', async () => {
  const save = memberWaiverSaver();
  const firebase = { auth: { currentUser: { uid: 'desk' } }, membersWaivers: name => 'members/' + name };
  uploadBytes.mockResolvedValue({ metadata: { generation: '22682' } });
  requestStaffFieldTool.mockRejectedValueOnce(new Error('Connection lost'))
    .mockResolvedValue({ success: true, signedAt: Date.now() });
  const signed = { name: 'A Player', dob: '1990-01-01', participantSignature: 'data:fixture' };
  await expect(save(firebase, 'participant', signed)).rejects.toThrow('Connection lost');
  await save(firebase, 'participant', signed);
  expect(uploadBytes.mock.calls.map(args => args[0])).toEqual(['members/participant.pdf']);
  expect(requestStaffFieldTool).toHaveBeenLastCalledWith(firebase, 'desk', '/api/waivers/member-pdf', {
    method: 'POST', body: { memberId: 'participant', generation: '22682' },
  });
  await save(firebase, 'other-participant', signed);
  expect(uploadBytes.mock.calls.map(args => args[0])).toEqual(['members/participant.pdf', 'members/other-participant.pdf']);
});
