// Generador de matriz QR (ISO/IEC 18004, modo byte, corrección de errores nivel M/L)
// Sin dependencias nativas para funcionar en Android, iOS y Web.

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 256) x ^= 285;
}
for (let i = 255; i < 512; i++) {
  EXP[i] = EXP[i - 255];
}

const gmul = (a, b) => (a > 0 && b > 0 ? EXP[LOG[a] + LOG[b]] : 0);
const gpow = (a, b) => EXP[(b * LOG[a]) % 255];

function genRS(degree) {
  const next = new Uint8Array(degree + 2);
  const poly = new Uint8Array(degree + 1);
  poly[0] = 1;
  for (let i = 0; i < degree; i++) {
    const root = gpow(2, i);
    next.fill(0, 0, i + 2);
    for (let j = 0; j < i + 1; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmul(poly[j], root);
    }
    for (let j = 0; j < i + 2; j++) {
      poly[j] = next[j];
    }
  }
  return poly;
}

function encodeRS(data, ecLen) {
  const poly = genRS(ecLen);
  const buf = new Uint8Array(data.byteLength + poly.byteLength - 1);
  buf.set(data);
  for (let i = 0; i < data.byteLength; i++) {
    const coef = buf[i];
    if (coef) {
      for (let j = 1; j < poly.byteLength; j++) {
        buf[i + j] ^= gmul(poly[j], coef);
      }
    }
  }
  return buf.subarray(data.byteLength);
}

const TOTAL_CODEWORDS = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
];

const EC_CODEWORDS = [
  [0, 0, 0, 0],
  [10, 7, 17, 13],
  [16, 10, 28, 22],
  [26, 15, 44, 36],
  [36, 20, 64, 52],
  [48, 26, 88, 72],
  [64, 36, 112, 96],
  [72, 40, 130, 108],
  [88, 48, 156, 132],
  [110, 60, 192, 160],
  [130, 72, 224, 192],
  [150, 80, 264, 224],
  [176, 96, 308, 260],
  [198, 104, 352, 288],
  [216, 120, 384, 320],
  [240, 132, 432, 360],
  [280, 144, 480, 408],
  [308, 168, 532, 448],
  [338, 180, 588, 504],
  [364, 196, 650, 546],
  [416, 224, 700, 600],
];

const NUM_BLOCKS = [
  [0, 0, 0, 0],
  [1, 1, 1, 1],
  [1, 1, 1, 1],
  [1, 1, 2, 2],
  [2, 1, 4, 2],
  [2, 1, 4, 4],
  [4, 2, 4, 4],
  [4, 2, 5, 6],
  [4, 2, 6, 6],
  [5, 2, 8, 8],
  [5, 4, 8, 8],
  [5, 4, 11, 8],
  [8, 4, 11, 10],
  [9, 4, 16, 12],
  [9, 4, 16, 16],
  [10, 6, 18, 12],
  [10, 6, 16, 17],
  [11, 6, 19, 16],
  [13, 6, 21, 18],
  [14, 7, 25, 21],
  [16, 8, 25, 20],
];

const ALIGNMENT = [
  [],
  [],
  [4, 16],
  [4, 20],
  [4, 24],
  [4, 28],
  [4, 32],
  [4, 20, 36],
  [4, 22, 40],
  [4, 24, 44],
  [4, 26, 48],
  [4, 28, 52],
  [4, 30, 56],
  [4, 32, 60],
  [4, 24, 44, 64],
  [4, 24, 46, 68],
  [4, 24, 48, 72],
  [4, 28, 52, 76],
  [4, 28, 54, 80],
  [4, 28, 56, 84],
  [4, 32, 60, 88],
];

function utf8Bytes(str) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str);
  }
  const out = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return new Uint8Array(out);
}

