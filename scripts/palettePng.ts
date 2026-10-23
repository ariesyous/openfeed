import { crc32, deflateSync } from "node:zlib";

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, crc]);
}

const rgb = (data: Uint8ClampedArray, i: number) => (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];

/** Opaque 8-bit indexed PNG. Share images are a few flat colours plus their text
 * antialiasing (~650 distinct colours), so the 256 most frequent colours keep every
 * flat area exact and the rarest blends map to their nearest kept colour. About a
 * third of the size of the canvas's truecolour PNG. Deterministic, so content-hashed
 * filenames stay stable across builds. */
export function encodePalettePng(data: Uint8ClampedArray, width: number, height: number): Buffer {
  const counts = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 255) throw new Error("Palette PNG requires an opaque image");
    const key = rgb(data, i);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const palette = [...counts].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 256).map(([key]) => key);
  const index = new Map(palette.map((key, i) => [key, i]));
  const nearest = (key: number) => {
    let best = 0, bestDistance = Infinity;
    palette.forEach((candidate, i) => {
      const distance = (((candidate >> 16) & 255) - ((key >> 16) & 255)) ** 2
        + (((candidate >> 8) & 255) - ((key >> 8) & 255)) ** 2 + ((candidate & 255) - (key & 255)) ** 2;
      if (distance < bestDistance) { bestDistance = distance; best = i; }
    });
    index.set(key, best);
    return best;
  };
  // One filter byte (none) per scanline, then one palette index per pixel.
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = rgb(data, (y * width + x) * 4);
      raw[y * (width + 1) + 1 + x] = index.get(key) ?? nearest(key);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 3; // indexed colour
  const colours = Buffer.alloc(palette.length * 3);
  palette.forEach((key, i) => colours.set([(key >> 16) & 255, (key >> 8) & 255, key & 255], i * 3));
  return Buffer.concat([SIGNATURE, chunk("IHDR", header), chunk("PLTE", colours), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
