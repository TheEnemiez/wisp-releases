const fs = require('fs');
const zlib = require('zlib');

// Utility to calculate CRC32
const crc32 = (buf) => {
    const table = new Uint32Array(256).map((_, i) => {
        let c = i;
        for (let k = 0; k < 8; k++) c = (c & 1 ? 0xedb88320 : 0) ^ (c >>> 1);
        return c >>> 0;
    });

    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (~c) >>> 0;
};

// Utility to write PNG chunks
const writeChunk = (type, data) => {
    const chunk = new Uint8Array(12 + data.length);
    const view = new DataView(chunk.buffer);

    view.setUint32(0, data.length); // Chunk length
    chunk.set(type, 4); // Chunk type
    chunk.set(data, 8); // Chunk data
    const crc = crc32(chunk.subarray(4, 8 + data.length)); // Calculate CRC
    view.setUint32(8 + data.length, crc); // Write CRC

    return chunk;
};

// HSL to RGB Conversion
const hslToRgb = (h, s, l) => {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const f = (n) => {
        const k = (n + h * 12) % 12;
        const a = s * Math.min(l, 1 - l);
        return Math.round((l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)) * 255);
    };

    return [f(0), f(8), f(4)];
};

// Generate random HSL colors
const randomHSL = (h, s, l, variation = 0) => {
    const randomL = l + Math.random() * variation - variation / 2;
    return hslToRgb(h, s, randomL);
};

// Generate random points
const generatePoints = (numPoints, width, height, margin) =>
    Array.from({ length: numPoints }, () => ({
        x: Math.round(Math.random() * (width + 2 * margin) - margin),
        y: Math.round(Math.random() * (height + 2 * margin) - margin),
    }));

// Check if a point is inside a triangle
const isPointInTriangle = (px, py, a, b, c) => {
    const [ax, ay] = [a.x, a.y];
    const [bx, by] = [b.x, b.y];
    const [cx, cy] = [c.x, c.y];
    const area = 0.5 * (-by * cx + ay * (-bx + cx) + ax * (by - cy) + bx * cy);
    const s = (ay * cx - ax * cy + (cy - ay) * px + (ax - cx) * py) / (2 * area);
    const t = (ax * by - ay * bx + (ay - by) * px + (bx - ax) * py) / (2 * area);
    return s >= 0 && t >= 0 && s + t <= 1;
};

// Generate crystal-like image data
const generateCrystalImageData = (width, height) => {
    const pixels = new Uint8Array(width * height * 4);

    // Generate a consistent HSL for the background and crystals
    const baseHSL = [Math.random() * 360 | 0, Math.random() * 30 + 50 | 0, 30];

    // Fill the background using the same hue, saturation, and lightness
    const backgroundColor = hslToRgb(baseHSL[0], baseHSL[1], baseHSL[2]);
    for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = backgroundColor[0];
        pixels[i + 1] = backgroundColor[1];
        pixels[i + 2] = backgroundColor[2];
        pixels[i + 3] = 255; // Fully opaque
    }

    // Draw 10 overlapping crystal-like shapes
    for (let i = 0; i < 10; i++) {
        const points = generatePoints(10, width, height, 50);
        const hsl = [baseHSL[0], baseHSL[1], baseHSL[2] + i * 5];
        const fillColor = [...randomHSL(hsl[0], hsl[1], hsl[2], 20), 255]; // Fully opaque

        points.forEach((p, idx) => {
            const neighbors = points
                .map((pt, j) => ({
                    x: pt.x,
                    y: pt.y,
                    dist: Math.hypot(pt.x - p.x, pt.y - p.y),
                }))
                .filter((_, j) => j !== idx)
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 3);

            const triangle = [p, neighbors[0], neighbors[1]];

            // Fill triangle pixel-by-pixel
            const minX = Math.max(0, Math.min(...triangle.map((p) => p.x)));
            const maxX = Math.min(width - 1, Math.max(...triangle.map((p) => p.x)));
            const minY = Math.max(0, Math.min(...triangle.map((p) => p.y)));
            const maxY = Math.min(height - 1, Math.max(...triangle.map((p) => p.y)));

            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (isPointInTriangle(x, y, triangle[0], triangle[1], triangle[2])) {
                        const idx = (y * width + x) * 4;
                        pixels[idx] = fillColor[0]; // Red
                        pixels[idx + 1] = fillColor[1]; // Green
                        pixels[idx + 2] = fillColor[2]; // Blue
                        pixels[idx + 3] = 255; // Fully opaque
                    }
                }
            }
        });
    }

    return pixels;
};

// Create PNG file
const createPNG = (pixelData, width, height) => {
    const header = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature

    const ihdrData = new Uint8Array(13);
    const ihdrView = new DataView(ihdrData.buffer);
    ihdrView.setUint32(0, width); // Width
    ihdrView.setUint32(4, height); // Height
    ihdrData[8] = 8; // Bit depth
    ihdrData[9] = 6; // Color type (RGBA)
    ihdrData[10] = 0; // Compression
    ihdrData[11] = 0; // Filter
    ihdrData[12] = 0; // Interlace
    const ihdrChunk = writeChunk(new Uint8Array([73, 72, 68, 82]), ihdrData); // "IHDR"

    const rowBytes = width * 4 + 1;
    const rawImageData = new Uint8Array(height * rowBytes);
    for (let y = 0; y < height; y++) {
        rawImageData[y * rowBytes] = 0; // No filter
        rawImageData.set(pixelData.subarray(y * width * 4, (y + 1) * width * 4), y * rowBytes + 1);
    }
    const compressedData = zlib.deflateSync(rawImageData); // Compress image data
    const idatChunk = writeChunk(new Uint8Array([73, 68, 65, 84]), compressedData); // "IDAT"

    const iendChunk = writeChunk(new Uint8Array([73, 69, 78, 68]), new Uint8Array()); // "IEND"

    return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
};

// Export module
module.exports = {
    generateCrystalImageData,
    createPNG,
};