function getBestVersion(bytes, ec) {
  for (let v = 1; v <= 20; v++) {
    let cap = TOTAL_CODEWORDS[v] - EC_CODEWORDS[v][ec];
    cap -= v > 9 ? 3 : 2;
    if (cap >= bytes.byteLength) return v;
  }
  throw new RangeError('Contenido demasiado largo para el código QR');
}

function makeSegments(bytes, version, ec) {
  const dataLen = TOTAL_CODEWORDS[version] - EC_CODEWORDS[version][ec];
  const seg = new Uint8Array(dataLen);
  let carry = 0;
  let pos = 0;
  if (version > 9) {
    const len = bytes.byteLength & 0xffff;
    seg[0] = 64 | ((len >>> 12) & 15);
    seg[1] = (len >>> 4) & 255;
    carry = (len & 15) << 4;
    pos = 2;
  } else {
    const len = bytes.byteLength & 255;
    seg[0] = 64 | ((len >>> 4) & 15);
    carry = (len & 15) << 4;
    pos = 1;
  }
  let i = 0;
  while (i + 1 < bytes.byteLength) {
    const word = (bytes[i++] << 8) | bytes[i++];
    seg[pos++] = carry | (word >>> 12);
    seg[pos++] = (word >>> 4) & 255;
    carry = (word << 4) & 240;
  }
  if (i < bytes.byteLength) {
    seg[pos++] = carry | (bytes[i] >>> 4);
    carry = (bytes[i] << 4) & 240;
  }
  seg[pos++] = carry;
  for (let pad = 0; pos < dataLen; pad++) {
    seg[pos++] = pad & 1 ? 17 : 236;
  }
  return seg;
}

function encodeData(seg, version, ec) {
  const totalLen = seg.byteLength + EC_CODEWORDS[version][ec];
  const blocks = NUM_BLOCKS[version][ec];
  const shortBlocks = blocks - (totalLen % blocks);
  const shortDataLen = (seg.byteLength / blocks) | 0;
  const ecBlockLen = ((totalLen / blocks) | 0) - shortDataLen;
  const dataOffset = seg.byteLength;
  const out = new Uint8Array(totalLen);
  for (let b = 0, offset = 0; b < blocks; b++) {
    const blockLen = b < shortBlocks ? shortDataLen : shortDataLen + 1;
    const ecBytes = encodeRS(seg.subarray(offset, offset + blockLen), ecBlockLen);
    for (let i = 0; i < blockLen; i++) {
      out[i < shortDataLen ? i * blocks + b : shortDataLen * blocks + (b - shortBlocks)] = seg[offset + i];
    }
    for (let i = 0; i < ecBlockLen; i++) {
      out[dataOffset + i * blocks + b] = ecBytes[i];
    }
    offset += blockLen;
  }
  return out;
}

function setSquare(mask, size, row, col, len) {
  const end = (row + len) * size;
  for (let r = row * size; r < end; r += size) {
    mask.fill(1, r + col, r + col + len);
  }
}

function setPattern(mat, size, row, col, len) {
  const base = row * size + col;
  for (let r = 0; r < len; r++) {
    for (let c = 0; c < len; c++) {
      const dc = c < len - 1 - c ? c : len - 1 - c;
      const dr = r < len - 1 - r ? r : len - 1 - r;
      mat[base + r * size + c] = (dc < dr ? dc : dr) !== 1 ? 1 : 0;
    }
  }
}

function writeFinderPatterns(mat, mask, size) {
  const edge = size - 7;
  setPattern(mat, size, 0, 0, 7);
  setPattern(mat, size, edge, 0, 7);
  setPattern(mat, size, 0, edge, 7);
  setSquare(mask, size, 0, 0, 8);
  setSquare(mask, size, edge - 1, 0, 8);
  setSquare(mask, size, 0, edge - 1, 8);
}

