"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderAsciiFrameToBuffer = renderAsciiFrameToBuffer;
exports.createAsciiVideo = createAsciiVideo;
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const util_1 = require("util");
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
async function renderAsciiFrameToBuffer(text, options = {}) {
    const { fontSize = 12, // Increased default
    color = 'white', backgroundColor = 'black', fontFamily = 'monospace', // Use a monospaced font available on system
    width, height } = options;
    const lines = text.split('\n');
    // Use provided line height or default to fontSize (tight packing)
    // The browser preview uses fontSize + 2. We should default to that if not provided, or let caller provide it.
    // Let's rely on caller or default to fontSize * 1.0 if not specified (backward compat), 
    // but better to default to what looks good. 
    // Actually, let's use options.lineHeight || fontSize.
    const lineHeight = options.lineHeight || fontSize;
    // Calculate dimensions
    // 0.6 is a standard approximation for monospace font width (e.g. Courier New is ~0.6)
    // Consolas is roughly 0.55.
    const charWidth = fontSize * 0.6;
    // Determine canvas size
    const cols = Math.max(...lines.map(l => l.length));
    const rows = lines.length;
    const svgWidth = width || Math.ceil(cols * charWidth + fontSize * 2);
    const svgHeight = height || Math.ceil(rows * lineHeight + fontSize * 2);
    // Escape special XML characters
    const escapeXml = (unsafe) => unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
    // Build SVG content
    // Use `white-space: pre` style to preserve spaces
    // But SVG text doesn't support white-space: pre naturally without nested tspans usually?
    // Actually, preserving spaces in tspan is tricky.
    // Better to use `xml:space="preserve"` on text element.
    // We position each line manually to ensure correct line height
    const tspans = lines.map((line, i) => {
        // We use dy on sequential tspans or absolute y.
        // Let's use absolute y for predictability (or dy with x=0)
        return `<tspan x="${fontSize}" dy="${lineHeight}px">${escapeXml(line) || ' '}</tspan>`;
    }).join('');
    const svg = `
    <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}" />
        <style>
            text {
                font-family: "${fontFamily}", monospace;
                font-weight: normal;
            }
        </style>
        <text 
            x="${fontSize}" 
            y="${fontSize}" 
            font-size="${fontSize}px" 
            fill="${color}"
            xml:space="preserve"
        >
            ${tspans}
        </text>
    </svg>
    `;
    return (0, sharp_1.default)(Buffer.from(svg))
        .png()
        .toBuffer();
}
/**
 * Creates an MP4 video from ASCII frames.
 * Returns the path to the generated video file.
 * The caller is responsible for deleting the file after use.
 */
async function createAsciiVideo(frames, fps, options = {}) {
    const tempDir = path_1.default.join(process.cwd(), `temp-ascii-vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await mkdir(tempDir, { recursive: true });
    const outputPath = path_1.default.join(tempDir, 'output.mp4');
    try {
        // Generate images concurrently (limit concurrency slightly if needed, but modern Node handles file IO well)
        // For very large arrays, chunking might be needed to avoid OOM or file handle limits.
        // Let's do it in chunks of 10.
        const chunkSize = 10;
        for (let i = 0; i < frames.length; i += chunkSize) {
            const chunk = frames.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (frame, idx) => {
                const frameIndex = i + idx;
                const buffer = await renderAsciiFrameToBuffer(frame, options);
                await writeFile(path_1.default.join(tempDir, `frame-${String(frameIndex).padStart(5, '0')}.png`), buffer);
            }));
        }
        await new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)()
                .input(path_1.default.join(tempDir, 'frame-%05d.png'))
                .inputFPS(fps)
                .output(outputPath)
                .videoCodec('libx264')
                .outputOptions([
                '-pix_fmt yuv420p', // Essential for wide compatibility
                '-preset fast', // Speed up encoding
                '-crf 22' // Reasonable quality
            ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });
        // We return the path inside tempDir.
        // Caller must read it and then delete tempDir.
        return outputPath;
    }
    catch (error) {
        // Cleanup on failed attempt
        try {
            await fs_1.default.promises.rm(tempDir, { recursive: true, force: true });
        }
        catch (e) {
            console.error('Failed to cleanup temp dir', e);
        }
        throw error;
    }
}
