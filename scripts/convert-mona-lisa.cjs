const { imageToAscii } = require('../packages/core/dist/converter');
const path = require('path');
const fs = require('fs');

const imgPath = path.join(__dirname, '..', 'apps', 'web', 'tmp', 'mona_lisa.jpg');
const outDir = path.join(__dirname, '..', 'apps', 'web', 'tmp');

async function main() {
    const DENSE_CHARSET = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

    console.log('Generating HIGH DETAIL (120 cols, sharpen, dense charset)...');
    const ascii = await imageToAscii(imgPath, {
        width: 120,
        charset: DENSE_CHARSET,
        invert: false,
        sharpen: true,
    });
    const outPath = path.join(outDir, 'mona_lisa_hd.txt');
    fs.writeFileSync(outPath, ascii);
    console.log('Lines:', ascii.split('\n').length);
    console.log('Cols:', ascii.split('\n')[0].length);
}

main().catch(console.error);
