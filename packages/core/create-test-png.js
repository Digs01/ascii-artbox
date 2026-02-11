
const sharp = require('sharp');
const path = require('path');

const width = 100;
const height = 100;
const data = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const val = Math.floor((x / width) * 255);
        data[idx] = val;     // r
        data[idx + 1] = val;   // g
        data[idx + 2] = val;   // b
        data[idx + 3] = 255;   // a
    }
}

// Save to root directory
const outPath = path.resolve(__dirname, '../../test-image.png');

sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile(outPath)
    .then(() => console.log(`Created ${outPath}`))
    .catch(err => console.error(err));
