const fs = require('fs');
const { createCanvas } = require('canvas') || {};

// Create simple PNG placeholder if canvas not available
function makePng(size) {
  // Create a minimal valid PNG (green square)
  const w = size, h = size;
  const header = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(w, 8);
  ihdr.writeUInt32BE(h, 12);
  ihdr.writeUInt8(8, 16);
  ihdr.writeUInt8(2, 17);
  ihdr.writeUInt8(0, 18);
  ihdr.writeUInt8(0, 19);
  ihdr.writeUInt8(0, 20);
  let ihdrCrc = crc32(ihdr.slice(4, 21));
  ihdr.writeUInt32BE(ihdrCrc, 21);

  let rawData = Buffer.alloc(h * (1 + w * 3));
  for (let y = 0; y < h; y++) {
    rawData[y * (1 + w * 3)] = 0;
    for (let x = 0; x < w; x++) {
      const off = y * (1 + w * 3) + 1 + x * 3;
      rawData[off] = 0;
      rawData[off + 1] = 0xE6;
      rawData[off + 2] = 0x76;
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(idat.slice(4, 8 + compressed.length));
  idat.writeUInt32BE(idatCrc, 8 + compressed.length);

  const iend = Buffer.alloc(12);
  iend.writeUInt32BE(0, 0);
  iend.write('IEND', 4);
  const iendCrc = crc32(iend.slice(4, 8));
  iend.writeUInt32BE(iendCrc, 8);

  fs.writeFileSync(`public/icon-${size}.png`, Buffer.concat([header, ihdr, idat, iend]));
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

makePng(192);
makePng(512);
console.log('PWA icons created');
