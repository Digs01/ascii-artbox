"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageToAscii = imageToAscii;
const sharp_1 = __importDefault(require("sharp"));
const utils_1 = require("./utils");
// ─── Braille mapping ───
// Unicode Braille: U+2800 base. Each char is a 2×4 dot grid.
// Dot positions map to bits:
//   Col0 Col1
//   0x01 0x08   (row 0)
//   0x02 0x10   (row 1)
//   0x04 0x20   (row 2)
//   0x40 0x80   (row 3)
const BRAILLE_BASE = 0x2800;
const BRAILLE_DOT_MAP = [
    [0x01, 0x08], // row 0: dots 1, 4
    [0x02, 0x10], // row 1: dots 2, 5
    [0x04, 0x20], // row 2: dots 3, 6
    [0x40, 0x80], // row 3: dots 7, 8
];
// ─── Edge detection characters by angle ───
const EDGE_CHARS = {
    horizontal: '─',
    vertical: '│',
    diagRight: '╱',
    diagLeft: '╲',
    cross: '┼',
};
/**
 * Standard ASCII conversion (luminance → character).
 */
async function imageToAscii(input, options = {}) {
    const { renderMode = 'standard' } = options;
    if (renderMode === 'braille') {
        return imageToBraille(input, options);
    }
    if (renderMode === 'edge') {
        return imageToEdge(input, options);
    }
    if (renderMode === 'halfblock') {
        return imageToHalfBlock(input, options);
    }
    if (renderMode === 'silhouette') {
        return imageToSilhouette(input, options);
    }
    if (renderMode === 'kinetic') {
        return imageToKinetic(input, options);
    }
    const { width = 100, height, charset = utils_1.SIMPLE_CHARSET, invert = false, transparentColor, colorTolerance = 30, colorMode = false, posterize, clahe: useClahe = false, dither = false, } = options;
    const transparentRgb = transparentColor ? (0, utils_1.hexToRgb)(transparentColor) : null;
    const image = (0, sharp_1.default)(input);
    const metadata = await image.metadata();
    const targetWidth = width;
    const targetHeight = height || Math.floor((metadata.height / metadata.width) * width * 0.55);
    let pipeline = image.resize(targetWidth, targetHeight, { fit: 'fill' }).toColourspace('srgb');
    if (useClahe)
        pipeline = pipeline.clahe({ width: 3, height: 3 });
    if (options.sharpen)
        pipeline = pipeline.sharpen();
    if (options.blur)
        pipeline = pipeline.blur(options.blur);
    const { data, info } = await pipeline
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    // Build pixel arrays
    const pixels = [];
    const lumGrid = [];
    for (let i = 0; i < w * h; i++) {
        const offset = i * 4;
        let r = data[offset];
        let g = data[offset + 1];
        let b = data[offset + 2];
        const a = data[offset + 3];
        if (posterize && posterize >= 2) {
            r = (0, utils_1.posterizeChannel)(r, posterize);
            g = (0, utils_1.posterizeChannel)(g, posterize);
            b = (0, utils_1.posterizeChannel)(b, posterize);
        }
        pixels.push({ r, g, b, a });
        let lum = (0, utils_1.getLuminance)(r, g, b);
        if (options.noise && options.noise > 0) {
            lum += (Math.random() - 0.5) * options.noise * 2;
        }
        lumGrid.push(lum);
    }
    // Apply Floyd-Steinberg dithering on luminance grid
    if (dither) {
        const levels = charset.length;
        const step = 255 / (levels - 1);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                const oldLum = lumGrid[idx];
                const newLum = Math.round(Math.round(oldLum / step) * step);
                const error = oldLum - newLum;
                lumGrid[idx] = newLum;
                // Distribute error to neighbors
                if (x + 1 < w)
                    lumGrid[idx + 1] += error * 7 / 16;
                if (y + 1 < h && x - 1 >= 0)
                    lumGrid[(y + 1) * w + x - 1] += error * 3 / 16;
                if (y + 1 < h)
                    lumGrid[(y + 1) * w + x] += error * 5 / 16;
                if (y + 1 < h && x + 1 < w)
                    lumGrid[(y + 1) * w + x + 1] += error * 1 / 16;
            }
        }
    }
    // Build ASCII string
    let ascii = '';
    for (let i = 0; i < w * h; i++) {
        const { r, g, b, a } = pixels[i];
        let char = ' ';
        if (a < 10) {
            char = ' ';
        }
        else if (transparentRgb) {
            const dist = Math.sqrt(Math.pow(r - transparentRgb.r, 2) +
                Math.pow(g - transparentRgb.g, 2) +
                Math.pow(b - transparentRgb.b, 2));
            if (dist < colorTolerance) {
                char = ' ';
            }
            else {
                const lum = Math.max(0, Math.min(255, lumGrid[i]));
                char = (0, utils_1.getGlyph)(lum, charset, invert);
            }
        }
        else {
            const lum = Math.max(0, Math.min(255, lumGrid[i]));
            char = (0, utils_1.getGlyph)(lum, charset, invert);
        }
        if ((colorMode || options.palette) && char !== ' ') {
            let finalR = r, finalG = g, finalB = b;
            if (options.palette) {
                const pColor = (0, utils_1.getColorFromPalette)((0, utils_1.getLuminance)(r, g, b), options.palette);
                if (pColor) {
                    finalR = pColor.r;
                    finalG = pColor.g;
                    finalB = pColor.b;
                }
            }
            ascii += `<span style="color:rgb(${finalR},${finalG},${finalB})">${char}</span>`;
        }
        else {
            ascii += char;
        }
        if ((i + 1) % w === 0) {
            ascii += '\n';
        }
    }
    return ascii;
}
/**
 * Braille character conversion.
 * Each Braille character represents a 2×4 block of pixels, giving 8× resolution.
 * Pixels above the luminance threshold become filled dots.
 */
