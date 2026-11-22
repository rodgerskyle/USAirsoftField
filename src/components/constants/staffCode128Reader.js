// Matches the USAW Companion Code 128 reader for player ID cards.
// Code 128 patterns in symbol order. Even positions are black bars and odd positions are spaces.
const CODE_128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

const PATTERNS = CODE_128_PATTERNS.map(pattern => [...pattern].map(Number));
const START = [103, 104, 105];
const STOP = 106;
const UID = /^[A-Za-z0-9_-]{10,128}$/;

function unitWidth(runs, offset, count, modules) {
  let total = 0;
  for (let index = 0; index < count; index++) total += runs[offset + index];
  return total / modules;
}

function patternError(runs, offset, pattern, unit) {
  let error = 0;
  for (let index = 0; index < pattern.length; index++) {
    const distance = Math.abs(runs[offset + index] / unit - pattern[index]);
    if (distance > 1.05) return Infinity;
    error += distance;
  }
  return error / pattern.length;
}

function bestPattern(runs, offset, unit, codes) {
  if (unit < 0.85) return -1;
  let best = -1;
  let tolerance = 0.42;
  for (const code of codes) {
    const error = patternError(runs, offset, PATTERNS[code], unit);
    if (error < tolerance) {
      tolerance = error;
      best = code;
    }
  }
  return best;
}

const characters = Array.from({ length: 103 }, (_, value) => value);

function decodeSymbols(symbols, acceptsAdditionalValue) {
  const checksum = symbols.pop();
  const start = symbols.shift();
  const sum = symbols.reduce((total, code, index) => total + (index + 1) * code, start);
  if (sum % 103 !== checksum) return null;
  let current = start - 103;
  let value = '';
  for (const code of symbols) {
    if (current === 2 && code < 100) {
      value += String(code).padStart(2, '0');
    } else if (code < 96) {
      value += String.fromCharCode(current === 0 && code >= 64 ? code - 64 : code + 32);
    } else if (code === 99 && current !== 2) {
      current = 2;
    } else if (code === 100 && current !== 1) {
      current = 1;
    } else if (code === 101 && current !== 0) {
      current = 0;
    } else {
      // USAW player IDs contain plain characters, without controls or FNCs.
      return null;
    }
  }
  return UID.test(value) || acceptsAdditionalValue(value) ? value : null;
}

function decodeRuns(runs, acceptsAdditionalValue) {
  // White space precedes and follows a real symbol. The scanner can tolerate
  // a tight crop when at least half the normal quiet zone remains.
  for (let start = 1; start + 19 < runs.length; start += 2) {
    let unit = unitWidth(runs, start, 6, 11);
    if (runs[start - 1] < 5 * unit) continue;
    const first = bestPattern(runs, start, unit, START);
    if (first < 0) continue;
    const symbols = [first];
    for (let offset = start + 6; offset + 6 < runs.length && symbols.length <= 145; offset += 6) {
      const stopUnit = unitWidth(runs, offset, 7, 13);
      if (symbols.length > 2 && runs[offset + 7] >= 5 * stopUnit &&
          Math.abs(stopUnit / unit - 1) < 0.35 && patternError(runs, offset, PATTERNS[STOP], stopUnit) < 0.4) {
        const value = decodeSymbols(symbols, acceptsAdditionalValue);
        if (value) return value;
        break;
      }
      const nextUnit = unitWidth(runs, offset, 6, 11);
      if (Math.abs(nextUnit / unit - 1) > 0.33) break;
      const symbol = bestPattern(runs, offset, nextUnit, characters);
      if (symbol < 0) break;
      symbols.push(symbol);
      unit = 0.65 * unit + 0.35 * nextUnit;
    }
  }
  return null;
}

function decodeLine(samples, count, low, high, acceptsAdditionalValue) {
  if (count < 100 || high - low < 40) return null;
  const cutoff = (high + low) / 2;
  const runs = [];
  let dark = false;
  let width = 0;
  for (let index = 0; index < count; index++) {
    const black = samples[index] < cutoff;
    if (black !== dark) {
      runs.push(width);
      width = 0;
      dark = black;
    }
    width++;
  }
  runs.push(width);
  const value = decodeRuns(runs, acceptsAdditionalValue);
  if (value) return value;
  if (dark) runs.push(0);
  return decodeRuns(runs.reverse(), acceptsAdditionalValue);
}

const angles = [0, 90, 6, -6, 84, 96, 12, -12, 78, 102, 25, -25, 65, 115, 45, 135]
  .map(angle => ({ x: Math.cos(angle * Math.PI / 180), y: Math.sin(angle * Math.PI / 180) }));

function luminance(data, offset) {
  return (77 * data[offset] + 150 * data[offset + 1] + 29 * data[offset + 2]) / 256;
}

export function readPlayerIdBarcode(image, acceptsAdditionalValue = () => false) {
  const { width, height, data } = image;
  const radius = Math.ceil(Math.hypot(width, height));
  const samples = new Uint8Array(radius * 2 + 1);
  for (const angle of angles) {
    for (const cross of [0, -0.025, 0.025, -0.08, 0.08, -0.19, 0.19]) {
      const shift = cross * (Math.abs(angle.x) * height + Math.abs(angle.y) * width);
      const centerX = (width - 1) / 2 - shift * angle.y;
      const centerY = (height - 1) / 2 + shift * angle.x;
      let count = 0, low = 255, high = 0;
      for (let step = -radius; step <= radius; step++) {
        const x = centerX + step * angle.x / 2;
        const y = centerY + step * angle.y / 2;
        if (x < 0 || x >= width - 1 || y < 0 || y >= height - 1) continue;
        const column = Math.floor(x), row = Math.floor(y);
        const fx = x - column, fy = y - row;
        const upper = (row * width + column) * 4;
        const lower = upper + width * 4;
        const topGray = luminance(data, upper) * (1 - fx) + luminance(data, upper + 4) * fx;
        const bottomGray = luminance(data, lower) * (1 - fx) + luminance(data, lower + 4) * fx;
        const gray = topGray * (1 - fy) + bottomGray * fy;
        samples[count++] = gray;
        low = Math.min(low, gray);
        high = Math.max(high, gray);
      }
      const value = decodeLine(samples, count, low, high, acceptsAdditionalValue);
      if (value) return value;
    }
  }
  return null;
}
