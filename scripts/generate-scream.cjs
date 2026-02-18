const sharp = require('sharp');
const { imageToAscii } = require('../packages/core/dist/converter.js');
const fs = require('fs');
const path = require('path');
const https = require('https');

const URL = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Edvard_Munch%2C_1893%2C_The_Scream%2C_oil%2C_tempera_and_pastel_on_cardboard%2C_91_x_73_cm%2C_National_Gallery_of_Norway.jpg';
const OUTPUT_PATH = path.join(__dirname, '../apps/web/tmp/scream_ascii.txt');

function download(url) {
  const options = {
    headers: {
      'User-Agent': 'AsciiArtbox/1.0 (https://ascii.artbox.com; contact@artbox.com)'
    }
  };
  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: ${res.statusCode}`));
        return;
      }
      const data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', reject);
    });
  });
}

async function generate() {
  console.log('Fetching The Scream from Wikimedia...');
  const inputBuffer = await download(URL);

  console.log('Processing image...');
  // Enhance image for better ASCII conversion
  const buffer = await sharp(inputBuffer)
    .resize({ width: 1200 }) // Resize large
    .sharpen()
    .normalise() // Contrast stretch
    .clahe({ width: 120, height: 98 }) // Local contrast
    .toBuffer();

  console.log('Converting to ASCII...');
  const ascii = await imageToAscii(buffer, {
    width: 120,
    height: 98,
    fit: 'cover', // Crop to fill 120x98 aspect ratio
    invert: true,  // Light -> Dense
    renderMode: 'standard',
    charset: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
    dither: false,
    contrast: 1.3
  });

  // Ensure directory exists
  const dir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, ascii);
  console.log(`Generated to ${OUTPUT_PATH}`);
  console.log('First few lines preview:');
  console.log(ascii.split('\n').slice(0, 10).join('\n'));
}

generate().catch(console.error);