async function imageToBraille(input, options = {}) {
    const { width = 100, height, invert = false, colorMode = false, transparentColor, colorTolerance = 30, posterize, clahe: useClahe = false, } = options;
    const transparentRgb = transparentColor ? (0, utils_1.hexToRgb)(transparentColor) : null;
    const image = (0, sharp_1.default)(input);
    const metadata = await image.metadata();
    // Each braille char = 2 cols × 4 rows of pixels
    // So we need pixelWidth = charWidth * 2, pixelHeight = charHeight * 4
    const charCols = width;
    const pixelWidth = charCols * 2;
    const aspectRatio = metadata.height / metadata.width;
    const charRows = height || Math.floor(aspectRatio * charCols * 0.5); // braille chars are ~square in aspect
    const pixelHeight = charRows * 4;
    let pipeline = image.resize(pixelWidth, pixelHeight, { fit: 'fill' }).toColourspace('srgb');
    if (useClahe)
        pipeline = pipeline.clahe({ width: 3, height: 3 });
    if (options.sharpen)
        pipeline = pipeline.sharpen();
    if (options.blur)
        pipeline = pipeline.blur(options.blur);
    const { data, info } = await pipeline
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    const getPixel = (x, y) => {
        if (x >= info.width || y >= info.height)
            return { r: 0, g: 0, b: 0, a: 0, lum: 0 };
        const offset = (y * info.width + x) * 4;
        let r = data[offset];
        let g = data[offset + 1];
        let b = data[offset + 2];
        const a = data[offset + 3];
        if (posterize && posterize >= 2) {
            r = (0, utils_1.posterizeChannel)(r, posterize);
            g = (0, utils_1.posterizeChannel)(g, posterize);
            b = (0, utils_1.posterizeChannel)(b, posterize);
        }
        let lum = (0, utils_1.getLuminance)(r, g, b);
        if (options.noise && options.noise > 0) {
            lum += (Math.random() - 0.5) * options.noise * 2;
        }
        return { r, g, b, a, lum };
    };
    let result = '';
    const threshold = 128;
    for (let charY = 0; charY < charRows; charY++) {
        for (let charX = 0; charX < charCols; charX++) {
            let brailleCode = 0;
            let totalR = 0, totalG = 0, totalB = 0, colorPixels = 0;
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 2; col++) {
                    const px = charX * 2 + col;
                    const py = charY * 4 + row;
                    const pixel = getPixel(px, py);
                    if (pixel.a < 10)
                        continue;
                    // Check transparent color
                    if (transparentRgb) {
                        const dist = Math.sqrt(Math.pow(pixel.r - transparentRgb.r, 2) +
                            Math.pow(pixel.g - transparentRgb.g, 2) +
                            Math.pow(pixel.b - transparentRgb.b, 2));
                        if (dist < colorTolerance)
                            continue;
                    }
                    const isDot = invert ? pixel.lum >= threshold : pixel.lum < threshold;
                    if (isDot) {
                        brailleCode |= BRAILLE_DOT_MAP[row][col];
                    }
                    // Accumulate color for colorMode
                    totalR += pixel.r;
                    totalG += pixel.g;
                    totalB += pixel.b;
                    colorPixels++;
                }
            }
            const char = String.fromCharCode(BRAILLE_BASE + brailleCode);
            if ((colorMode || options.palette) && brailleCode !== 0 && colorPixels > 0) {
                let finalR = Math.round(totalR / colorPixels);
                let finalG = Math.round(totalG / colorPixels);
                let finalB = Math.round(totalB / colorPixels);
                if (options.palette) {
                    const pColor = (0, utils_1.getColorFromPalette)((0, utils_1.getLuminance)(finalR, finalG, finalB), options.palette);
                    if (pColor) {
                        finalR = pColor.r;
                        finalG = pColor.g;
                        finalB = pColor.b;
                    }
                }
                result += `<span style="color:rgb(${finalR},${finalG},${finalB})">${char}</span>`;
            }
            else {
                result += char;
            }
        }
        result += '\n';
    }
    return result;
}
/**
 * Edge detection conversion using Sobel operator.
 * Maps edge direction to line characters for a sketch/contour effect.
 */
