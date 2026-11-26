import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { runTransaction } from 'firebase/database';
import { verifyRentalWaivers } from './utils/rentalWaiverProof';
import RentalIntakeEditor from './RentalIntakeEditor';

jest.mock('firebase/database',()=>({runTransaction:jest.fn()}));
jest.mock('./utils/rentalWaiverProof',()=>({verifyRentalWaivers:jest.fn(),searchRentalWaivers:jest.fn()}));
jest.mock('../StaffWaiverPicker',()=>({onChoose})=><div>
    <button type="button" onClick={()=>onChoose({ref:'new-waiver',name:'Lee Smith'})}>Choose renewed waiver</button>
    <button type="button" onClick={()=>onChoose({ref:'stranger',name:'Pat Miller'})}>Choose another person</button>
</div>);

test('a named standalone digital renter can link their renewal on the same active form and keep the original reserved unit',async()=>{
    const now=Date.now();
    const old={status:'signed',ref:'old-waiver',signedAt:now-900000,expiresAt:now-50};
    const participant={name:'Lee',waiverName:'Lee Smith',ref:'old-waiver',isDigital:true,waiverProof:old,
        requestedItems:[{value:'mask',quantity:1}],rentals:[{id:'mask-3',value:'mask',label:'Mask',checked:false,number:''}]};
    let current={key:'4',name:'Private event',createRequestId:'fixture',size:1,participants:[participant],available:[],
        transaction:'T123',armoryVersion:1,complete:true,activatedAt:now-90000};
    // RTDB omits empty arrays in the stored record. React's editor can receive a normalized array.
    const firebase={rentalGroup:()=> 'rental-4'};
    runTransaction.mockImplementation(async (_,apply)=>{
        const next=apply(current);
        if(next) current=next;
        return {committed:!!next,snapshot:{val:()=>current}};
    });
    verifyRentalWaivers.mockImplementation(async (_firebase,_uid,people)=>[{
        status:'signed',ref:people[0].waiverRef,signedAt:now-100,expiresAt:now+86400000
    }]);
    render(<RentalIntakeEditor firebase={firebase} uid="staff" form={current}/>);
    fireEvent.click(screen.getByText('Match a signed waiver for Lee'));
    fireEvent.click(screen.getByRole('button',{name:'Choose another person'}));
    expect(screen.getByRole('status')).toHaveTextContent('Select the renewed signed waiver for Lee Smith.');
    expect(runTransaction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Choose renewed waiver'}));
    fireEvent.click(screen.getByRole('button',{name:'Save rental details'}));
    await waitFor(()=>expect(current.participants[0].waiverProof.ref).toBe('new-waiver'));
    expect(current.participants[0].ref).toBe('old-waiver');
    expect(current.participants[0].rentals).toEqual(participant.rentals);
    expect(current.activatedAt).toBe(now-90000);
});
