import React, { useRef, useState } from 'react';
import { readRentalCatalogBackup, restoreRentalCatalogBackup } from './utils/rentalCatalogBackup';

export function downloadInventoryBackup(options) {
    const day = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify({ options }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'USAW-rental-inventory-' + day + '.json';
    document.body.appendChild(link);
    try {
        link.click();
    } finally {
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}

export default function RentalBackupRestore({ firebase, onRestored }) {
    const [backup, setBackup] = useState(null);
    const [reading, setReading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const selection = useRef(0);
    const savingNow = useRef(false);

    async function chooseFile(event) {
        const file = event.target.files?.[0];
        const version = ++selection.current;
        setBackup(null);
        setError('');
        setReading(!!file);
        if (!file) return;
        try {
            const result = await readRentalCatalogBackup(file);
            if (version === selection.current) setBackup(result);
        } catch (failure) {
            if (version === selection.current) setError(failure.message || 'Could not read that inventory backup.');
        } finally {
            if (version === selection.current) setReading(false);
        }
    }

    async function restore() {
        if (!backup || savingNow.current) return;
        savingNow.current = true;
        setSaving(true);
        setError('');
        try {
            const count = await restoreRentalCatalogBackup(firebase, backup);
            onRestored(count);
        } catch (failure) {
            setError(failure.message || 'Inventory could not be restored. Check the connection and try again.');
        } finally {
            savingNow.current = false;
            setSaving(false);
        }
    }

    return <section className="desk-catalog-backup" aria-labelledby="restore-inventory-title">
        <h4 id="restore-inventory-title">Restore inventory from a backup</h4>
        <p>Choose a file saved before the inventory disappeared. Your device reads the file locally and restores only the rental equipment list.</p>
        <label htmlFor="inventory-backup-file">Rental inventory or Firebase backup (.json or .gz)</label>
        <input id="inventory-backup-file" className="form-control" type="file" accept=".json,.gz,.gzip,application/json,application/gzip"
            disabled={saving} onChange={chooseFile} />
        {reading && <p role="status">Reading backup…</p>}
        {backup && <div>
            <p><strong>{backup.count} equipment {backup.count === 1 ? 'type' : 'types'}</strong> · {backup.repairHoldCount} inspection holds in the backup</p>
            <details><summary>Review equipment in this backup</summary>
                <ul>{Object.values(backup.options).filter(Boolean).map(option => <li key={String(option.value)}>
                    {option.label || String(option.value)} · {option.max ?? 'Unknown'} maximum · {option.stock ?? 0} in use in backup
                </li>)}</ul>
            </details>
            <p>Check gear issued, returned, or set aside for repairs since this backup before handing out rentals.</p>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={restore}>
                {saving ? 'Restoring inventory…' : 'Restore this inventory'}
            </button>
        </div>}
        {error && <p role="alert" className="alert alert-danger">{error}</p>}
    </section>;
}
