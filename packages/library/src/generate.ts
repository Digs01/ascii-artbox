
import { imageToAscii } from '@asciiweb/core';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');

async function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        await mkdir(dir, { recursive: true });
    }
}

async function saveFrame(name: string, frameIndex: number, content: string) {
    const dir = path.join(DIST_DIR, name);
    await ensureDir(dir);
    const fileName = `${String(frameIndex).padStart(3, '0')}.txt`;
    await writeFile(path.join(dir, fileName), content);
}

async function saveManifest(name: string, data: any) {
    const dir = path.join(DIST_DIR, name);
    await ensureDir(dir);
    await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(data, null, 2));
}

// --- Generators ---

async function generateSpinner() {
    const name = 'spinner';
    const size = 50;
    const frames = 12;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const angle = (i / frames) * 2 * Math.PI;
        const buffer = Buffer.alloc(size * size * 4).fill(0); // Transparent

        // Draw a rotating line
        const cx = size / 2;
        const cy = size / 2;
        const length = size * 0.4;

        // Simple line drawing algo
        for (let r = 0; r < length; r += 0.5) {
            const x = Math.floor(cx + Math.cos(angle) * r);
            const y = Math.floor(cy + Math.sin(angle) * r);

            if (x >= 0 && x < size && y >= 0 && y < size) {
                const idx = (y * size + x) * 4;
                buffer[idx] = 255;   // R
                buffer[idx + 1] = 255; // G
                buffer[idx + 2] = 255; // B
                buffer[idx + 3] = 255; // A
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width: size, height: size, channels: 4 } })
            .png() // Convert to png to ensure alpha handling logic in core works if it expects valid image format
            .toBuffer();

        const ascii = await imageToAscii(imageBuffer, { width: 25, height: 12 }); // output size
        await saveFrame(name, i, ascii);

        // In a real manifest we might point to URLs, but here we can just list filenames
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, {
        name,
        fps: 12,
        duration: 1,
        frames: manifestFrames,
        loop: true
    });
}

async function generateLoader() {
    const name = 'loader';
    const width = 60;
    const height = 10;
    const frames = 20;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        // Draw a moving bar
        const barWidth = 15;
        const pos = Math.floor((i / frames) * (width - barWidth));

        for (let y = 0; y < height; y++) {
            for (let x = pos; x < pos + barWidth; x++) {
                const idx = (y * width + x) * 4;
                buffer[idx] = 255;
                buffer[idx + 1] = 255;
                buffer[idx + 2] = 255;
                buffer[idx + 3] = 255;
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 30, height: 5 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, {
        name,
        fps: 20,
        duration: 1,
        frames: manifestFrames,
        loop: true
    });
}

// --- New Generators ---

async function generateDots() {
    const name = 'dots';
    const width = 40;
    const height = 10;
    const frames = 12;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        // Draw 3 dots
        for (let d = 0; d < 3; d++) {
            // Pulse effect based on frame index
            const offset = d * 4;
            const active = (i + offset) % frames < frames / 2;
            const radius = active ? 3 : 1;

            const cx = 10 + d * 10;
            const cy = 5;

            // Draw circle
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    if (Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) <= radius) {
                        const idx = (y * width + x) * 4;
                        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                    }
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 5 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 8, duration: 1.5, frames: manifestFrames, loop: true, tags: ['loading', 'dots'] });
}

