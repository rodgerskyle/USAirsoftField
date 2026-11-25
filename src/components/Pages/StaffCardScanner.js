import React, { useCallback, useEffect, useRef, useState } from 'react';
import { isLegacyCardName, readScannedMemberCard, readScannedPlayerProfile } from '../constants/scoreCards';
import { readPlayerIdBarcode } from '../constants/staffCode128Reader';
import { cameraFrameReader, openCardCamera, playCardCamera } from '../constants/cardCameraFrames';
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

export function createReader(verifyLegacyCards = false, parseEquipmentTag) {
    return cameraFrameReader({
        parse: parseEquipmentTag || ((raw, format) => scannedValue(raw, format, verifyLegacyCards)),
        readBarcode: image => readPlayerIdBarcode(image, parseEquipmentTag || (verifyLegacyCards ? isLegacyCardName : undefined)),
        loadQR: loadQRReader,
    });
}

export function StaffCardScanner({ disabled = false, onScan, verifyLegacyCards = false, manualFallback, parseEquipmentTag }) {
    const video = useRef(null);
    const camera = useRef(null);
    const callback = useRef(onScan);
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState('');
    const subject = parseEquipmentTag ? 'an equipment tag' : 'a member card';
    callback.current = onScan;

    const release = useCallback(() => {
        const current = camera.current;
        camera.current = null;
        if (!current) return;
        clearTimeout(current.timer);
        current.removeEnded?.();
        current.stream?.getTracks().forEach(track => track.stop());
        if (video.current?.srcObject) video.current.srcObject = null;
    }, []);

    const stop = useCallback(() => {
        release();
        setOpen(false);
    }, [release]);

    useEffect(() => {
        const suspend = () => {
            if (!camera.current) return;
            stop();
            setStatus('Open the camera again to scan ' + subject + '.');
        };
        const onVisibility = () => { if (document.hidden) suspend(); };
        window.addEventListener('pagehide', suspend);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('pagehide', suspend);
            document.removeEventListener('visibilitychange', onVisibility);
            release();
        };
    }, [release, stop, subject]);
    useEffect(() => {
        if (disabled && camera.current) {
            stop();
            setStatus('');
        }
    }, [disabled, stop]);

    async function start() {
        if (disabled || camera.current) return;
        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus('Camera access is unavailable. ' + (manualFallback || 'Use a connected scanner or type the player ID.'));
            return;
        }
        const current = {};
        camera.current = current;
        setOpen(true);
        setStatus('Opening the camera…');
        try {
            const stream = await openCardCamera();
            if (camera.current !== current || !video.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }
            current.stream = stream;
            const onEnd = () => {
                if (camera.current === current) {
                    stop();
                    setStatus('Camera stopped. Open it again to scan ' + subject + '.');
                }
            };
            const track = stream.getVideoTracks?.()[0];
            track?.addEventListener('ended', onEnd, { once: true });
            current.removeEnded = () => track?.removeEventListener('ended', onEnd);
            const read = createReader(verifyLegacyCards, parseEquipmentTag);
            await playCardCamera(video.current, stream);
            if (camera.current !== current) return;
            setStatus('Center the whole QR code or barcode in the frame. Move closer until the bars are sharp.');

            async function scanFrame() {
                if (camera.current !== current || !video.current) return;
                let value;
                try { value = await read(video.current); } catch { /* Read the next frame. */ }
                if (camera.current !== current) return;
                if (value) {
                    stop();
                    setStatus(parseEquipmentTag ? 'Equipment tag scanned.' : 'Card scanned.');
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
                ? (manualFallback ? 'Allow camera access. ' + manualFallback : 'Allow camera access or use a connected scanner.')
                : 'The camera could not open. ' + (manualFallback || 'Use a connected scanner or type the player ID.'));
        }
    }

    return (
        <div className="field-staff-scanner">
            <button type="button" className="btn btn-outline-secondary" disabled={disabled} onClick={open ? () => {
                stop();
                setStatus('');
            } : start}>{open ? 'Close camera' : 'Scan with camera'}</button>
            <video ref={video} className="field-staff-scanner__video" hidden={!open} muted playsInline aria-label={parseEquipmentTag ? 'Scan an equipment tag' : 'Scan a USAW member card'} />
            <p role="status" className="field-staff-scanner__status" hidden={!status}>{status}</p>
        </div>
    );
}