async function imageToEdge(input, options = {}) {
    const { width = 100, height, invert = false, colorMode = false, posterize, clahe: useClahe = false, edgeThreshold = invert ? 20 : 30, } = options;
    const image = (0, sharp_1.default)(input);
    const metadata = await image.metadata();
    const targetWidth = width;
    const targetHeight = height || Math.floor((metadata.height / metadata.width) * width * 0.55);
    let pipeline = image.resize(targetWidth, targetHeight, { fit: 'fill' }).toColourspace('srgb');
    if (useClahe)
        pipeline = pipeline.clahe({ width: 3, height: 3 });
    if (options.sharpen)
        pipeline = pipeline.sharpen();
    if (options.blur)
        pipeline = pipeline.blur(options.blur);
    const { data, info } = await pipeline
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    // Build luminance grid
    const lum = [];
    for (let y = 0; y < info.height; y++) {
        lum[y] = [];
        for (let x = 0; x < info.width; x++) {
            const offset = (y * info.width + x) * 4;
            let r = data[offset], g = data[offset + 1], b = data[offset + 2];
            if (posterize && posterize >= 2) {
                r = (0, utils_1.posterizeChannel)(r, posterize);
                g = (0, utils_1.posterizeChannel)(g, posterize);
                b = (0, utils_1.posterizeChannel)(b, posterize);
            }
            lum[y][x] = (0, utils_1.getLuminance)(r, g, b);
        }
    }
    const getLum = (x, y) => {
        if (x < 0 || x >= info.width || y < 0 || y >= info.height)
            return 0;
        return lum[y][x];
    };
    // Sobel kernels
    // Gx: horizontal gradient (vertical edges) Gy: vertical gradient (horizontal edges)
    let result = '';
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            // Sobel X (detects vertical edges)
            const gx = -1 * getLum(x - 1, y - 1) + 1 * getLum(x + 1, y - 1) +
                -2 * getLum(x - 1, y) + 2 * getLum(x + 1, y) +
                -1 * getLum(x - 1, y + 1) + 1 * getLum(x + 1, y + 1);
            // Sobel Y (detects horizontal edges)
            const gy = -1 * getLum(x - 1, y - 1) + -2 * getLum(x, y - 1) + -1 * getLum(x + 1, y - 1) +
                1 * getLum(x - 1, y + 1) + 2 * getLum(x, y + 1) + 1 * getLum(x + 1, y + 1);
            const magnitude = Math.sqrt(gx * gx + gy * gy);
            let char = ' ';
            if (magnitude > edgeThreshold) {
                // Determine edge direction
                const angle = Math.atan2(gy, gx) * (180 / Math.PI);
                const absAngle = ((angle % 180) + 180) % 180; // Normalize to 0-180
                if (absAngle < 22.5 || absAngle >= 157.5) {
                    char = EDGE_CHARS.vertical; // vertical edge → vertical char
                }
                else if (absAngle < 67.5) {
                    char = EDGE_CHARS.diagRight;
                }
                else if (absAngle < 112.5) {
                    char = EDGE_CHARS.horizontal; // horizontal edge → horizontal char
                }
                else {
                    char = EDGE_CHARS.diagLeft;
                }
            }
            if ((colorMode || options.palette) && char !== ' ') {
                const offset = (y * info.width + x) * 4;
                let finalR = data[offset];
                let finalG = data[offset + 1];
                let finalB = data[offset + 2];
                if (options.palette) {
                    const pColor = (0, utils_1.getColorFromPalette)((0, utils_1.getLuminance)(finalR, finalG, finalB), options.palette);
                    if (pColor) {
                        finalR = pColor.r;
                        finalG = pColor.g;
                        finalB = pColor.b;
                    }
                }
                result += `<span style="color:rgb(${finalR},${finalG},${finalB})">${char}</span>`;
            }
            else {
                result += char;
            }
        }
        result += '\n';
    }
    return result;
}
/**
 * Half-Block Pixel Art.
 * Uses Unicode ▀ with both foreground (top pixel) and background (bottom pixel) colors.
 * This doubles vertical resolution — each character cell renders 2 pixels.
 * Always outputs HTML.
 */
