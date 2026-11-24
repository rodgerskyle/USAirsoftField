import { push, set } from 'firebase/database';
import { membershipWaiverRequest } from './MembershipWaiverCheck';
import { WaiverPageFormBase } from './FillOutWaiver';

jest.mock('firebase/database', () => ({ push: jest.fn(), set: jest.fn() }));
jest.mock('./MembershipWaiverCheck', () => ({ membershipWaiverRequest: jest.fn() }));
jest.mock('@react-pdf/renderer', () => ({ pdf: jest.fn() }));
jest.mock('./SignedWaiver', () => () => null);

beforeEach(() => { jest.clearAllMocks(); });

function deskForm(member) {
  const desk = new WaiverPageFormBase({ firebase: { auth: { currentUser: { uid: 'staff' } }, digitalWaivers: () => 'digital' } });
  desk.setState = patch => Object.assign(desk.state, patch);
  Object.assign(desk.state, { fname: 'River', lname: 'Test', phone: '5555550100', state: 'CA', zipcode: '96000',
    age: 20, dob: '2006-01-01', participantImg: 'data:image/png;base64,ABC', selectedMember: member, acceptEmailSubscription: false });
  return desk;
}

test('desk signing retries the same signed record for the chosen member', async () => {
  push.mockReturnValue({ key: 'waiver-key' });
  set.mockResolvedValue();
  membershipWaiverRequest.mockRejectedValueOnce(new Error('Could not confirm the link'))
    .mockImplementation(async (_, { signedAt }) => ({ check: { status: 'signed', signedAt } }));
  const desk = deskForm({ id: 'player', name: 'River Test' });
  await desk.completeWaiver();
  expect(desk.state.submitted).toBe(false);
  await desk.completeWaiver();
  expect(desk.state.submitted).toBe(true);
  expect(push).toHaveBeenCalledTimes(1);
  expect(set).toHaveBeenCalledTimes(1);
  expect(membershipWaiverRequest.mock.calls[0][1]).toEqual({
    action: 'link', memberId: 'player', ref: 'waiver-key', dob: '2006-01-01', signedAt: expect.any(Number),
  });
  expect(membershipWaiverRequest.mock.calls[1][1]).toEqual(membershipWaiverRequest.mock.calls[0][1]);
});

test('a selected guardian cannot receive the waiver for a different participant', async () => {
  const desk = deskForm({ id: 'guardian', name: 'Another Person' });
  await desk.completeWaiver();
  expect(desk.state.errorWaiver).toMatch(/must match the selected member/);
  expect(push).not.toHaveBeenCalled();
  expect(membershipWaiverRequest).not.toHaveBeenCalled();
});

test('a walk-on waiver at the same desk never binds to the signed-in staff member', async () => {
  push.mockReturnValue({ key: 'walk-on-waiver' });
  set.mockResolvedValue();
  const desk = deskForm(null);
  await desk.completeWaiver();
  expect(desk.state.submitted).toBe(true);
  expect(membershipWaiverRequest).not.toHaveBeenCalled();
});
