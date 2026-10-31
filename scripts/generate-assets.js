const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Ensure directories exist
const publicDir = path.join(__dirname, '..', 'public');
const imagesDir = path.join(publicDir, 'images');
fs.mkdirSync(imagesDir, { recursive: true });

function createPng(width, height, drawPixelFn) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA (color type 6)
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const crc = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) | 0;
  }

  const ihdrChunk = chunk('IHDR', ihdrData);

  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLen);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLen;
    rawData[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = chunk('IDAT', compressedData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Draw WealthOvers 'W' Logo with rounded border
function drawLogo(bgR, bgG, bgB, fgR, fgG, fgB) {
  return (x, y, w, h) => {
    const radius = Math.floor(w * 0.22);
    const inBox = 
      (x >= radius && x < w - radius) ||
      (y >= radius && y < h - radius) ||
      (Math.hypot(x - radius, y - radius) <= radius) ||
      (Math.hypot(x - (w - radius - 1), y - radius) <= radius) ||
      (Math.hypot(x - radius, y - (h - radius - 1)) <= radius) ||
      (Math.hypot(x - (w - radius - 1), y - (h - radius - 1)) <= radius);
    
    if (!inBox) {
      return [0, 0, 0, 0]; // Transparent outside rounded box
    }

    // Normalized coordinates [0, 1] inside content area
    const nx = x / w;
    const ny = y / h;

    // Draw stylized 'W' glyph
    // W consists of 4 diagonal strokes:
    // Stroke 1: (0.22, 0.30) to (0.36, 0.72)
    // Stroke 2: (0.36, 0.72) to (0.50, 0.45)
    // Stroke 3: (0.50, 0.45) to (0.64, 0.72)
    // Stroke 4: (0.64, 0.72) to (0.78, 0.30)
    const strokeWidth = 0.055;
    function distToSegment(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    const d1 = distToSegment(nx, ny, 0.23, 0.30, 0.36, 0.70);
    const d2 = distToSegment(nx, ny, 0.36, 0.70, 0.50, 0.46);
    const d3 = distToSegment(nx, ny, 0.50, 0.46, 0.64, 0.70);
    const d4 = distToSegment(nx, ny, 0.64, 0.70, 0.77, 0.30);
    const minDist = Math.min(d1, d2, d3, d4);

    if (minDist <= strokeWidth) {
      return [fgR, fgG, fgB, 255]; // Monogram color
    }

    return [bgR, bgG, bgB, 255]; // Background color
  };
}

// 1. Dark Theme Logo (Slate dark background, Emerald green W)
const darkLogo = createPng(192, 192, drawLogo(15, 23, 42, 16, 185, 129));
fs.writeFileSync(path.join(imagesDir, 'logo-dark.png'), darkLogo);
console.log('Created images/logo-dark.png');

// 2. Light Theme Logo (White / Slate-50 background, Emerald green W)
const lightLogo = createPng(192, 192, drawLogo(248, 250, 252, 5, 150, 105));
fs.writeFileSync(path.join(imagesDir, 'logo-light.png'), lightLogo);
console.log('Created images/logo-light.png');

// 3. Generic App Logo
const genericLogo = createPng(512, 512, drawLogo(15, 23, 42, 16, 185, 129));
fs.writeFileSync(path.join(imagesDir, 'logo.png'), genericLogo);
console.log('Created images/logo.png');

// 4. Favicon (32x32 ICO container wrapping 32x32 PNG)
const faviconPng = createPng(32, 32, drawLogo(15, 23, 42, 16, 185, 129));
// Standard ICO header: 6 bytes header + 16 bytes directory entry + PNG data
const icoHeader = Buffer.alloc(6 + 16);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Image type: 1 = ICO
icoHeader.writeUInt16LE(1, 4); // Number of images: 1

icoHeader.writeUInt8(32, 6);   // Width
icoHeader.writeUInt8(32, 7);   // Height
icoHeader.writeUInt8(0, 8);    // Color palette: 0 = no palette
icoHeader.writeUInt8(0, 9);    // Reserved
icoHeader.writeUInt16LE(1, 10); // Color planes
icoHeader.writeUInt16LE(32, 12); // Bits per pixel
icoHeader.writeUInt32LE(faviconPng.length, 14); // Size of image data
icoHeader.writeUInt32LE(22, 18); // Offset to image data (6 + 16 = 22)

const icoFile = Buffer.concat([icoHeader, faviconPng]);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoFile);
console.log('Created favicon.ico');
