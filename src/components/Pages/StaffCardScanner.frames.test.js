import jsQR from '../../../public/vendor/jsqr-1.4.0.js';
import { createReader } from './StaffCardScanner';

// Packed black/white modules from the Companion's playerIdBarcode SVG and its
// qrcode-generator (medium error correction) using the harmless IDs below.
const id = 'Aa9BcdEfGhJkLmN0pQrsTuVwXy42';
const token = 'cameraCardFixture000000000000000';
const cardPixels = {
    barcode: { width: 363, height: 1,
        base64: 'ADSFGJYcsixCyE0aLCaImFbjCUbvdXGnZTzR0nrybinl1jynFtvZOzlejHWAAA==' },
    card: { width: 37, height: 37,
        base64: '/sITy/wWp1kQbpkEnrt1QIXl26VFCa7BIElxB/qqqq/gGCo0ALduzuJYQay8SpP/WvtoY8plmsEoBA9v8NO4TecrAmqa0ir0kPPrYZRAZOF3LpD7p+i25ktEkCmoP01CWJ4UXqYjHhMEpAgYgXyddx54drnNZdZe1OH9qCVYKUxnMXfy9P8AcIHMX/ossirwWFg3EbpCzq/F1PqZ1+67E9exBFkhg0/t3CYPgA==' },
    profile: { width: 37, height: 37,
        base64: '/u12O/wRolMQbojf7Lt1+GLV26lqEa7BSF8lB/qqqq/gFk73AIurNkfIhkTbV738q1QBIPyPFmA6dUlhnhDwjmMYzIfHwz4AoTav4ZsnbwHzssS9zlR2aOEf/FRjtWRp8n7Y0r7KfQU8R48yj9L0RyEuB30k9thUA+k43ihrAKh0zPhV6f4ATva8S/uOvCoQQeGxHbrphE/l0sF6WW6XWHmJBAPaIW/upeFRgA==' },
};

function cameraImage(code) {
    const { width, height, base64 } = code;
    const modules = atob(base64);
    const bar = height === 1;
    const scale = bar ? 2 : 4;
    const pad = 16;
    // Scan the long barcode with the card turned sideways, at low contrast.
    const imageWidth = bar ? 66 : width * scale + 2 * pad;
    const imageHeight = (bar ? width : height) * scale + 2 * pad;
    const data = new Uint8ClampedArray(imageWidth * imageHeight * 4);
    for (let y = 0; y < imageHeight; y++) {
        for (let x = 0; x < imageWidth; x++) {
            const col = Math.floor(((bar ? y : x) - pad) / scale);
            const row = bar ? 0 : Math.floor((y - pad) / scale);
            const index = row * width + col;
            const black = col >= 0 && col < width && row >= 0 && row < height &&
                (modules.charCodeAt(index >> 3) & (128 >> (index % 8)));
            const v = black ? (bar ? 82 : 0) : (bar ? 143 : 255);
            data.set([v, v, v, 255], (y * imageWidth + x) * 4);
        }
    }
    return { data, width: imageWidth, height: imageHeight };
}

it.each([
    ['the case-sensitive printed member ID', 'barcode', { playerId: id }],
    ['the digital card verification QR', 'card', { cardToken: token }],
    ['the printed website profile QR', 'profile', { playerId: id }],
])('decodes %s using the shipping software readers', async (_label, key, expected) => {
    const image = cameraImage(cardPixels[key]);
    const previousDecoder = window.jsQR;
    window.jsQR = jsQR;
    const canvas = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
        drawImage() {}, getImageData() { return image; },
    });
    try {
        const reader = createReader(true);
        await Promise.resolve();
        expect(await reader({ readyState: 2, videoWidth: image.width, videoHeight: image.height })).toEqual(expected);
    } finally {
        canvas.mockRestore();
        if (previousDecoder) window.jsQR = previousDecoder;
        else delete window.jsQR;
    }
});
