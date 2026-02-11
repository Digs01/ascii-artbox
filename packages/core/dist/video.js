"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoToAscii = videoToAscii;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const converter_1 = require("./converter");
const util_1 = require("util");
const mkdir = (0, util_1.promisify)(fs_1.default.mkdir);
const readdir = (0, util_1.promisify)(fs_1.default.readdir);
const writeFile = (0, util_1.promisify)(fs_1.default.writeFile);
const rm = (0, util_1.promisify)(fs_1.default.rm);
/**
 * Apply frame differencing: replace unchanged characters with spaces.
 * Handles both plain text and HTML (colorMode) output.
 */
function applyFrameDiff(frames) {
    if (frames.length <= 1)
        return frames;
    const result = [frames[0]]; // First frame always shown in full
    for (let i = 1; i < frames.length; i++) {
        const prev = frames[i - 1];
        const curr = frames[i];
        let diff = '';
        // For colorMode HTML, we compare spans; for plain text, compare chars
        const isHtml = curr.includes('<span');
        if (isHtml) {
            const prevParts = splitHtmlFrame(prev);
            const currParts = splitHtmlFrame(curr);
            const maxLen = Math.max(prevParts.length, currParts.length);
            for (let j = 0; j < maxLen; j++) {
                const prevPart = prevParts[j] || '';
                const currPart = currParts[j] || '';
                if (currPart === '\n') {
                    diff += '\n';
                }
                else if (prevPart === currPart) {
                    diff += ' ';
                }
                else {
                    diff += currPart;
                }
            }
        }
        else {
            const maxLen = Math.max(prev.length, curr.length);
            for (let j = 0; j < maxLen; j++) {
                const prevChar = prev[j] || '';
                const currChar = curr[j] || '';
                if (currChar === '\n') {
                    diff += '\n';
                }
                else if (prevChar === currChar) {
                    diff += ' ';
                }
                else {
                    diff += currChar;
                }
            }
        }
        result.push(diff);
    }
    return result;
}
/**
 * Split an HTML frame into logical parts (spans + raw chars + newlines).
 */
function splitHtmlFrame(frame) {
    const parts = [];
    let i = 0;
    while (i < frame.length) {
        if (frame[i] === '\n') {
            parts.push('\n');
            i++;
        }
        else if (frame[i] === '<') {
            const end = frame.indexOf('</span>', i);
            if (end !== -1) {
                const span = frame.substring(i, end + 7);
                parts.push(span);
                i = end + 7;
            }
            else {
                parts.push(frame[i]);
                i++;
            }
        }
        else {
            parts.push(frame[i]);
            i++;
        }
    }
    return parts;
}
async function videoToAscii(inputPath, options) {
    const { outputDir, fps = 12, returnFrames = false, frameDiff = false, ...asciiOptions } = options;
    if (!outputDir && !returnFrames) {
        throw new Error('Either outputDir or returnFrames must be specified');
    }
    // Use a temp dir if no outputDir is provided but we need to process frames
    const workDir = outputDir || path_1.default.join(path_1.default.dirname(inputPath), '_ascii_temp_' + Date.now());
    // Create output directory if it doesn't exist and we are using it
    if (outputDir && !fs_1.default.existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
    }
    // Create temporary directory for frames
    const tempDir = path_1.default.join(workDir, '_temp_frames');
    if (!fs_1.default.existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true });
    }
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inputPath)
            .outputOptions(`-vf fps=${fps}`)
            .output(`${tempDir}/frame-%04d.png`)
            .on('end', async () => {
            try {
                // Process frames
                const files = (await readdir(tempDir)).sort();
                const framesRequest = files.map(async (file) => {
                    const framePath = path_1.default.join(tempDir, file);
                    const ascii = await (0, converter_1.imageToAscii)(framePath, asciiOptions);
                    return {
                        name: file.replace('.png', '.txt'),
                        content: ascii
                    };
                });
                const frames = await Promise.all(framesRequest);
                let framesContent = frames.map(f => f.content);
                // Apply frame differencing if enabled
                if (frameDiff) {
                    framesContent = applyFrameDiff(framesContent);
                }
                // Write ASCII frames if outputDir is specified
                if (outputDir) {
                    for (let i = 0; i < frames.length; i++) {
                        await writeFile(path_1.default.join(outputDir, frames[i].name), framesContent[i]);
                    }
                }
                // Cleanup temp dir
                if (!outputDir) {
                    await rm(workDir, { recursive: true, force: true });
                }
                else {
                    await rm(tempDir, { recursive: true, force: true });
                }
                if (returnFrames) {
                    resolve(framesContent);
                }
                else {
                    resolve();
                }
            }
            catch (err) {
                reject(err);
            }
        })
            .on('error', (err) => {
            reject(err);
        })
            .run();
    });
}
