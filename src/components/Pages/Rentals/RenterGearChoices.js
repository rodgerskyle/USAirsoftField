import React from 'react';
import { rentalRows } from './utils/openRental';

export function selectedGear(person, rows) {
    if (person.requestedItems) return rentalRows(person.requestedItems);
    const counts = new Map();
    rentalRows(person.rentals).forEach(unit => counts.set(unit.value,(counts.get(unit.value)||0)+1));
    return Array.from(counts,([value,quantity])=>({value,quantity})).filter(row=>rows.some(option=>option.value===row.value));
}

export function changeGear(choices, value, input) {
    const count = Number(input);
    const kept = choices.filter(row=>row.value!==value);
    return count>0 && Number.isSafeInteger(count) ? [...kept,{value,quantity:count}] : kept;
}

export default function RenterGearChoices({ people, options, onChange, disabled }) {
    if (!people.length || !options.length) return null;
    return <section className="rental-roster-review" aria-label="Equipment requests by renter">
        <h3>Equipment for each renter</h3>
        {people.map((person,i)=><fieldset key={person.groupEntryId || person.ref || person.renterKey || i} disabled={disabled}>
            <legend>{person.name || 'Renter '+(i+1)}</legend>
            {options.map(option=>{
                const chosen=selectedGear(person,options).find(row=>row.value===option.value)?.quantity || 0;
                return <label className="rental-request-quantity" key={option.value}>{option.label || option.value}
                    <input type="number" inputMode="numeric" min="0" max={option.quantity} step="1" value={chosen || ''}
                        placeholder="0" aria-label={'Quantity of '+(option.label || option.value)+' for '+(person.name || 'renter '+(i+1))}
                        onChange={event=>onChange(i,changeGear(selectedGear(person,options),option.value,event.target.value))} />
                </label>;
            })}
        </fieldset>)}
    </section>;
}
