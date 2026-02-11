
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
    frames: string[];
    tags: string[];
}

function saveAnimation(id: string, frames: string[], fps: number = 10, tags: string[] = []) {
    const dir = path.join(DIST_DIR, id);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const frameFiles = frames.map((content, idx) => {
        const filename = `${idx}.txt`;
        fs.writeFileSync(path.join(dir, filename), content);
        return filename;
    });

    const manifest: AnimationManifest = {
        name: id.replace(/-/g, ' '),
        fps,
        loop: true,
        frames: frameFiles,
        tags: [...tags, 'ui', 'interaction']
    };

    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(`Generated ${id} (${frames.length} frames)`);
}

// --- Utils ---
const BLOCK_RAMP = "█▓▒░ ";
function getChar(v: number) {
    const val = Math.max(0, Math.min(1, v));
    const idx = Math.floor(val * (BLOCK_RAMP.length - 1));
    return BLOCK_RAMP[idx];
}

// 1. HAMBURGER MENU -> CLOSE (Morph)
// 3 lines -> X
function generateMenuClose() {
    const W = 20, H = 14, FRAMES = 12;
    const frames = [];

    for (let f = 0; f < FRAMES; f++) {
        let frame = '';
        const t = f / (FRAMES - 1); // 0 to 1

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let val = 1; // Empty

                // Lines at y=3, 7, 11
                // Transition to X:
                // Top line (y=3) rotates to diagonal
                // Bottom line (y=11) rotates to diagonal
                // Middle line (y=7) fades out

                // Center is (10, 7)
                const cx = 10, cy = 7;

                // Line 1 (Top) -> Diagonal 1
                // Start: y=3. End: y = x/W*H (approx)
                // Let's do simple interpolation of points

                // Top line: (0,3)..(20,3) -> (2,2)..(18,12)
                const y1_start = 3, y1_end_left = 2, y1_end_right = 12;
                const currentY1_left = y1_start + (y1_end_left - y1_start) * t;
                const currentY1_right = y1_start + (y1_end_right - y1_start) * t;
                const expectedY1 = currentY1_left + (currentY1_right - currentY1_left) * (x / W);

                if (Math.abs(y - expectedY1) < 1) val = 0;

                // Bottom line: (0,11)..(20,11) -> (2,12)..(18,2)
                const y3_start = 11, y3_end_left = 12, y3_end_right = 2;
                const currentY3_left = y3_start + (y3_end_left - y3_start) * t;
                const currentY3_right = y3_start + (y3_end_right - y3_start) * t;
                const expectedY3 = currentY3_left + (currentY3_right - currentY3_left) * (x / W);

                if (Math.abs(y - expectedY3) < 1) val = 0;

                // Middle line: Fades out/Shrinks
                if (t < 0.5 && Math.abs(y - 7) < 0.5) {
                    // Shrink width
                    if (Math.abs(x - 10) < (10 * (1 - t * 2))) val = 0;
                }

                frame += getChar(val);
            }
            frame += '\n';
        }
        frames.push(frame);
    }
    // Ping pong
    const fullFrames = [...frames, ...frames.slice().reverse()];
    saveAnimation('ui-menu-close', fullFrames, 12, ['menu', 'icon']);
}

// 2. CHEVRON (Down -> Up)
function generateChevron() {
    const W = 20, H = 10, FRAMES = 12;
    const frames = [];

    for (let f = 0; f < FRAMES; f++) {
        let frame = '';
        const t = f / (FRAMES - 1);
        // V shape. Tip y moves from 8 to 2.
        // Arms rotate.

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let val = 1;
                const cx = 10;
                const dx = Math.abs(x - cx);

                // V shape equation: y = tipY - slope * dx
                // Start (Down arrow): Tip at 8. y = 8 - 0.5*dx
                // End (Up arrow): Tip at 2. y = 2 + 0.5*dx

                // Interpolate slope: -0.5 to 0.5
                // Interpolate tip: 8 to 2

                const slope = -0.6 + (1.2 * t); // -0.6 -> 0.6
                const tipY = 8 - (6 * t); // 8 -> 2

                const expectedY = tipY + slope * dx;

                if (Math.abs(y - expectedY) < 0.8 && dx < 8) val = 0;

                frame += getChar(val);
            }
            frame += '\n';
        }
        frames.push(frame);
    }
    const fullFrames = [...frames, ...frames.slice().reverse()];
    saveAnimation('ui-chevron-toggle', fullFrames, 15, ['arrow', 'icon']);
}

