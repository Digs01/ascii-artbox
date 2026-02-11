
import fs from 'fs';
import path from 'path';

const DIST = path.join(process.cwd(), 'dist', 'weather');

if (!fs.existsSync(DIST)) {
    fs.mkdirSync(DIST, { recursive: true });
}

const W = 30;
const H = 12;

// --- ASCII Art Templates ---

const SUN = [
    "                              ",
    "         \\   |   /            ",
    "          .--+--.             ",
    "       --( O   O )--         ",
    "          (  ---  )           ",
    "       --( \\_____/ )--        ",
    "          `--+--'             ",
    "         /   |   \\            ",
    "                              ",
    "                              ",
    "                              ",
    "                              ",
];

const SUN2 = [
    "                              ",
    "          \\  |  /             ",
    "         __.--.__             ",
    "      --(       )--          ",
    "         (  \\ /  )            ",
    "      --(  / \\  )--          ",
    "         `--'--'             ",
    "          /  |  \\             ",
    "                              ",
    "                              ",
    "                              ",
    "                              ",
];

const SUN_BRIGHT = [
    "                              ",
    "      *   \\  |  /   *        ",
    "           .----.             ",
    "       --/  O  O  \\--        ",
    "         |   ---   |         ",
    "       --\\ \\_____/ /--        ",
    "           '----'             ",
    "      *   /  |  \\   *        ",
    "                              ",
    "                              ",
    "                              ",
    "                              ",
];

const CLOUD = [
    "                              ",
    "                              ",
    "          .-~~~-.             ",
    "        .~       ~.           ",
    "       /   .---.   \\          ",
    "   ~~~(  /       \\  )~~~     ",
    "       ~~~~~~~~~~~~          ",
    "                              ",
    "                              ",
    "                              ",
    "                              ",
    "                              ",
];

const CLOUD2 = [
    "                              ",
    "                              ",
    "         .-~~~~-.             ",
    "       .~        ~.           ",
    "      /   .----.   \\          ",
    "  ~~~(  /        \\  )~~~~    ",
    "      ~~~~~~~~~~~~~          ",
    "                              ",
    "                              ",
    "                              ",
    "                              ",
    "                              ",
];

function makeRain(variant: number): string[] {
    const drops = [
        [" |", "  ", " |", "  ", " |"],
        ["  ", " |", "  ", " |", "  "],
        [" |", "  ", " |", "  ", " |"],
    ];
    const d = variant % 2;
    return [
        "                              ",
        "                              ",
        "         .-~~~-.              ",
        "       .~       ~.            ",
        "      /   .---.   \\           ",
        "  ~~~(  /       \\  )~~~      ",
        "      ~~~~~~~~~~~~           ",
        `     ${drops[0][d]}  ${drops[1][d]}  ${drops[2][d]}  ${drops[0][(d + 1) % 2]}  ${drops[1][(d + 1) % 2]}      `,
        `      ${drops[2][(d + 1) % 2]}  ${drops[0][d]}  ${drops[1][(d + 1) % 2]}  ${drops[2][d]}  ${drops[0][(d + 1) % 2]}     `,
        `       ${drops[1][d]}  ${drops[2][(d + 1) % 2]}  ${drops[0][d]}  ${drops[1][(d + 1) % 2]}        `,
        "                              ",
        "                              ",
    ];
}

const LIGHTNING1 = [
    "                              ",
    "                              ",
    "         .-~~~-.              ",
    "       .~       ~.            ",
    "      /   .---.   \\           ",
    "  ~~~(  /       \\  )~~~      ",
    "      ~~~~~~/\\~~~~           ",
    "           /  \\               ",
    "          / /                  ",
    "         / /                   ",
    "          /                    ",
    "                              ",
];

const LIGHTNING2 = [
    "                              ",
    "                              ",
    "         .-~~~-.              ",
    "       .~       ~.            ",
    "      /   .---.   \\           ",
    "  ~~~(  /       \\  )~~~      ",
    "      ~~~~~\\/~~~~~           ",
    "           \\\\                 ",
    "            \\\\                ",
    "             \\                ",
    "                              ",
    "                              ",
];

const LIGHTNING_FLASH = [
    "  * * * * * * * * * * * * * * ",
    "   * * * * * * * * * * * * *  ",
    "  * * * .-~~~-. * * * * * *  ",
    "   * *.~       ~.* * * * *   ",
    "  * */   .---.   \\* * * * *  ",
    "  ~(  /       \\  )~~~* * *  ",
    "   *  ~~~~\\/~~~~~  * * * *   ",
    "  * * * * \\\\  * * * * * * *  ",
    "   * * * * \\\\  * * * * * *   ",
    "  * * * * * \\  * * * * * * * ",
    "   * * * * * * * * * * * * *  ",
    "  * * * * * * * * * * * * * * ",
];

// Pad all frames to consistent width
function pad(frame: string[]): string {
    return frame.map(line => line.padEnd(W, ' ').slice(0, W)).join('\n');
}

// Build animation sequence: Sun(8) -> Cloud(6) -> Rain(8) -> Lightning(6) = 28 frames
const frames: string[] = [];

// ☀️ SUN phase (8 frames - gentle pulse)
for (let i = 0; i < 3; i++) frames.push(pad(SUN));
for (let i = 0; i < 2; i++) frames.push(pad(SUN2));
for (let i = 0; i < 2; i++) frames.push(pad(SUN_BRIGHT));
frames.push(pad(SUN2));

// ☁️ CLOUD transition (6 frames)
for (let i = 0; i < 3; i++) frames.push(pad(CLOUD));
for (let i = 0; i < 3; i++) frames.push(pad(CLOUD2));

// 🌧️ RAIN phase (8 frames - alternating drops)
for (let i = 0; i < 8; i++) frames.push(pad(makeRain(i)));

// ⚡ LIGHTNING phase (6 frames)
frames.push(pad(LIGHTNING1));
frames.push(pad(LIGHTNING2));
frames.push(pad(LIGHTNING_FLASH));
frames.push(pad(LIGHTNING2));
frames.push(pad(LIGHTNING1));
frames.push(pad(CLOUD));

// Write frames
const frameFiles = frames.map((content, idx) => {
    const filename = `${String(idx).padStart(3, '0')}.txt`;
    fs.writeFileSync(path.join(DIST, filename), content);
    return filename;
});

// Write manifest
const manifest = {
    name: 'weather',
    fps: 4,
    duration: 7,
    frames: frameFiles,
    loop: true,
    tags: ['icon', 'weather', 'status']
};

fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Generated weather (${frames.length} frames, cycling Sun → Cloud → Rain → Lightning)`);