async function generateEqualizer() {
    const name = 'equalizer';
    const width = 40;
    const height = 20;
    const frames = 12;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        // Draw 4 bars with random heights (seeded by frame for determinism if needed, but random is okay for noise)
        for (let b = 0; b < 4; b++) {
            const h = 5 + Math.sin((i / frames) * Math.PI * 2 + b) * 5 + 5; // Height between 5 and 15
            const xStart = 5 + b * 8;

            for (let y = height - 1; y >= height - h; y--) {
                for (let x = xStart; x < xStart + 5; x++) {
                    if (y >= 0 && x < width) {
                        const idx = (y * width + x) * 4;
                        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                    }
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 12, duration: 1, frames: manifestFrames, loop: true, tags: ['audio', 'music'] });
}

async function generateSuccess() {
    const name = 'success';
    const size = 40;
    const frames = 15;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(size * size * 4).fill(0);

        // Draw Checkmark
        // Progressively draw it
        const progress = Math.min(1, i / (frames - 5)); // Finish drawing before end

        // Checkmark points: (10, 20) -> (18, 28) -> (30, 10)
        const points = [];
        // First leg
        for (let t = 0; t <= 1; t += 0.1) points.push({ x: 10 + t * 8, y: 20 + t * 8 });
        // Second leg
        for (let t = 0; t <= 1; t += 0.06) points.push({ x: 18 + t * 12, y: 28 - t * 18 });

        const drawCount = Math.floor(points.length * progress);

        for (let p = 0; p < drawCount; p++) {
            const pt = points[p];
            // Draw a thick point
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    const x = Math.floor(pt.x + dx);
                    const y = Math.floor(pt.y + dy);
                    if (x >= 0 && x < size && y >= 0 && y < size) {
                        const idx = (y * size + x) * 4;
                        buffer[idx] = 0; buffer[idx + 1] = 255; buffer[idx + 2] = 0; buffer[idx + 3] = 255; // Green
                    }
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 15, duration: 1, frames: manifestFrames, loop: false, tags: ['icon', 'status'] });
}

async function generateError() {
    const name = 'error';
    const size = 40;
    const frames = 10;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(size * size * 4).fill(0);

        // Blink effect
        if (i % 2 === 0) {
            // Draw X
            const thickness = 4;
            const padding = 10;

            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    // Diagonal 1: y = x
                    // Diagonal 2: y = size - x
                    const onDiag1 = Math.abs(x - y) < thickness;
                    const onDiag2 = Math.abs((size - x) - y) < thickness;

                    if ((onDiag1 || onDiag2) && x > padding && x < size - padding && y > padding && y < size - padding) {
                        const idx = (y * size + x) * 4;
                        buffer[idx] = 255; buffer[idx + 1] = 0; buffer[idx + 2] = 0; buffer[idx + 3] = 255; // Red
                    }
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 4, duration: 2.5, frames: manifestFrames, loop: true, tags: ['icon', 'status', 'error'] });
}

async function generateUpload() {
    const name = 'upload';
    const width = 40;
    const height = 40;
    const frames = 15;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        // Draw Arrow moving up
        const offset = Math.floor((i / frames) * 20); // Move up 20 pixels
        const arrowY = 25 - offset;

        // Draw Arrow Head
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Simple arrow shape logic
                // Center x = 20
                const relY = y - arrowY;
                const relX = Math.abs(x - 20);

                let pixel = false;

                // Head: Triangle
                if (relY >= 0 && relY < 10 && relX <= relY) {
                    // Inverted V shape actually.. wait.
                    // Tip at top.
                    // if y is arrowTip
                    // |x-20| <= (y - arrowTip)
                    // Let's refine.
                }
            }
        }

        // Easier: Draw lines
        // Vertical line
        const cx = 20;
        const cy = 20 - offset; // moving up

        // Draw only if within bounds (loop effect handled by modulo or reset)
        // Let's just draw lines
        const yStart = (frames - i) * 2; // Starts at bottom, goes up

        // Draw Arrow
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Effective Y relative to moving arrow center
                const effY = (y + i * 2) % height;

                const idx = (y * width + x) * 4;

                // Arrow shaft
                if (Math.abs(x - 20) < 2 && effY > 15 && effY < 35) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }

                // Arrow head
                if (effY <= 15 && effY > 5) {
                    const widthAtY = (effY - 5); // 0 at top, 10 at bottom of head
                    if (Math.abs(x - 20) <= widthAtY) {
                        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                    }
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 15, duration: 1, frames: manifestFrames, loop: true, tags: ['icon', 'upload'] });
}

async function generateBattery() {
    const name = 'battery';
    const width = 50;
    const height = 25;
    const frames = 10;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        // Battery Outline
        // Rect from (5, 5) to (40, 20)
        // Tip at (40, 10) to (42, 15)

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Outline
                if (x >= 5 && x <= 40 && y >= 5 && y <= 20) {
                    if (x === 5 || x === 40 || y === 5 || y === 20) {
                        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                    }
                }
                // Tip
                if (x >= 40 && x <= 42 && y >= 10 && y <= 15) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }

                // Fill
                // Level goes from 0 to 100%
                const level = (i / (frames - 1)) * 32; // max fill width 32 (40-5-something)
                if (x > 7 && x < 7 + level && y > 7 && y < 18) {
                    buffer[idx] = 0; buffer[idx + 1] = 255; buffer[idx + 2] = 0; buffer[idx + 3] = 255; // Green fill
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 25, height: 8 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 5, duration: 2, frames: manifestFrames, loop: true, tags: ['icon', 'status', 'battery'] });
}

