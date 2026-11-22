import React, { useState, useEffect } from 'react';
import { withFirebase } from '../../Firebase';
import * as ROLES from '../../constants/roles';
import { withAuthorization } from '../../session';
import { set } from 'firebase/database';
import '../FrontDeskForms.css';

const RentalOptions = (props) => {
    const { firebase, rentalOptions } = props;
    const [localOptions, setLocalOptions] = useState(rentalOptions);
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
        setLocalOptions(rentalOptions);
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
            await set(firebase.rentalOptions(), localOptions);
            setSuccess("Rental inventory successfully updated.");
        } catch (err) {
            setError("Failed to update rental inventory.");
        }
    };

    const handleReset = async () => {
        setError(null);
        setSuccess(null);
        try {
            const resetOptions = localOptions.map(option => ({
                ...option,
                stock: 0
            }));
            await set(firebase.rentalOptions(), resetOptions);
            setLocalOptions(resetOptions);
            setSuccess("Rental inventory successfully reset.");
        } catch (err) {
            setError("Failed to reset rental inventory.");
        }
    };

    return (
        <section className="desk-inventory" aria-labelledby="rental-inventory-title">
            <h3 id="rental-inventory-title">Rental inventory</h3>
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
                                Reset in-use counts
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
