import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

it('passes a case-sensitive Code 128 player ID and releases the camera', async () => {
    const stopTrack = jest.fn();
    installCamera(jest.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }));
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const detect = jest.fn().mockResolvedValue([{ rawValue: 'ExactCasePlayer987', format: 'code_128' }]);
    Object.defineProperty(window, 'BarcodeDetector', { configurable: true, value: class {
        static async getSupportedFormats() { return ['qr_code', 'code_128']; }
        detect(video) { return detect(video); }
    } });
    const onScan = jest.fn();
    const { container } = render(<StaffCardScanner onScan={onScan} />);
    Object.defineProperties(container.querySelector('video'), {
        readyState: { value: 2 },
        videoWidth: { value: 1280 },
        videoHeight: { value: 720 },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Scan with camera' }));
    await waitFor(() => expect(onScan).toHaveBeenCalledWith({ playerId: 'ExactCasePlayer987' }));
    expect(stopTrack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Scan with camera' })).toBeInTheDocument();
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
