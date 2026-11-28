import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import RentalCatalogSetup from './RentalCatalogSetup';
import { rentalCatalogHistory, restoreRentalCatalog } from './utils/restoreRentalCatalog';

jest.mock('./utils/historicalRentalCatalog', () => ({
    historicalRentalCatalog: [
        { id:'original-mask', value:'mask', label:'Mask', cost:30 },
        { id:'original-vest', value:'vest', label:'Vest', cost:45 },
    ],
}));
jest.mock('./utils/restoreRentalCatalog', () => ({
    rentalCatalogHistory: jest.fn(),
    restoreRentalCatalog: jest.fn(),
}));

const firebase = {};
const type = (name, value) => fireEvent.change(screen.getByLabelText(name), {target:{value}});
const click = name => fireEvent.click(screen.getByRole('button',{name}));

function open(onRestored) {
    const view = render(<RentalCatalogSetup firebase={firebase} rentalForms={[]} onRestored={onRestored} />);
    click('Set up inventory manually');
    return view;
}

beforeEach(() => {
    jest.resetAllMocks();
    rentalCatalogHistory.mockReturnValue([]);
});

test('requires a deliberate count, reviews the replacement value, and saves zero stock exactly once', async () => {
    let finish;
    const onRestored = jest.fn();
    restoreRentalCatalog.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    open(onRestored);
    expect(screen.getByLabelText('Maximum units for Mask')).toHaveValue(null);
    click('Review inventory');
    expect(screen.getByRole('alert')).toHaveTextContent('at least one');
    type('Maximum units for Mask','0');
    click('Review inventory');
    expect(screen.getByRole('list')).toHaveTextContent('0 maximum · $30.00 replacement value');
    expect(screen.getByRole('list')).not.toHaveTextContent('Vest');
    expect(restoreRentalCatalog).not.toHaveBeenCalled();
    click('Save rental inventory');
    expect(screen.getByRole('button',{name:'Saving inventory…'})).toBeDisabled();
    click('Saving inventory…');
    expect(restoreRentalCatalog).toHaveBeenCalledTimes(1);
    expect(restoreRentalCatalog).toHaveBeenCalledWith(firebase, [{id:'original-mask',value:'mask',label:'Mask',cost:30,max:0}]);
    await act(async () => { finish(); });
    expect(screen.getByRole('status')).toHaveTextContent('Rental inventory saved');
    expect(onRestored).toHaveBeenCalledWith(1);
});

test('keeps selected quantities across live form updates and requires enough stock to cover reserved types', () => {
    const view=open();
    type('Maximum units for Vest','8');
    rentalCatalogHistory.mockReturnValue([{value:'previous-mask',label:'Mask',cost:35,stock:2,required:true}]);
    view.rerender(<RentalCatalogSetup firebase={firebase} rentalForms={[{key:'prior'}]} />);
    expect(screen.getByLabelText('Maximum units for Vest')).toHaveValue(8);
    expect(screen.getAllByLabelText('Maximum units for Mask')).toHaveLength(1);
    expect(screen.getByLabelText('Replacement value for Mask')).toHaveValue(35);
    type('Maximum units for Mask','1');
    click('Review inventory');
    expect(screen.getByRole('alert')).toHaveTextContent('at least 2');
    type('Maximum units for Mask','3');
    click('Review inventory');
    expect(screen.getByRole('list')).toHaveTextContent('3 maximum · $35.00 replacement value');
    expect(restoreRentalCatalog).not.toHaveBeenCalled();
});

test('retains a custom item after a failed save and allows staff to correct it', async () => {
    restoreRentalCatalog.mockRejectedValueOnce(new Error('Another desk changed the inventory.'));
    open();
    click('Add custom equipment');
    type('Equipment name','Radio');
    type('Maximum units for Radio','3');
    click('Review inventory');
    expect(screen.getByRole('alert')).toHaveTextContent('replacement value');
    type('Replacement value for Radio', '19.95');
    click('Review inventory');
    click('Save rental inventory');
    expect(await screen.findByRole('alert')).toHaveTextContent('Another desk changed');
    expect(restoreRentalCatalog).toHaveBeenCalledWith(firebase, [expect.objectContaining({label:'Radio',cost:19.95,max:3})]);
    click('Edit quantities');
    expect(screen.getByLabelText('Maximum units for Radio')).toHaveValue(3);
    expect(screen.getByLabelText('Replacement value for Radio')).toHaveValue(19.95);
    click('Remove Radio');
    expect(screen.queryByLabelText('Equipment name')).toBeNull();
});
