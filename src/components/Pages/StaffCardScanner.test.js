import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { isLegacyCardName } from '../constants/scoreCards';
import { readPlayerIdBarcode } from '../constants/staffCode128Reader';
import { StaffCardScanner } from './StaffCardScanner';

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

it('decodes a short legacy name in software when the membership scanner opts in', () => {
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
    const image = { width, height, data };
    expect(readPlayerIdBarcode(image)).toBeNull();
    expect(readPlayerIdBarcode(image, isLegacyCardName)).toBe('ab');
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
