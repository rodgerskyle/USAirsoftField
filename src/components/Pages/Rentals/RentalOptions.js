import React, { useState, useEffect } from 'react';
import { withFirebase } from '../../Firebase';
import * as ROLES from '../../constants/roles';
import { withAuthorization } from '../../session';
import { runTransaction } from 'firebase/database';
import { clearRepair, heldCount } from './utils/rentalGear';
import { rentalRows } from './utils/openRental';
import '../FrontDeskForms.css';

const RentalOptions = (props) => {
    const { firebase, rentalOptions } = props;
    const [localOptions, setLocalOptions] = useState(rentalRows(rentalOptions));
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [authUser, setAuthUser] = useState(null);

    useEffect(() => {
        const authListener = firebase.onAuthUserListener(
            (user) => setAuthUser(user),
            () => setAuthUser(null)
        );

        return () => {
            authListener();
        };
    }, [firebase]);

    useEffect(() => {
        setLocalOptions(rentalRows(rentalOptions));
    }, [rentalOptions]);

    const handleMaxChange = (index, value) => {
        setSuccess(null);
        setError(null);
        setLocalOptions(options => options.map((option, i) =>
            i === index ? { ...option, max: value === '' ? '' : Number(value) } : option
        ));
    };

    const handleSubmit = async event => {
        event.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            for (let option of localOptions) {
                if (option.stock > option.max) {
                    setError(`The maximum for ${option.value} cannot be less than current stock.`);
                    return;
                }
            }
            const changes = localOptions.filter(option =>
                rentalRows(rentalOptions).some(original => original.value === option.value && Number(original.max) !== Number(option.max)));
            if (changes.length) {
                const result = await runTransaction(firebase.rentalOptions(), current => {
                    if (current === null) return null;
                    const next = Array.isArray(current) ? [...current] : { ...current };
                    for (const change of changes) {
                        const matches = Object.entries(current).filter(([, option]) => option?.value === change.value);
                        if (matches.length !== 1) throw new Error('Inventory changed. Review the current options.');
                        const [key, row] = matches[0];
                        const previous = rentalRows(rentalOptions).find(option => option.value === row.value);
                        const max = Number(change.max);
                        if (Number(previous.max) !== Number(row.max) || !Number.isSafeInteger(max) || max < Number(row.stock || 0)) {
                            throw new Error('Inventory changed. Review the current stock and maximum.');
                        }
                        next[key] = { ...row, max };
                    }
                    return next;
                }, { applyLocally: false });
                if (!result.committed || !result.snapshot.exists()) throw new Error('Inventory unavailable.');
            }
            setSuccess("Rental inventory successfully updated.");
        } catch (err) {
            setError("Failed to update rental inventory.");
        }
    };

    const handleReset = async () => {
        setError(null);
        setSuccess(null);
        try {
            const result = await runTransaction(firebase.rentals(), desk => {
                if (desk === null) return null;
                const options = Array.isArray(desk.options) ? [...desk.options] : { ...desk.options };
                for (const [key, option] of Object.entries(options)) {
                    if (option) options[key] = { ...option, stock: heldCount(desk.group, option) };
                }
                return { ...desk, options };
            }, { applyLocally: false });
            if (!result.committed || !result.snapshot.exists()) throw new Error('Inventory unavailable.');
            setSuccess("Rental inventory successfully reset.");
        } catch (err) {
            setError("Failed to reset rental inventory.");
        }
    };

    return (
        <section className="desk-inventory" aria-labelledby="rental-inventory-title">
            <h3 id="rental-inventory-title">Rental inventory</h3>
            {localOptions.some(option => Object.keys(option.repairHolds || {}).length > 0) && <section aria-label="Items awaiting inspection">
                <h4>Items awaiting inspection</h4>
                <ul>{localOptions.flatMap(option => Object.entries(option.repairHolds || {}).map(([id, item]) => <li key={id}>
                    {option.label} #{item.number}{item.reason && ' · ' + item.reason} <button type="button" className="btn btn-outline-primary" onClick={async () => {
                        setError(null); setSuccess(null);
                        try {
                            await clearRepair(firebase, option.value, id);
                            setSuccess(option.label + ' #' + item.number + ' released for rental.');
                        } catch (reason) {
                            setError(reason.message || 'Could not release this equipment.');
                        }
                    }}>Release after inspection</button></li>))}</ul>
            </section>}
            {localOptions?.length ? (
                <form onSubmit={handleSubmit}>
                    <table>
                        <thead>
                            <tr><th scope="col">Equipment</th><th scope="col">In use</th><th scope="col">Maximum</th></tr>
                        </thead>
                        <tbody>
                            {localOptions.map((rental, index) => (
                                <tr key={rental.value || index}>
                                    <th scope="row">{rental.label}</th>
                                    <td>{rental.stock}</td>
                                    <td>
                                        <input className="form-control" type="number" min={Math.max(0, Number(rental.stock) || 0)} step="1"
                                            inputMode="numeric" required aria-label={`Maximum for ${rental.label}`}
                                            value={rental.max ?? ''} onChange={event => handleMaxChange(index, event.target.value)} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="desk-inventory-actions">
                        <button type="submit" className="btn btn-primary">Save changes</button>
                        {authUser?.roles[ROLES.SUPER] && (
                            <button type="button" onClick={handleReset} className="btn btn-outline-danger"
                                disabled={localOptions.some(option => option.max === '' || !Number.isInteger(Number(option.max)) || Number(option.max) < 0)}>
                                Recount reserved equipment
                            </button>
                        )}
                    </div>
                    {error && <p role="alert" className="alert alert-danger">{error}</p>}
                    {success && <p role="status" className="alert alert-success">{success}</p>}
                </form>
            ) : <p role="status">No rental equipment is listed.</p>}
        </section>
    );
};

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(RentalOptions));
