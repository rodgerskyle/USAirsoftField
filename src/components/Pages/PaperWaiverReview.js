import React, { useState } from 'react';
import { Alert, Button, Form, Modal } from 'react-bootstrap';
import { getDownloadURL, getMetadata } from 'firebase/storage';
import { requestStaffFieldTool } from '../constants/fieldStaffApi';

export default function PaperWaiverReview({ firebase, uid, waiver }) {
    const [open, setOpen] = useState(false);
    const [file, setFile] = useState(null);
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [signedDate, setSignedDate] = useState('');
    const [viewed, setViewed] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    async function review() {
        setName(waiver.name);
        setDob('');
        setSignedDate('');
        setFile(null);
        setViewed(false);
        setConfirmed(false);
        setError('');
        setOpen(true);
        setBusy(true);
        try {
            const [url, metadata] = await Promise.all([getDownloadURL(waiver.ref), getMetadata(waiver.ref)]);
            setFile({ url, generation: metadata.generation });
        } catch {
            setError('The scanned waiver could not be opened.');
        } finally { setBusy(false); }
    }

    async function save(event) {
        event.preventDefault();
        if (!confirmed || !file || !viewed || busy) return;
        setBusy(true);
        setError('');
        try {
            await requestStaffFieldTool(firebase, uid, '/api/waivers/review-paper', {
                method: 'POST', body: { objectName: waiver.ref.fullPath, generation: file.generation, name, dob, signedDate, confirmed },
            });
            setSaved(true);
            setOpen(false);
        } catch (failure) {
            setError(failure.status ? failure.message : 'The review could not be saved. Try again.');
        } finally { setBusy(false); }
    }

    return <>
        <Button size="sm" variant="outline-primary" onClick={review}>{saved ? 'Reviewed for check-in' : 'Review for check-in'}</Button>
        <Modal show={open} onHide={() => { if (!busy) setOpen(false); }} centered>
            <Form onSubmit={save}>
                <Modal.Header closeButton><Modal.Title>Review scanned waiver</Modal.Title></Modal.Header>
                <Modal.Body>
                    {file && <p><a href={file.url} target="_blank" rel="noreferrer" onClick={() => setViewed(true)}>Open scanned PDF</a></p>}
                    {busy && <p role="status">Working…</p>}
                    {!file && error && <Alert variant="danger">{error}</Alert>}
                    {file && <>
                        <Form.Label>Participant name as signed
                            <Form.Control required value={name} maxLength={120} onChange={e => setName(e.target.value)} />
                        </Form.Label>
                        <Form.Label>Participant date of birth
                            <Form.Control required type="date" value={dob} onChange={e => setDob(e.target.value)} />
                        </Form.Label>
                        <Form.Label>Date signed on paper
                            <Form.Control required type="date" value={signedDate} onChange={e => setSignedDate(e.target.value)} />
                        </Form.Label>
                        <Form.Check type="checkbox" id={'review-confirm-' + waiver.ref.name}
                            label="I checked the participant’s details and signature on the scan, including the parent or guardian signature for a minor."
                            checked={confirmed} disabled={!viewed} onChange={e => setConfirmed(e.target.checked)} />
                        {error && <Alert variant="danger">{error}</Alert>}
                    </>}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" type="button" disabled={busy} onClick={() => setOpen(false)}>Close</Button>
                    <Button type="submit" disabled={busy || !confirmed || !file}>Confirm for check-in</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    </>;
}