async function generateDownload() {
    const name = 'download';
    const width = 40;
    const height = 40;
    const frames = 15;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        // Arrow moving down
        const offset = Math.floor((i / frames) * 20); // Move down 20 pixels

        // Draw Arrow
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Effective Y to simulate movement
                const effY = (y - i * 2 + height * 2) % height; // Scroll down

                const idx = (y * width + x) * 4;

                // Shaft
                if (Math.abs(x - 20) < 2 && effY > 5 && effY < 25) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }

                // Head (pointing down)
                // Tip at 35. Base at 25.
                if (effY >= 25 && effY <= 35) {
                    const widthAtY = (35 - effY); // 10 at 25, 0 at 35
                    if (Math.abs(x - 20) <= (10 - widthAtY)) { // Wait, logic reversed.
                        // Width increases as we go down? No, decreases.
                        // tip at 35. 
                        // width = 35 - effY?
                        // at 35, width 0.
                        // at 25, width 10.
                        if (Math.abs(x - 20) <= (35 - effY)) {
                            buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                        }
                    }
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 15, duration: 1, frames: manifestFrames, loop: true, tags: ['icon', 'download'] });
}

async function generateWifi() {
    const name = 'wifi';
    const width = 50;
    const height = 40;
    const frames = 4;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    const cx = 25;
    const cy = 35;

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        // Dot
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                const idx = (y * width + x) * 4;

                // Dot
                if (dist < 3) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }

                // Arcs
                if (i >= 1 && Math.abs(dist - 10) < 2 && y < cy) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }
                if (i >= 2 && Math.abs(dist - 18) < 2 && y < cy) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }
                if (i >= 3 && Math.abs(dist - 26) < 2 && y < cy) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 25, height: 12 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 2, duration: 2, frames: manifestFrames, loop: true, tags: ['icon', 'status', 'wifi'] });
}

async function generateClock() {
    const name = 'clock';
    const size = 50;
    const frames = 12; // 12 hours
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(size * size * 4).fill(0);
        const cx = 25;
        const cy = 25;
        const radius = 20;

        // Face
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (Math.abs(Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) - radius) < 1.5) {
                    const idx = (y * size + x) * 4;
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }
            }
        }

        // Hand
        const angle = (i / frames) * Math.PI * 2 - Math.PI / 2;
        for (let r = 0; r < radius - 4; r += 0.5) {
            const x = Math.floor(cx + Math.cos(angle) * r);
            const y = Math.floor(cy + Math.sin(angle) * r);
            const idx = (y * size + x) * 4;
            if (idx >= 0 && idx < buffer.length) {
                buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 4, duration: 3, frames: manifestFrames, loop: true, tags: ['icon', 'time'] });
}

async function generateHeart() {
    const name = 'heart';
    const size = 40;
    const frames = 10;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(size * size * 4).fill(0);

        // Pulse scale
        const scale = 1 + Math.sin((i / frames) * Math.PI * 2) * 0.2;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Heart equation: (x^2+y^2-1)^3 - x^2*y^3 = 0
                // Center and scale input
                const nx = (x - 20) / (10 * scale);
                const ny = -(y - 20) / (10 * scale); // flip y

                const val = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);

                if (val <= 0) {
                    const idx = (y * size + x) * 4;
                    buffer[idx] = 255; buffer[idx + 1] = 0; buffer[idx + 2] = 0; buffer[idx + 3] = 255; // Red
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 10, duration: 1, frames: manifestFrames, loop: true, tags: ['icon', 'heart', 'love'] });
}