async function imageToHalfBlock(input, options) {
    const { width = 100, height, posterize, clahe: useClahe = false, } = options;
    const image = (0, sharp_1.default)(input);
    const metadata = await image.metadata();
    const targetWidth = width;
    // Double vertical resolution: each char = 2 rows of pixels
    const rawHeight = height
        ? height * 2
        : Math.floor((metadata.height / metadata.width) * width * 1.1);
    const targetHeight = rawHeight % 2 === 0 ? rawHeight : rawHeight + 1; // Ensure even
    let pipeline = image.resize(targetWidth, targetHeight, { fit: 'fill' }).toColourspace('srgb');
    if (useClahe)
        pipeline = pipeline.clahe({ width: 3, height: 3 });
    if (options.sharpen)
        pipeline = pipeline.sharpen();
    if (options.blur)
        pipeline = pipeline.blur(options.blur);
    const { data, info } = await pipeline
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    const getPixel = (x, y) => {
        const offset = (y * w + x) * 4;
        let r = data[offset], g = data[offset + 1], b = data[offset + 2];
        if (posterize && posterize >= 2) {
            r = (0, utils_1.posterizeChannel)(r, posterize);
            g = (0, utils_1.posterizeChannel)(g, posterize);
            b = (0, utils_1.posterizeChannel)(b, posterize);
        }
        let lum = (0, utils_1.getLuminance)(r, g, b);
        if (options.noise && options.noise > 0) {
            lum += (Math.random() - 0.5) * options.noise * 2;
        }
        return { r, g, b, lum };
    };
    let result = '';
    // Process 2 rows at a time
    for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x++) {
            const top = getPixel(x, y);
            const bot = (y + 1 < h) ? getPixel(x, y + 1) : top;
            let topColor = top;
            let botColor = bot;
            if (options.palette) {
                const pTop = (0, utils_1.getColorFromPalette)((0, utils_1.getLuminance)(top.r, top.g, top.b), options.palette);
                const pBot = (0, utils_1.getColorFromPalette)((0, utils_1.getLuminance)(bot.r, bot.g, bot.b), options.palette);
                if (pTop)
                    topColor = pTop;
                if (pBot)
                    botColor = pBot;
            }
            result += `<span style="color:rgb(${topColor.r},${topColor.g},${topColor.b});background:rgb(${botColor.r},${botColor.g},${botColor.b})">\u2580</span>`;
        }
        result += '\n';
    }
    return result;
}
/**
 * Negative Space / Silhouette.
 * Dense characters for bright areas, empty space for dark areas.
 * Creates a stencil/cutout effect. Uses Otsu's method for auto-thresholding.
 */
