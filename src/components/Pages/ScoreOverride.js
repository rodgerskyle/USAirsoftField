import React, { useState } from 'react';
import { Button } from 'react-bootstrap';

export function extraResultsLabel(quantity, outcome) {
    const noun = outcome === 'win' ? 'win' : 'loss';
    return quantity + ' extra ' + (quantity === 1 ? noun : outcome === 'win' ? 'wins' : 'losses');
}

export default function ScoreOverride({ player, roundLabel, disabled, onConfirm }) {
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState('1');
    const [outcome, setOutcome] = useState(null);
    const quantity = Number(amount);
    const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 20;

    function close() {
        setOpen(false);
        setAmount('1');
        setOutcome(null);
    }

    if (!open) return <Button variant="outline-secondary" disabled={disabled} onClick={() => setOpen(true)}>
        Add extra results
    </Button>;

    return <section className="score-entry-override" aria-label="Admin score override">
        <h4>Admin score override</h4>
        <p>{player} · {roundLabel}</p>
        {outcome ? <>
            <p role="status">Add <strong>{extraResultsLabel(quantity, outcome)}</strong> to this game for {player}?</p>
            <div className="score-entry-mode">
                <Button disabled={disabled} onClick={() => {
                    close();
                    onConfirm(outcome, quantity);
                }}>Confirm {extraResultsLabel(quantity, outcome)}</Button>
                <Button disabled={disabled} variant="outline-secondary" onClick={() => setOutcome(null)}>Back</Button>
                <Button disabled={disabled} variant="outline-secondary" onClick={close}>Cancel</Button>
            </div>
        </> : <>
            <label>Number to add
                <input type="number" inputMode="numeric" className="form-control" min="1" max="20" step="1"
                    value={amount} disabled={disabled} onChange={event => setAmount(event.target.value)} />
            </label>
            <p>{valid ? 'Add up to 20 wins or losses at a time.' : 'Enter a whole number from 1 to 20.'}</p>
            <div className="score-entry-mode">
                {['win', 'loss'].map(value => <Button key={value} disabled={disabled || !valid}
                    variant="outline-primary" onClick={() => setOutcome(value)}>{value === 'win' ? 'Add wins' : 'Add losses'}</Button>)}
                <Button disabled={disabled} variant="outline-secondary" onClick={close}>Cancel</Button>
            </div>
        </>}
    </section>;
}
