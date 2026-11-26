import { requestStaffFieldTool } from '../../../constants/fieldStaffApi';
import { verifyRentalWaivers } from './rentalWaiverProof';

jest.mock('../../../constants/fieldStaffApi', () => ({requestStaffFieldTool: jest.fn()}));

test('sends exact renter identities in batches and never forwards a name, deposit or waiver signature', async () => {
    const ref = 'party-waiver-fixture', date = '2026-11-26', guest = 'guest:' + 'a'.repeat(64);
    const groupId = '10000000-0000-4000-a000-000000000001', entryId = '10000000-0000-4000-a000-000000000002';
    const signed = {status:'signed',ref,signedAt:Date.now()-10000,expiresAt:Date.now()+10000};
    requestStaffFieldTool.mockResolvedValueOnce({proofs:[signed,{status:'missing'},signed,signed]}).mockRejectedValueOnce(new Error('Offline'));
    const rows = [{name:'Same name',ref,isDigital:true}, {name:'Same name',ref:'legacy-filename',isMember:false},
        {ref:'FixtureMemberId',isMember:true}, {ref:guest,date,isMember:false}, {groupId,groupEntryId:entryId,date},
        {ref:'AnotherFixture',isMember:true}, {groupId:'bad-id',groupEntryId:'bad-id',date}];
    const result = await verifyRentalWaivers({},'staff',rows);
    expect(result.map(row=>row.status)).toEqual(['signed','missing','missing','signed','signed','unavailable','missing']);
    expect(requestStaffFieldTool).toHaveBeenNthCalledWith(1,{},'staff','/api/rental-waivers',{method:'POST',body:{renters:[
        {kind:'waiver',ref},{kind:'member',ref:'FixtureMemberId'},{kind:'visit',ref:guest,date},{kind:'group',groupId,entryId,date},
    ]}});
});
