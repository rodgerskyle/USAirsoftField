// Both field desks use the same camera settings and frame sampling.
export async function openCardCamera() {
  const media = navigator.mediaDevices;
  try {
    return await media.getUserMedia({
      audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
  } catch (error) {
    if (error.name !== 'OverconstrainedError') throw error;
    return media.getUserMedia({ audio: false, video: true });
  }
}

export function playCardCamera(video, stream) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.srcObject = stream;
  return video.play();
}

export function cameraFrameReader({ parse, readBarcode, loadQR }) {
  let qr, detector;
  // A stalled native decoder must not block software decoding during this session.
  const initializeNative = async () => {
    const supported = await window.BarcodeDetector?.getSupportedFormats();
    const formats = ['qr_code', 'code_128'].filter(format => supported?.includes(format));
    if (formats.length) detector = new window.BarcodeDetector({ formats });
  };
  void initializeNative().catch(() => {});
  void loadQR().then(reader => { qr = reader; }).catch(() => {});
  const canvas = document.createElement('canvas');
  let alternateCrop = false;
  return async video => {
    const width = video.videoWidth, height = video.videoHeight;
    if (video.readyState < 2 || !width || !height) return null;
    if (detector) {
      let timer;
      try {
        const results = await Promise.race([
          detector.detect(video),
          new Promise(resolve => { timer = setTimeout(resolve, 120); }),
        ]);
        if (results) {
          for (const { rawValue, format } of results) {
            const match = parse(rawValue, format);
            if (match) return match;
          }
        } else {
          detector = null;
        }
      } catch { /* An unreadable frame can still decode in software. */ }
      finally { clearTimeout(timer); }
    }
    // Alternate the full view and a centered, higher-detail crop so small bars on a printed card
    // survive tablet-camera downsampling. Both paths keep the original aspect ratio.
    const scale = Math.min(1, 1200 / Math.max(width, height));
    const frameWidth = Math.max(1, Math.round(width * scale));
    const frameHeight = Math.max(1, Math.round(height * scale));
    const sourceWidth = alternateCrop ? frameWidth : width;
    const sourceHeight = alternateCrop ? frameHeight : height;
    alternateCrop = !alternateCrop;
    if (canvas.width !== frameWidth) canvas.width = frameWidth;
    if (canvas.height !== frameHeight) canvas.height = frameHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(video, Math.floor((width - sourceWidth) / 2), Math.floor((height - sourceHeight) / 2),
      sourceWidth, sourceHeight, 0, 0, frameWidth, frameHeight);
    const image = context.getImageData(0, 0, frameWidth, frameHeight);
    const barcode = readBarcode(image);
    if (barcode) return parse(barcode, 'code_128');
    const decoded = qr?.(image.data, frameWidth, frameHeight, { inversionAttempts: 'attemptBoth' });
    return decoded ? parse(decoded.data, 'qr_code') : null;
  };
}
