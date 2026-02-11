
import fs from 'fs';
import path from 'path';

const DIST_DIR = path.join(process.cwd(), 'dist');

if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
}

interface AnimationManifest {
    name: string;
    fps: number;
    loop: boolean;
    frames: string[]; // filenames
    tags: string[];
}

function saveAnimation(id: string, frames: string[], fps: number = 12, tags: string[] = []) {
    const dir = path.join(DIST_DIR, id);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Save frames
    const frameFiles = frames.map((content, idx) => {
        const filename = `${idx}.txt`;
        fs.writeFileSync(path.join(dir, filename), content);
        return filename;
    });

    // Save manifest
    const manifest: AnimationManifest = {
        name: id.replace(/-/g, ' '),
        fps,
        loop: true,
        frames: frameFiles,
        tags
    };

    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Generated ${id} (${frames.length} frames)`);
}

// --- Utils ---

// Standard taller aspect ratio correction for terminal fonts
const ASPECT_RATIO = 0.5;

// High Quality Block Ramp (from dense to light)
const BLOCK_RAMP = "█▓▒░ ";
// const BLOCK_RAMP = "@%#*+=-:. "; // Classic alternative

function getChar(v: number) {
    // v is 0..1
    // Clamp v
    const val = Math.max(0, Math.min(1, v));
    // Map to ramp
    const idx = Math.floor(val * (BLOCK_RAMP.length - 1));
    return BLOCK_RAMP[idx];
}

interface GenOptions {
    width?: number;
    height?: number;
    frames?: number;
}

// --- Generators ---

// 1. SMOOTH WAVES (High Res)
function generateHiResWaves() {
    const W = 80;
    const H = 40;
    const FRAMES = 60; // Smooth 60fps loop

    // 1. Sine Field - Smooth gradient waves
    const id = 'wave-smooth-field';
    const frames = [];
    for (let f = 0; f < FRAMES; f++) {
        let frame = '';
        const t = (f / FRAMES) * Math.PI * 2;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                // Normalize coords -1 to 1
                const nx = (x / W) * 2 - 1;
                const ny = ((y / H) * 2 - 1) / ASPECT_RATIO;

                // Distance from center
                const d = Math.sqrt(nx * nx + ny * ny);

                // Multiple overlapping sine waves
                let val = Math.sin(nx * 3 + t) * Math.sin(ny * 3 + t);
                val += Math.sin(d * 5 - t * 2) * 0.5;

                // Normalize result roughly to 0..1
                val = (val + 1.5) / 3;
                frame += getChar(val);
            }
            frame += '\n';
        }
        frames.push(frame);
    }
    saveAnimation(id, frames, 24, ['wave', 'abstract', 'smooth', 'hq']);
}

// 2. METABALLS (Blobby fluid)
function generateMetaballs() {
    const W = 80;
    const H = 40;
    const FRAMES = 40;

    const id = 'fluid-blobs';
    const frames = [];

    // 3 Blobs moving in loops
    const blobs = [
        { r: 0.3, speed: 1, offset: 0 },
        { r: 0.4, speed: -1.2, offset: 2 },
        { r: 0.25, speed: 2, offset: 4 }
    ];

    for (let f = 0; f < FRAMES; f++) {
        let frame = '';
        const t = (f / FRAMES) * Math.PI * 2;

        // Update blob positions
        const blobPos = blobs.map(b => ({
            x: Math.cos(t * b.speed + b.offset) * 0.5,
            y: Math.sin(t * b.speed + b.offset) * 0.5,
            r: b.r
        }));

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const nx = (x / W) * 2 - 1;
                const ny = ((y / H) * 2 - 1) / ASPECT_RATIO;

                let sum = 0;
                // Metaball field function: sum(r / distance)
                blobPos.forEach(b => {
                    const dx = nx - b.x;
                    const dy = ny - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    sum += b.r / Math.max(0.01, dist); // Avoid div by zero
                });

                // Thresholding with soft edge
                // We want sum ~ 1.0 to be the edge
                // Map range roughly 0..1 for char ramp
                // 1.0 -> 0 (Solid), <0.5 -> 1 (Empty)

                let val = 1 - Math.min(1, Math.max(0, sum - 0.5));
                // Invert logic for our ramp (0=Solid, 1=Empty) -> Wait, getChar(0) is Solid
                // Actually my getChar(0) is '█' (Solid), getChar(1) is ' ' (Empty)
                // So High Value in Sum (Inside blob) should map to 0

                const intensity = Math.min(1, sum); // 0..1+
                // We want high intensity -> 0 index
                val = 1 - Math.min(1, intensity);

                frame += getChar(val);
            }
            frame += '\n';
        }
        frames.push(frame);
    }
    saveAnimation(id, frames, 20, ['fluid', 'blob', 'metaball', 'hq']);
}

// 3. CUBE (Rotating 3D Wireframe - Clean)
function generateCube() {
    const W = 80;
    const H = 40;
    const FRAMES = 60;
    const id = 'cube-wireframe-hq';

    const nodes = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // back face
        [4, 5], [5, 6], [6, 7], [7, 4], // front face
        [0, 4], [1, 5], [2, 6], [3, 7]  // connecting lines
    ];

    const frames = [];
    for (let f = 0; f < FRAMES; f++) {
        // Initialize buffer
        const buffer = new Array(W * H).fill(' ');

        const t = (f / FRAMES) * Math.PI * 2;

        // Rotation Matrix (Y and X axis)
        const scale = 1.5; // size
        const rotY = t;
        const rotX = t * 0.5;

        // Project and Draw Edges
        const projected = nodes.map(p => {
            // Rotate Y
            let x = p[0] * Math.cos(rotY) - p[2] * Math.sin(rotY);
            let z = p[0] * Math.sin(rotY) + p[2] * Math.cos(rotY);
            let y = p[1];

            // Rotate X
            let y2 = y * Math.cos(rotX) - z * Math.sin(rotX);
            let z2 = y * Math.sin(rotX) + z * Math.cos(rotX);

            // Project (Perspective)
            const dist = 4;
            const zFactor = 1 / (dist - z2);

            const px = x * zFactor * scale;
            const py = y2 * zFactor * scale; // Keep aspect ratio logic simple here

            return {
                x: Math.floor((px + 1) * W / 2),
                y: Math.floor(((py * 0.5) + 1) * H / 2) // * 0.5 for aspect ratio
            };
        });

        // Bresenham line drawing
        const drawLine = (p1: { x: number, y: number }, p2: { x: number, y: number }) => {
            let x0 = p1.x, y0 = p1.y;
            let x1 = p2.x, y1 = p2.y;

            const dx = Math.abs(x1 - x0);
            const dy = Math.abs(y1 - y0);
            const sx = (x0 < x1) ? 1 : -1;
            const sy = (y0 < y1) ? 1 : -1;
            let err = dx - dy;

            while (true) {
                if (x0 >= 0 && x0 < W && y0 >= 0 && y0 < H) {
                    buffer[y0 * W + x0] = '#'; // Solid line
                }
                if (x0 === x1 && y0 === y1) break;
                const e2 = 2 * err;
                if (e2 > -dy) { err -= dy; x0 += sx; }
                if (e2 < dx) { err += dx; y0 += sy; }
            }
        };

        edges.forEach(([i, j]) => drawLine(projected[i], projected[j]));

        // Convert to string
        let frame = '';
        for (let y = 0; y < H; y++) {
            frame += buffer.slice(y * W, (y + 1) * W).join('') + '\n';
        }
        frames.push(frame);
    }
    saveAnimation(id, frames, 24, ['cube', '3d', 'geo', 'hq']);
}

// 4. SCANNER (Battlestar Galactica style)
function generateScanner() {
    const W = 80;
    const H = 5; // Very short
    const FRAMES = 30;
    const id = 'cylon-scanner';

    const frames = [];
    for (let f = 0; f < FRAMES; f++) {
        let frame = '';
        // Ping pong 0 -> 1 -> 0
        const t = Math.abs((f % FRAMES) - (FRAMES / 2)) / (FRAMES / 2); // 0..1..0 triangle wave
        const center = t * W;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const dist = Math.abs(x - center);
                // Falloff
                let val = Math.max(0, 1 - dist / 10); // 1 at center, 0 at 10 units away

                // Invert for getChar (0=Solid, 1=Empty)
                val = 1 - val;
                frame += getChar(val);
            }
            frame += '\n';
        }
        frames.push(frame);
    }
    saveAnimation(id, frames, 20, ['ui', 'scanner', 'glow']);
}


// Main execution
console.log('Generating HQ procedural animations...');
generateHiResWaves();
generateMetaballs();
generateCube();
generateScanner();
console.log('Done!');
