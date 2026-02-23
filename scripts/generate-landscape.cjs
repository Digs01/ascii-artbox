const sharp = require('sharp');
const { imageToAscii } = require('../packages/core/dist/converter.js');
const fs = require('fs');
const path = require('path');
const https = require('https');

// A cool cyberpunk/cityscape night landscape from Unsplash
const URL = 'https://images.unsplash.com/photo-1515630278258-407f66498911?q=80&w=1200&auto=format&fit=crop';
const OUTPUT_PATH = path.join(__dirname, '../apps/web/tmp/landscape_ascii.txt');
const MODULE_PATH = path.join(__dirname, '../apps/web/app/ascii-art.ts');

function download(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            // Follow redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return download(res.headers.location).then(resolve).catch(reject);
            }
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
    console.log('Fetching Landscape from Unsplash...');
    const inputBuffer = await download(URL);

    console.log('Processing image...');
    const buffer = await sharp(inputBuffer)
        .resize({ width: 1200 })
        .sharpen()
        .normalise()
        .clahe({ width: 150, height: 60 })
        .toBuffer();

    console.log('Converting to ASCII...');
    // Landscape ratio (wider, shorter)
    const ascii = await imageToAscii(buffer, {
        width: 150,
        height: 60,
        fit: 'cover',
        invert: true,
        renderMode: 'standard',
        charset: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
        dither: false,
        contrast: 1.4
    });

    // Ensure directory exists
    const dir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(OUTPUT_PATH, ascii);

    // Update the ascii-art.ts module
    let currentModule = '';
    if (fs.existsSync(MODULE_PATH)) {
        currentModule = fs.readFileSync(MODULE_PATH, 'utf-8');
    }

    const exportStatement = `\nexport const LANDSCAPE_ASCII = \`\n${ascii}\n\`.trim();\n`;
    fs.writeFileSync(MODULE_PATH, currentModule + exportStatement);

    console.log(`Generated and updated module at ${MODULE_PATH}`);
}

generate().catch(console.error);