function writeAlignmentPatterns(mat, mask, size, version) {
  const coords = ALIGNMENT[version];
  for (let i = 0; i < coords.length; i++) {
    const r = coords[i];
    for (let j = 0; j < coords.length; j++) {
      if ((i || j % (coords.length - 1)) && (j || i % (coords.length - 1))) {
        const c = coords[j];
        setPattern(mat, size, r, c, 5);
        setSquare(mask, size, r, c, 5);
      }
    }
  }
}

function writeTimingPatterns(mat, mask, size) {
  const limit = size - 7;
  for (let i = 8; i < limit; i++) {
    const vIdx = i * size + 6;
    if (!mask[vIdx]) {
      mask[vIdx] = 1;
      mat[vIdx] = (i + 1) % 2;
    }
    const hIdx = 6 * size + i;
    if (!mask[hIdx]) {
      mask[hIdx] = 1;
      mat[hIdx] = (i + 1) % 2;
    }
  }
}

function reserveFormatAndVersion(mask, size, version) {
  const edge = size - 8;
  mask[8 * size + 8] = 1;
  for (let i = 0; i < 8; i++) {
    mask[i * size + 8] = 1;
    mask[8 * size + i] = 1;
    mask[(edge + i) * size + 8] = 1;
    mask[8 * size + edge + i] = 1;
  }
  if (version >= 7) {
    const vEdge = size - 11;
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        mask[(vEdge + j) * size + i] = 1;
        mask[i * size + vEdge + j] = 1;
      }
    }
  }
}

function writeData(mat, mask, size, codewords) {
  let byteIdx = 0;
  let col = size - 1;
  let dir = -1;
  let bit = 7;
  while (byteIdx < codewords.byteLength) {
    if (col === 6) col--;
    for (let step = 0; step < size; step++) {
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        const r = dir === -1 ? size - step - 1 : step;
        if (mask[r * size + c]) continue;
        mat[r * size + c] = (codewords[byteIdx] >>> bit) & 1;
        if (bit-- === 0) {
          bit = 7;
          if (++byteIdx >= codewords.byteLength) return;
        }
      }
    }
    dir = -dir;
    col -= 2;
  }
}

function xorMask(mat, mask, size, pattern) {
  for (let r = 0, rowOffset = 0; r < size; r++, rowOffset += size) {
    for (let c = 0; c < size; c++) {
      const idx = rowOffset + c;
      if (mask[idx]) continue;
      let flip = false;
      switch (pattern) {
        case 0:
          flip = ((r + c) & 1) === 0;
          break;
        case 1:
          flip = (r & 1) === 0;
          break;
        case 2:
          flip = c % 3 === 0;
          break;
        case 3:
          flip = (r + c) % 3 === 0;
          break;
        case 4:
          flip = ((((r / 2) | 0) + ((c / 3) | 0)) & 1) === 0;
          break;
        case 5:
          flip = ((r * c) & 1) + ((r * c) % 3) === 0;
          break;
        case 6:
          flip = ((((r * c) & 1) + ((r * c) % 3)) & 1) === 0;
          break;
        case 7:
          flip = ((((r * c) % 3) + ((r + c) & 1)) & 1) === 0;
          break;
      }
      if (flip) mat[idx] ^= 1;
    }
  }
}