async function generateWeather() {
    const name = 'weather';
    const width = 60;
    const height = 30;
    const frames = 20;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        const cxSun = 45;
        const cySun = 10;

        const cxCloud = 15 + (i / frames) * 10;
        const cyCloud = 15;

        // Sun
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;

                // Sun
                if (Math.sqrt((x - cxSun) ** 2 + (y - cySun) ** 2) < 8) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 0; buffer[idx + 3] = 255;
                }

                // Cloud (3 blobs)
                const dist1 = Math.sqrt((x - cxCloud) ** 2 + (y - cyCloud) ** 2);
                const dist2 = Math.sqrt((x - (cxCloud + 10)) ** 2 + (y - (cyCloud)) ** 2);
                const dist3 = Math.sqrt((x - (cxCloud + 5)) ** 2 + (y - (cyCloud - 5)) ** 2);

                if (dist1 < 8 || dist2 < 8 || dist3 < 8) {
                    // White cloud
                    buffer[idx] = 200; buffer[idx + 1] = 200; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 30, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 10, duration: 2, frames: manifestFrames, loop: true, tags: ['icon', 'weather'] });
}

async function generateSmile() {
    const name = 'smile';
    const size = 40;
    const frames = 10;
    const manifestFrames: string[] = [];

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(size * size * 4).fill(0);
        const cx = 20;
        const cy = 20;
        const radius = 15;

        // Wink logic
        const wink = i > 5;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

                // Face
                if (d < radius && d > radius - 1) { // outline
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 0; buffer[idx + 3] = 255;
                }

                // Eyes
                // Left
                if (Math.sqrt((x - 14) ** 2 + (y - 14) ** 2) < 2) {
                    buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                }
                // Right (Wink)
                if (!wink) {
                    if (Math.sqrt((x - 26) ** 2 + (y - 14) ** 2) < 2) {
                        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                    }
                } else {
                    // Draw line
                    if (x >= 24 && x <= 28 && y === 14) {
                        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                    }
                }

                // Mouth
                if (y > 20 && y < 30 && x > 10 && x < 30) {
                    // y = 25 + 0.1*(x-20)^2
                    const my = 25 + 0.05 * (x - 20) ** 2;
                    if (Math.abs(y - my) < 1) {
                        buffer[idx] = 255; buffer[idx + 1] = 255; buffer[idx + 2] = 255; buffer[idx + 3] = 255;
                    }
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 5, duration: 2, frames: manifestFrames, loop: true, tags: ['icon', 'emoji'] });
}

async function generateFire() {
    const name = 'fire';
    const width = 40;
    const height = 40;
    const frames = 10;
    const manifestFrames: string[] = [];

    // Simple cellular automaton or noise
    let firePixels = new Array(width * height).fill(0);

    console.log(`Generating ${name}...`);

    for (let i = 0; i < frames; i++) {
        const buffer = Buffer.alloc(width * height * 4).fill(0);

        // Seed bottom with random heat
        for (let x = 0; x < width; x++) {
            firePixels[(height - 1) * width + x] = Math.random() > 0.5 ? 255 : 0;
        }

        // Propagate up
        for (let y = 0; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const src = (y + 1) * width + x;
                const decay = Math.floor(Math.random() * 50);
                const temp = firePixels[src] - decay;
                firePixels[y * width + x - (Math.random() > 0.5 ? 1 : -1)] = Math.max(0, temp);
            }
        }

        // Render
        for (let p = 0; p < firePixels.length; p++) {
            if (firePixels[p] > 50) {
                const x = p % width;
                const y = Math.floor(p / width);
                // Flame shape restriction
                const dx = x - 20;
                // y grows from 40 to 0. width allows grows with y.
                if (Math.abs(dx) < (y / 2)) {
                    buffer[p * 4] = 255; buffer[p * 4 + 1] = firePixels[p]; buffer[p * 4 + 2] = 0; buffer[p * 4 + 3] = 255;
                }
            }
        }

        const imageBuffer = await sharp(buffer, { raw: { width, height, channels: 4 } }).png().toBuffer();
        const ascii = await imageToAscii(imageBuffer, { width: 20, height: 10 });
        await saveFrame(name, i, ascii);
        manifestFrames.push(`${String(i).padStart(3, '0')}.txt`);
    }

    await saveManifest(name, { name, fps: 12, duration: 1, frames: manifestFrames, loop: true, tags: ['icon', 'effect', 'fire'] });
}

async function main() {
    await generateSpinner();
    await generateLoader();
    await generateDots();
    await generateEqualizer();
    await generateSuccess();
    await generateError();
    await generateUpload();
    await generateBattery();
    await generateDownload();
    await generateWifi();
    await generateClock();
    await generateHeart();
    await generateWeather();
    await generateSmile();
    await generateFire();
    console.log('Done!');
}

main().catch(console.error);
