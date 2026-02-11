
const fs = require('fs');
// Canvas not needed for PPM generation

// Let's make a simple PPM image (P3) to avoid external deps for test image generation
// P3
// width height
// maxval
// r g b ...

const width = 100;
const height = 100;
let ppm = `P3\n${width} ${height}\n255\n`;

for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
        const r = Math.floor((x / width) * 255);
        const g = Math.floor((y / height) * 255);
        const b = 128;
        ppm += `${r} ${g} ${b} `;
    }
    ppm += '\n';
}

fs.writeFileSync('test-image.ppm', ppm);
console.log('Created test-image.ppm');
