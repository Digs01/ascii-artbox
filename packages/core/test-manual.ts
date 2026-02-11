
import { imageToAscii } from './src/index';
import sharp from 'sharp';

async function test() {
    console.log('Creating test image...');
    const width = 100;
    const height = 100;

    // Create gradient buffer
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

    const imageBuffer = await sharp(data, { raw: { width, height, channels: 4 } }).png().toBuffer();

    console.log('Converting to ASCII (width=50)...');
    const ascii = await imageToAscii(imageBuffer, { width: 50 });
    console.log('--- ASCII OUTPUT START ---');
    console.log(ascii);
    console.log('--- ASCII OUTPUT END ---');
}

test().catch(console.error);