// 3. TOGGLE SWITCH (Off -> On)
function generateToggle() {
    const W = 16, H = 8, FRAMES = 10;
    const frames = [];

    for (let f = 0; f < FRAMES; f++) {
        let frame = '';
        const t = f / (FRAMES - 1); // 0 to 1

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let val = 1;

                // Track (Rounded Rect)
                // Center y=4. Width 12.
                // Circle at left (4,4) or right (12,4)

                // Draw track
                if (y > 2 && y < 6 && x > 2 && x < 14) {
                    val = 0.5; // Dim track
                }

                // Draw Knob
                const knobX = 4 + (8 * t);
                const dist = Math.sqrt((x - knobX) ** 2 + (y - 4) ** 2);
                if (dist < 2.5) val = 0; // Solid knob

                frame += getChar(val);
            }
            frame += '\n';
        }
        frames.push(frame);
    }
    // Hold state
    const hold = new Array(5).fill(frames[frames.length - 1]);
    const startHold = new Array(5).fill(frames[0]);

    saveAnimation('ui-toggle', [...startHold, ...frames, ...hold, ...frames.slice().reverse()], 15, ['toggle', 'switch']);
}

// 4. SEARCH (Magnify -> Bar)
function generateSearch() {
    const W = 25, H = 8, FRAMES = 12;
    const frames = [];

    for (let f = 0; f < FRAMES; f++) {
        let frame = '';
        const t = f / (FRAMES - 1);

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let val = 1;

                // Circle morphs to Left Bracket '[' 
                // Handle morphs to Bottom/Top Lines

                // Easier: Magnifying glass moves left, handle disappears, bar grows right

                const iconX = 12 - (10 * t); // Moves from center to left

                if (t < 0.5) {
                    // Draw Glass
                    const dist = Math.sqrt((x - iconX) ** 2 + (y - 3) ** 2);
                    if (Math.abs(dist - 2.5) < 0.6) val = 0; // Ring

                    // Handle
                    if (x > iconX + 1 && x < iconX + 4 && y > 4 && Math.abs(x - y - iconX + 2) < 1) val = 0;
                } else {
                    // Draw Bar
                    // Left cap ( (half circle)
                    const barW = (t - 0.5) * 2 * 18; // 0 to 18

                    if (x < 4 && x > 2) {
                        const dist = Math.sqrt((x - 4) ** 2 + (y - 3.5) ** 2);
                        if (Math.abs(dist - 2.5) < 0.8 && x < 4) val = 0;
                    }
                    // Top/Bottom lines
                    if (x >= 4 && x < 4 + barW) {
                        if (Math.abs(y - 1) < 0.6) val = 0;
                        if (Math.abs(y - 6) < 0.6) val = 0;
                    }
                }

                frame += getChar(val);
            }
            frame += '\n';
        }
        frames.push(frame);
    }
    const fullFrames = [...frames, ...frames.slice().reverse()];
    saveAnimation('ui-search-expand', fullFrames, 15, ['search', 'input']);
}

// 5. TRASH (Lid Opening)
function generateTrash() {
    const W = 16, H = 16, FRAMES = 8;
    const frames = [];

    for (let f = 0; f < FRAMES; f++) {
        let frame = '';
        const t = Math.sin((f / FRAMES) * Math.PI); // 0 -> 1 -> 0

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                let val = 1;

                // Bin Body (Static)
                if (y > 6 && y < 14 && x > 4 && x < 12) {
                    if (x === 5 || x === 11 || y === 13) val = 0; // Outline
                    if (y < 13 && x % 2 === 0 && x > 5 && x < 11) val = 0.5; // Ribs
                }

                // Lid (Rotates)
                // Pivot at (4, 6)
                // Angle 0 to -45 deg
                const angle = -t * 0.8;

                // Line from (3,6) to (13,6) rotated
                const lx = x - 3;
                const ly = y - 6;
                // Rotate pt back
                const rx = lx * Math.cos(-angle) - ly * Math.sin(-angle);
                const ry = lx * Math.sin(-angle) + ly * Math.cos(-angle);

                if (ry > -0.5 && ry < 0.5 && rx > 0 && rx < 10) val = 0;
                // Handle on lid
                if (ry > -2.5 && ry < -0.5 && rx > 4 && rx < 6) val = 0;

                frame += getChar(val);
            }
            frame += '\n';
        }
        frames.push(frame);
    }
    saveAnimation('ui-trash-bin', frames, 10, ['trash', 'delete']);
}

console.log('Generating UI Icons...');
generateMenuClose();
generateChevron();
generateToggle();
generateSearch();
generateTrash();
console.log('Done.');
