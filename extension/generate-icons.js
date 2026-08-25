/**
 * generate-icons.js
 * Generates PNG icons for the VanishX Chrome extension using raw PNG construction.
 * No external dependencies required.
 * Produces: icons/icon16.png, icons/icon48.png, icons/icon128.png
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// VanishX color palette
const BG  = { r: 0x12, g: 0x13, b: 0x13 }; // #121313 Space Black
const FG  = { r: 0xFF, g: 0x60, b: 0x44 }; // #FF6044 Coral

/**
 * Draws the VanishX X lettermark onto a pixel buffer.
 * @param {Uint8Array} pixels - RGBA flat array
 * @param {number} size - icon dimension
 */
function drawIcon(pixels, size) {
  const pad = Math.round(size * 0.18);       // 18% padding
  const stroke = Math.max(1, Math.round(size * 0.13)); // stroke width ~13%

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Background: rounded square — use BG everywhere, clip corners
      const r = Math.round(size * 0.18); // corner radius
      const inCorner = (
        (x < r && y < r && Math.hypot(x - r, y - r) > r) ||
        (x > size - 1 - r && y < r && Math.hypot(x - (size - 1 - r), y - r) > r) ||
        (x < r && y > size - 1 - r && Math.hypot(x - r, y - (size - 1 - r)) > r) ||
        (x > size - 1 - r && y > size - 1 - r && Math.hypot(x - (size - 1 - r), y - (size - 1 - r)) > r)
      );

      if (inCorner) {
        // transparent
        pixels[idx]     = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0;
        continue;
      }

      // Draw X: two diagonal strokes within the padded area
      const lx = x - pad;
      const ly = y - pad;
      const inner = size - 2 * pad;

      // Stroke 1: top-left to bottom-right  (y = x mapped)
      // Stroke 2: top-right to bottom-left  (y = inner - x mapped)
      const d1 = Math.abs(ly - lx) / Math.SQRT2;          // dist from \ diagonal
      const d2 = Math.abs(ly - (inner - 1 - lx)) / Math.SQRT2; // dist from / diagonal

      const inX =
        lx >= 0 && lx < inner && ly >= 0 && ly < inner &&
        (d1 <= stroke / 2 || d2 <= stroke / 2);

      if (inX) {
        pixels[idx]     = FG.r;
        pixels[idx + 1] = FG.g;
        pixels[idx + 2] = FG.b;
        pixels[idx + 3] = 255;
      } else {
        pixels[idx]     = BG.r;
        pixels[idx + 1] = BG.g;
        pixels[idx + 2] = BG.b;
        pixels[idx + 3] = 255;
      }
    }
  }
}

/**
 * Encodes RGBA pixel data as a valid PNG file buffer.
 */
function encodePNG(pixels, width, height) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.concat([typeBytes, data]);
    const crc = crc32(crcBuf);
    const crcOut = Buffer.alloc(4);
    crcOut.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBytes, data, crcOut]);
  }

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8]  = 8;  // bit depth
  ihdrData[9]  = 6;  // colour type: RGBA
  ihdrData[10] = 0;  // compression method
  ihdrData[11] = 0;  // filter method
  ihdrData[12] = 0;  // interlace method

  // Raw scanline data (filter type 0 per row)
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(0); // filter byte: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rawRows.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3]);
    }
  }

  const compressed = zlib.deflateSync(Buffer.from(rawRows));
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));
  const ihdr = chunk('IHDR', ihdrData);

  return Buffer.concat([sig, ihdr, idat, iend]);
}

// CRC-32 table for PNG
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate all three sizes
const sizes = [16, 48, 128];
for (const size of sizes) {
  const pixels = new Uint8Array(size * size * 4);
  drawIcon(pixels, size);
  const png = encodePNG(pixels, size, size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`Generated: ${outPath} (${png.length} bytes)`);
}

console.log('All icons generated successfully.');
