import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { isLegacyCardName } from '../constants/scoreCards';
import { readPlayerIdBarcode } from '../constants/staffCode128Reader';
import { createReader, StaffCardScanner } from './StaffCardScanner';

const originalMedia = Object.getOwnPropertyDescriptor(window.navigator, 'mediaDevices');
const originalDetector = Object.getOwnPropertyDescriptor(window, 'BarcodeDetector');

function installCamera(getUserMedia) {
    Object.defineProperty(window.navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
}

afterEach(() => {
    for (const [object, key, previous] of [
        [window.navigator, 'mediaDevices', originalMedia],
        [window, 'BarcodeDetector', originalDetector],
    ]) {
        if (previous) Object.defineProperty(object, key, previous);
        else delete object[key];
    }
    jest.restoreAllMocks();
});

it.each([
    ['a case-sensitive Code 128 player ID', false, 'code_128', 'ExactCasePlayer987', { playerId: 'ExactCasePlayer987' }],
    ['a scanner-prefixed Code 128 player ID', true, 'code_128', ']C0ExactCasePlayer987', { playerId: 'ExactCasePlayer987' }],
    ['a short legacy Code 128 name', true, 'code_128', 'ab', { barcodeValue: 'ab' }],
    ['an official membership profile QR code', true, 'qr_code', 'https://www.usairsoftfield.com/profilelookup/ExactCasePlayer987', { playerId: 'ExactCasePlayer987' }],
])('passes %s and releases the camera', async (_name, verifyLegacyCards, format, rawValue, expected) => {
    const stopTrack = jest.fn();
    installCamera(jest.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }));
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const detect = jest.fn().mockResolvedValue([{ rawValue, format }]);
    Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: class {
        static async getSupportedFormats() { return ['qr_code', 'code_128']; }
        detect(video) { return detect(video); }
    } });
    const onScan = jest.fn();
    const { container } = render(<StaffCardScanner onScan={onScan} verifyLegacyCards={verifyLegacyCards} />);
    Object.defineProperties(container.querySelector('video'), {
        readyState: { value: 2 },
        videoWidth: { value: 1280 },
        videoHeight: { value: 720 },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scan with camera' }));
    await waitFor(() => expect(onScan).toHaveBeenCalledWith(expected));
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Scan with camera' })).toBeInTheDocument();
});

function legacyBarcodeFrame() {
    // Code 128 B start, a, b, checksum 95, stop.
    const bars = [...'2112141211241214211141132331112'].flatMap((modules, index) =>
        Array(5 * Number(modules)).fill(index % 2 ? 255 : 0));
    const line = [...Array(50).fill(255), ...bars, ...Array(50).fill(255)];
    const width = line.length;
    const height = 60;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let offset = 0; offset < data.length; offset += 4) {
        const gray = line[(offset / 4) % width];
        data.set([gray, gray, gray, 255], offset);
    }
    return { width, height, data };
}

it('decodes a short legacy name in software when the membership scanner opts in', () => {
    const image = legacyBarcodeFrame();
    expect(readPlayerIdBarcode(image)).toBeNull();
    expect(readPlayerIdBarcode(image, isLegacyCardName)).toBe('ab');
});

it.each(['throws', 'probe stalls', 'detection stalls', 'unavailable'])('reads physical cards in software when native detection %s', async mode => {
    const image = legacyBarcodeFrame();
    installCamera(jest.fn().mockResolvedValue({ getTracks: () => [] }));
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: mode !== 'unavailable' ? class {
        static async getSupportedFormats() { return mode === 'probe stalls' ? new Promise(() => {}) : ['qr_code', 'code_128']; }
        async detect() {
            if (mode === 'detection stalls') return new Promise(() => {});
            throw new Error('Frame unreadable');
        }
    } : undefined });
    jest.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage: jest.fn(), getImageData: () => image,
    });
    const onScan = jest.fn();
    const { container } = render(<StaffCardScanner onScan={onScan} verifyLegacyCards />);
    Object.defineProperties(container.querySelector('video'), {
        readyState: { value: 2 },
        videoWidth: { value: image.width },
        videoHeight: { value: image.height },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Scan with camera' }));
    await waitFor(() => expect(onScan).toHaveBeenCalledWith({ barcodeValue: 'ab' }));
});

it('releases a late camera stream after staff leaves the tool', async () => {
    let resolvePermission;
    const stopTrack = jest.fn();
    const pending = new Promise(resolve => { resolvePermission = resolve; });
    installCamera(jest.fn().mockReturnValue(pending));
    const { unmount } = render(<StaffCardScanner onScan={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan with camera' }));
    unmount();
    await act(async () => {
        resolvePermission({ getTracks: () => [{ stop: stopTrack }] });
    });
    expect(stopTrack).toHaveBeenCalledTimes(1);
});

it('lets staff reopen the camera after a denial and releases it when the page is hidden', async () => {
    const denied = new DOMException('Denied', 'NotAllowedError');
    const stopTrack = jest.fn();
    const getUserMedia = jest.fn().mockRejectedValueOnce(denied)
        .mockResolvedValueOnce({ getTracks: () => [{ stop: stopTrack }] });
    installCamera(getUserMedia);
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const { container } = render(<StaffCardScanner onScan={jest.fn()} verifyLegacyCards />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan with camera' }));
    await screen.findByText(/Allow camera access/);
    fireEvent.click(screen.getByRole('button', { name: 'Scan with camera' }));
    await screen.findByText(/Center the whole QR/);
    expect(getUserMedia).toHaveBeenLastCalledWith(expect.objectContaining({
        audio: false, video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
    }));
    expect(container.querySelector('video')).toHaveAttribute('playsinline');
    act(() => { window.dispatchEvent(new Event('pagehide')); });
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Scan with camera' })).toBeEnabled();
});

it('samples the whole tablet image and then the center at its original resolution', async () => {
    const frame = { width: 1, height: 1, data: new Uint8ClampedArray(4) };
    const drawImage = jest.fn();
    jest.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage, getImageData: () => frame,
    });
    const video = { readyState: 2, videoWidth: 1920, videoHeight: 1080 };
    const read = createReader(true);
    await read(video);
    await read(video);
    expect(drawImage.mock.calls).toEqual([
        [video, 0, 0, 1920, 1080, 0, 0, 1200, 675],
        [video, 360, 202, 1200, 675, 0, 0, 1200, 675],
    ]);
});
