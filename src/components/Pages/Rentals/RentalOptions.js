import React, { useState, useEffect } from 'react';
import { withFirebase } from '../../Firebase';
import * as ROLES from '../../constants/roles';
import { withAuthorization } from '../../session';
import { runTransaction } from 'firebase/database';
import { availableRentalUnits, clearRepair, heldCount, rentalInventoryCount } from './utils/rentalGear';
import { rentalRows } from './utils/openRental';
import RentalBackupRestore, { downloadInventoryBackup } from './RentalBackupRestore';
import RentalCatalogSetup from './RentalCatalogSetup';
import '../FrontDeskForms.css';

const RentalOptions = (props) => {
    const { firebase, rentalOptions } = props;
    const savedByValue = new Map(rentalRows(rentalOptions).map(option => [option.value, option]));
    const [localOptions, setLocalOptions] = useState(rentalRows(rentalOptions));
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [authUser, setAuthUser] = useState(null);
    const canRestore = !!ROLES.officialAccountRoles(authUser?.roles)[ROLES.ADMIN] || authUser?.roles?.[ROLES.SUPER] === true;
    const catalogEmpty = rentalOptions == null || (typeof rentalOptions === 'object' && Object.keys(rentalOptions).length === 0);
    const onRestored = count => {
        setError(null);
        setSuccess('Rental inventory saved. ' + count + ' equipment ' + (count === 1 ? 'type is' : 'types are') + ' listed.');
    };

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
            const changes = localOptions.filter(option => option.max !== savedByValue.get(option.value)?.max);
            for (const option of changes) {
                const max = rentalInventoryCount(option.max);
                const inUse = rentalInventoryCount(option.stock ?? 0);
                if (inUse === null) {
                    setError(`Recount reserved equipment before changing the maximum for ${option.label}.`);
                    return;
                }
                if (max === null || max < inUse) {
                    setError(`Enter a whole-number maximum of at least ${inUse} for ${option.label}.`);
                    return;
                }
            }
            if (changes.length) {
                const result = await runTransaction(firebase.rentalOptions(), current => {
                    if (current === null) return null;
                    const next = Array.isArray(current) ? [...current] : { ...current };
                    for (const change of changes) {
                        const matches = Object.entries(current).filter(([, option]) => option?.value === change.value);
                        if (matches.length !== 1) throw new Error('Inventory changed. Review the current options.');
                        const [key, row] = matches[0];
                        const previous = savedByValue.get(row.value);
                        const max = rentalInventoryCount(change.max);
                        const inUse = rentalInventoryCount(row.stock ?? 0);
                        if (!previous || previous.max !== row.max || max === null || inUse === null || max < inUse) {
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
                if (!rentalRows(desk.options).length) return undefined;
                const options = Array.isArray(desk.options) ? [...desk.options] : { ...desk.options };
                for (const [key, option] of Object.entries(options)) {
                    if (option) options[key] = { ...option, stock: heldCount(desk.group, option) };
                }
                return { ...desk, options };
            }, { applyLocally: false });
            if (!result.committed || !result.snapshot.exists()) throw new Error('Inventory unavailable.');
            setSuccess("Inventory recounted from open rentals and items awaiting inspection.");
        } catch (err) {
            setError("Failed to recount rental inventory.");
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
                <form onSubmit={handleSubmit} noValidate>
                    <table>
                        <thead>
                            <tr><th scope="col">Equipment</th><th scope="col">In use</th><th scope="col">Available</th><th scope="col">Maximum</th></tr>
                        </thead>
                        <tbody>
                            {localOptions.map((rental, index) => {
                                const saved = savedByValue.get(rental.value);
                                const inUse = rentalInventoryCount(saved?.stock ?? 0);
                                const configured = rentalInventoryCount(saved?.max) !== null;
                                let available = availableRentalUnits(saved);
                                if (inUse === null) available = 'Recount needed';
                                if (!configured) available = 'Set maximum';
                                return (
                                    <tr key={rental.value || index}>
                                        <th scope="row">{rental.label}</th>
                                        <td>{inUse ?? 'Recount needed'}</td>
                                        <td>{available}</td>
                                        <td>
                                            <input className="form-control" type="number" min={inUse ?? 0} step="1"
                                                inputMode="numeric" required aria-label={`Maximum for ${rental.label}`}
                                                value={rental.max ?? ''} onChange={event => handleMaxChange(index, event.target.value)} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className="desk-inventory-actions">
                        <button type="submit" className="btn btn-primary">Save changes</button>
                        {canRestore && <button type="button" className="btn btn-outline-primary" onClick={() => {
                            try {
                                downloadInventoryBackup(rentalOptions);
                            } catch {
                                setError('Could not download the inventory backup on this device.');
                            }
                        }}>Download inventory backup</button>}
                        {authUser?.roles[ROLES.SUPER] && (
                            <button type="button" onClick={handleReset} className="btn btn-outline-danger">
                                Recount reserved equipment
                            </button>
                        )}
                    </div>
                    {error && <p role="alert" className="alert alert-danger">{error}</p>}
                    {success && <p role="status" className="alert alert-success">{success}</p>}
                </form>
            ) : catalogEmpty ? <>
                <p role="status">No rental equipment is listed.</p>
                {canRestore ? <>
                    <RentalBackupRestore firebase={firebase} onRestored={onRestored} />
                    <RentalCatalogSetup firebase={firebase} rentalForms={props.rentalForms} onRestored={onRestored} />
                </> : authUser && <p>An administrator can restore the equipment list from this screen.</p>}
            </> : <p role="alert">The saved inventory has an unrecognized format. Review the existing catalog before restoring equipment.</p>}
        </section>
    );
};

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(RentalOptions));