async function imageToSilhouette(input, options) {
    const { width = 100, height, charset = utils_1.SIMPLE_CHARSET, invert = false, colorMode = false, posterize, clahe: useClahe = false, } = options;
    const image = (0, sharp_1.default)(input);
    const metadata = await image.metadata();
    const targetWidth = width;
    const targetHeight = height || Math.floor((metadata.height / metadata.width) * width * 0.55);
    let pipeline = image.resize(targetWidth, targetHeight, { fit: 'fill' });
    // Force sRGB (8-bit) to ensure CLAHE works
    pipeline = pipeline.toColourspace('srgb');
    if (useClahe)
        pipeline = pipeline.clahe({ width: 3, height: 3 });
    if (options.sharpen)
        pipeline = pipeline.sharpen();
    if (options.blur)
        pipeline = pipeline.blur(options.blur);
    const { data, info } = await pipeline
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;
    // Build luminance values and compute Otsu threshold
    const lums = [];
    const pixels = [];
    for (let i = 0; i < w * h; i++) {
        const offset = i * 4;
        let r = data[offset], g = data[offset + 1], b = data[offset + 2];
        const a = data[offset + 3];
        if (posterize && posterize >= 2) {
            r = (0, utils_1.posterizeChannel)(r, posterize);
            g = (0, utils_1.posterizeChannel)(g, posterize);
            b = (0, utils_1.posterizeChannel)(b, posterize);
        }
        pixels.push({ r, g, b, a });
        let lum = (0, utils_1.getLuminance)(r, g, b);
        if (options.noise && options.noise > 0) {
            lum += (Math.random() - 0.5) * options.noise * 2;
        }
        lums.push(lum);
    }
    // Otsu's threshold
    const histogram = new Array(256).fill(0);
    for (const l of lums)
        histogram[Math.round(l)]++;
    const total = lums.length;
    let sum = 0;
    for (let i = 0; i < 256; i++)
        sum += i * histogram[i];
    let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0)
            continue;
        const wF = total - wB;
        if (wF === 0)
            break;
        sumB += t * histogram[t];
        const meanB = sumB / wB;
        const meanF = (sum - sumB) / wF;
        const variance = wB * wF * (meanB - meanF) * (meanB - meanF);
        if (variance > maxVariance) {
            maxVariance = variance;
            threshold = t;
        }
    }
    // The fill character — last char in charset (densest)
    const fillChar = charset[charset.length - 1];
    let result = '';
    for (let i = 0; i < w * h; i++) {
        const { r, g, b, a } = pixels[i];
        const lum = lums[i];
        let char;
        if (a < 10) {
            char = ' ';
        }
        else {
            // Silhouette: bright → fill, dark → space (invert flips this)
            const isBright = invert ? lum < threshold : lum >= threshold;
            char = isBright ? fillChar : ' ';
        }
        if ((colorMode || options.palette) && char !== ' ') {
            let finalR = r, finalG = g, finalB = b;
            if (options.palette) {
                const pColor = (0, utils_1.getColorFromPalette)((0, utils_1.getLuminance)(r, g, b), options.palette);
                if (pColor) {
                    finalR = pColor.r;
                    finalG = pColor.g;
                    finalB = pColor.b;
                }
            }
            result += `<span style="color:rgb(${finalR},${finalG},${finalB})">${char}</span>`;
        }
        else {
            result += char;
        }
        if ((i + 1) % w === 0) {
            result += '\n';
        }
    }
    return result;
}
/**
 * Kinetic Typography Rendering.
 * Maps brightness to 3D CSS transforms and inline character sizing.
 */
async function imageToKinetic(input, options) {
    const { width = 80, height, invert = false, overlayText, colorMode = false, } = options;
    const word = overlayText && overlayText.length > 0 ? overlayText : "KINETIC";
    const image = (0, sharp_1.default)(input);
    const metadata = await image.metadata();
    const targetWidth = width;
    const targetHeight = height || Math.floor((metadata.height / metadata.width) * width * 0.55);
    let pipeline = image.resize(targetWidth, targetHeight, { fit: 'fill' }).toColourspace('srgb');
    if (options.clahe)
        pipeline = pipeline.clahe({ width: 3, height: 3 });
    if (options.sharpen)
        pipeline = pipeline.sharpen();
    if (options.blur)
        pipeline = pipeline.blur(options.blur);
    const { data, info } = await pipeline
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });
    let result = '';
    let charIndex = 0;
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const offset = (y * info.width + x) * 4;
            const r = data[offset], g = data[offset + 1], b = data[offset + 2], a = data[offset + 3];
            if (a < 10) {
                result += ' ,0,1,0,0,0,0|';
                charIndex++;
                continue;
            }
            let lum = (0, utils_1.getLuminance)(r, g, b);
            if (invert)
                lum = 255 - lum;
            // Map luminance to 3D parameters curve
            const normalizedLum = lum / 255;
            const curve = Math.pow(normalizedLum, 1.5);
            const scale = 0.5 + (curve * 2.5); // 0.5 to 3.0
            const z = (curve * 200) - 50; // -50px to 150px
            const opacity = 0.1 + (curve * 0.9); // 0.1 to 1.0
            let finalR = r, finalG = g, finalB = b;
            if (colorMode || options.palette) {
                if (options.palette) {
                    const pColor = (0, utils_1.getColorFromPalette)((0, utils_1.getLuminance)(r, g, b), options.palette);
                    if (pColor) {
                        finalR = pColor.r;
                        finalG = pColor.g;
                        finalB = pColor.b;
                    }
                }
            }
            else {
                finalR = 255;
                finalG = 255;
                finalB = 255; // Default white
            }
            const char = word[charIndex % word.length];
            const finalChar = char === ' ' ? '&nbsp;' : char;
            // Encode the 3D data efficiently instead of massive HTML spans
            // Format: char,z,scale,opacity,r,g,b|
            if (opacity < 0.15) {
                result += finalChar + ',0,1,0,0,0,0|'; // Invisible
            }
            else {
                result += `${finalChar},${z.toFixed(1)},${scale.toFixed(2)},${opacity.toFixed(2)},${finalR},${finalG},${finalB}|`;
            }
            charIndex++;
        }
        result += '\n'; // Keep newlines for row splitting
    }
    return result;
}