function computePenalty(mat, size) {
  let penalty = 0;
  let darkCount = 0;
  for (let i = 0; i < size; i++) {
    let runH = 1;
    let runV = 1;
    let patH = 0;
    let patV = 0;
    for (let j = 0; j < size; j++) {
      const hIdx = i * size + j;
      const vIdx = j * size + i;
      darkCount += mat[hIdx];
      if (j > 0) {
        if (mat[hIdx - 1] === mat[hIdx]) {
          runH++;
        } else {
          if (runH >= 5) penalty += runH - 5 + 3;
          runH = 1;
        }
        if (mat[vIdx - size] === mat[vIdx]) {
          runV++;
        } else {
          if (runV >= 5) penalty += runV - 5 + 3;
          runV = 1;
        }
      }
      if (
        i < size - 1 &&
        j < size - 1 &&
        mat[hIdx] === mat[hIdx + 1] &&
        mat[hIdx] === mat[hIdx + size] &&
        mat[hIdx] === mat[hIdx + size + 1]
      ) {
        penalty += 3;
      }
      patH = ((patH << 1) & 2047) | mat[hIdx];
      patV = ((patV << 1) & 2047) | mat[vIdx];
      if (j >= 10) {
        if (patH === 1488 || patH === 93) penalty += 40;
        if (patV === 1488 || patV === 93) penalty += 40;
      }
    }
    if (runH >= 5) penalty += runH - 5 + 3;
    if (runV >= 5) penalty += runV - 5 + 3;
  }
  const balance = 100 * Math.abs(darkCount / mat.byteLength - 0.5);
  penalty += 10 * Math.floor(balance / 5);
  return penalty;
}

function encodeFormatInfo(ec, pattern) {
  const data = ((ec << 3) | pattern) << 10;
  let rem = data;
  for (let i = 0; i < 5; i++) {
    if (rem & (1 << (14 - i))) rem ^= 1335 << (4 - i);
  }
  return 21522 ^ (rem | data);
}

function writeFormatInfo(mat, size, ec, pattern) {
  const info = encodeFormatInfo(ec, pattern);
  let bit = 14;
  for (let i = 0; i < 6; i++) mat[8 * size + i] = (info >> bit--) & 1;
  mat[8 * size + 7] = (info >> bit--) & 1;
  mat[8 * size + 8] = (info >> bit--) & 1;
  mat[7 * size + 8] = (info >> bit--) & 1;
  for (let i = 0; i < 6; i++) mat[(5 - i) * size + 8] = (info >> bit--) & 1;
  bit = 14;
  for (let i = 0; i < 7; i++) mat[(size - 1 - i) * size + 8] = (info >> bit--) & 1;
  mat[(size - 8) * size + 8] = 1;
  for (let i = 0; i < 8; i++) mat[8 * size + size - 8 + i] = (info >> bit--) & 1;
}

// Genera una matriz cuadrada de 0 (blanco) y 1 (negro) para el texto indicado.
export function generarMatrizQR(texto, ec = 0) {
  const bytes = utf8Bytes(String(texto || ''));
  const version = getBestVersion(bytes, ec);
  const seg = makeSegments(bytes, version, ec);
  const codewords = encodeData(seg, version, ec);
  const size = 17 + version * 4;
  const mat = new Uint8Array(size * size);
  const mask = new Uint8Array(size * size);

  writeFinderPatterns(mat, mask, size);
  writeAlignmentPatterns(mat, mask, size, version);
  writeTimingPatterns(mat, mask, size);
  reserveFormatAndVersion(mask, size, version);
  writeData(mat, mask, size, codewords);

  let bestPenalty = 0;
  let bestPattern = 0;
  const candidate = new Uint8Array(mat.byteLength);
  for (let p = 0; p <= 7; p++) {
    candidate.set(mat);
    xorMask(candidate, mask, size, p);
    const score = computePenalty(candidate, size);
    if (p === 0 || score < bestPenalty) {
      bestPenalty = score;
      bestPattern = p;
    }
  }
  xorMask(mat, mask, size, bestPattern);
  writeFormatInfo(mat, size, ec, bestPattern);

  const filas = [];
  for (let r = 0; r < size; r++) {
    const fila = [];
    let actual = mat[r * size];
    let largo = 1;
    for (let c = 1; c < size; c++) {
      const bit = mat[r * size + c];
      if (bit === actual) {
        largo++;
      } else {
        fila.push({ oscuro: actual === 1, largo });
        actual = bit;
        largo = 1;
      }
    }
    fila.push({ oscuro: actual === 1, largo });
    filas.push(fila);
  }

  return { tamano: size, filas };
}

