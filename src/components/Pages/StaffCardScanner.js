import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isLegacyCardName, readScannedMemberCard, readScannedPlayerProfile } from '../constants/scoreCards';
import { readPlayerIdBarcode } from '../constants/staffCode128Reader';
import './StaffCardScanner.css';

const playerId = /^[A-Za-z0-9_-]{10,128}$/;
const qrToken = /^[A-Za-z0-9_-]{32}$/;
let qrDecoder;

function scannedValue(raw, format, verifyLegacyCards) {
    if (format === 'code_128') {
        const value = raw.replace(/^\]C[01]/, '');
        if (verifyLegacyCards && isLegacyCardName(value)) return { barcodeValue: value };
        return playerId.test(value) ? { playerId: value } : null;
    }
    if (format !== 'qr_code') return null;
    if (qrToken.test(raw)) return { cardToken: raw };
    try {
        const cardToken = readScannedMemberCard(raw);
        if (cardToken) return { cardToken };
        const profileId = verifyLegacyCards && readScannedPlayerProfile(raw);
        return profileId && playerId.test(profileId) ? { playerId: profileId } : null;
    } catch {
        return null;
    }
}

function loadQRReader() {
    if (typeof window.jsQR === 'function') return Promise.resolve(window.jsQR);
    if (!qrDecoder) {
        qrDecoder = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `${process.env.PUBLIC_URL || ''}/vendor/jsqr-1.4.0.js`;
            const fail = () => {
                clearTimeout(timeout);
                script.remove();
                reject(new Error('QR reader unavailable'));
            };
            const timeout = setTimeout(fail, 6000);
            script.onload = () => {
                clearTimeout(timeout);
                if (typeof window.jsQR === 'function') resolve(window.jsQR);
                else fail();
            };
            script.onerror = fail;
            document.head.appendChild(script);
        }).catch(error => {
            qrDecoder = null;
            throw error;
        });
    }
    return qrDecoder;
}

async function createReader(verifyLegacyCards) {
    let detector;
    try {
        const supported = await window.BarcodeDetector?.getSupportedFormats();
        const formats = ['qr_code', 'code_128'].filter(format => supported?.includes(format));
        if (formats.length) detector = new window.BarcodeDetector({ formats });
    } catch { /* Use the software readers when native detection is unavailable. */ }
    // A slow QR asset must never delay reading a physical Code 128 card.
    let decodeQr;
    loadQRReader().then(reader => { decodeQr = reader; }).catch(() => {});
    const canvas = document.createElement('canvas');

    return async video => {
        if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;
        if (detector) {
            try {
                for (const { rawValue, format } of await detector.detect(video)) {
                    const value = scannedValue(rawValue, format, verifyLegacyCards);
                    if (value) return value;
                }
            } catch { /* A browser decoder can skip an unreadable frame. */ }
        }
        const scale = Math.min(1, 1200 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const frame = canvas.getContext('2d', { willReadFrequently: true });
        if (!frame) return null;
        frame.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = frame.getImageData(0, 0, canvas.width, canvas.height);
        const code = readPlayerIdBarcode(image, verifyLegacyCards ? isLegacyCardName : undefined);
        if (code) return scannedValue(code, 'code_128', verifyLegacyCards);
        const qr = decodeQr?.(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })?.data;
        return qr ? scannedValue(qr, 'qr_code', verifyLegacyCards) : null;
    };
}

export function StaffCardScanner({ disabled = false, onScan, verifyLegacyCards = false }) {
    const video = useRef(null);
    const camera = useRef(null);
    const callback = useRef(onScan);
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState('');
    callback.current = onScan;

    const release = useCallback(() => {
        const current = camera.current;
        camera.current = null;
        if (!current) return;
        clearTimeout(current.timer);
        current.stream?.getTracks().forEach(track => track.stop());
        if (video.current?.srcObject) video.current.srcObject = null;
    }, []);

    const stop = useCallback(() => {
        release();
        setOpen(false);
    }, [release]);

    useEffect(() => release, [release]);
    useEffect(() => {
        if (disabled && camera.current) {
            stop();
            setStatus('');
        }
    }, [disabled, stop]);

    async function start() {
        if (disabled || camera.current) return;
        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus('Camera access is unavailable. Use a connected scanner or type the player ID.');
            return;
        }
        const current = {};
        camera.current = current;
        setOpen(true);
        setStatus('Opening the camera…');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
            });
            if (camera.current !== current || !video.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            current.stream = stream;
            video.current.srcObject = stream;
            await video.current.play();
            const read = await createReader(verifyLegacyCards);
            if (camera.current !== current) return;
            setStatus('Hold a USAW QR code or Code 128 barcode steady in the frame.');

            async function scanFrame() {
                if (camera.current !== current || !video.current) return;
                let value;
                try { value = await read(video.current); } catch { /* Read the next frame. */ }
                if (camera.current !== current) return;
                if (value) {
                    stop();
                    setStatus('Card scanned.');
                    callback.current?.(value);
                    return;
                }
                current.timer = setTimeout(scanFrame, 180);
            }
            void scanFrame();
        } catch (error) {
            if (camera.current !== current) return;
            stop();
            setStatus(error?.name === 'NotAllowedError'
                ? 'Allow camera access or use a connected scanner.'
                : 'The camera could not open. Use a connected scanner or type the player ID.');
        }
    }

    return (
        <div className="field-staff-scanner">
            <button type="button" className="btn btn-outline-secondary" disabled={disabled} onClick={open ? () => {
                stop();
                setStatus('');
            } : start}>{open ? 'Close camera' : 'Scan with camera'}</button>
            <video ref={video} className="field-staff-scanner__video" hidden={!open} muted playsInline aria-label="Scan a USAW member card" />
            <p role="status" className="field-staff-scanner__status" hidden={!status}>{status}</p>
        </div>
    );
}
