// Generates PWA PNG icons (accent square + white sparkle) with zero deps.
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function png(size, accent) {
  const [ar, ag, ab] = accent;
  const w = size, h = size;
  const raw = Buffer.alloc(h * (1 + w * 4));
  const cx = w / 2, cy = h / 2, r = w * 0.27; // sparkle radius
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0; // filter: none
    for (let x = 0; x < w; x++) {
      const o = y * (1 + w * 4) + 1 + x * 4;
      // 4-point sparkle: union of two thin diamonds (a star-ish mark)
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      const star = dx + dy < r && (dx < r * 0.34 || dy < r * 0.34);
      if (star) { raw[o] = 255; raw[o + 1] = 255; raw[o + 2] = 255; raw[o + 3] = 255; }
      else { raw[o] = ar; raw[o + 1] = ag; raw[o + 2] = ab; raw[o + 3] = 255; }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const accent = [79, 107, 237]; // #4F6BED
writeFileSync("public/icon-192.png", png(192, accent));
writeFileSync("public/icon-512.png", png(512, accent));
console.log("wrote public/icon-192.png, public/icon-512.png");
