import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { imageToAscii } from './converter';
import { AsciiOptions } from './utils';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);
const rm = promisify(fs.rm);

export interface VideoConvertOptions extends AsciiOptions {
    fps?: number;
    outputDir?: string;
    returnFrames?: boolean;
    frameDiff?: boolean; // When true, only show characters that changed between frames
}

/**
 * Apply frame differencing: replace unchanged characters with spaces.
 * Handles both plain text and HTML (colorMode) output.
 */
function applyFrameDiff(frames: string[]): string[] {
    if (frames.length <= 1) return frames;

    const result: string[] = [frames[0]]; // First frame always shown in full

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
                } else if (prevPart === currPart) {
                    diff += ' ';
                } else {
                    diff += currPart;
                }
            }
        } else {
            const maxLen = Math.max(prev.length, curr.length);
            for (let j = 0; j < maxLen; j++) {
                const prevChar = prev[j] || '';
                const currChar = curr[j] || '';

                if (currChar === '\n') {
                    diff += '\n';
                } else if (prevChar === currChar) {
                    diff += ' ';
                } else {
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
function splitHtmlFrame(frame: string): string[] {
    const parts: string[] = [];
    let i = 0;
    while (i < frame.length) {
        if (frame[i] === '\n') {
            parts.push('\n');
            i++;
        } else if (frame[i] === '<') {
            const end = frame.indexOf('</span>', i);
            if (end !== -1) {
                const span = frame.substring(i, end + 7);
                parts.push(span);
                i = end + 7;
            } else {
                parts.push(frame[i]);
                i++;
            }
        } else {
            parts.push(frame[i]);
            i++;
        }
    }
    return parts;
}

export async function videoToAscii(inputPath: string, options: VideoConvertOptions): Promise<string[] | void> {
    const { outputDir, fps = 12, returnFrames = false, frameDiff = false, ...asciiOptions } = options;

    if (!outputDir && !returnFrames) {
        throw new Error('Either outputDir or returnFrames must be specified');
    }

    // Use a temp dir if no outputDir is provided but we need to process frames
    const workDir = outputDir || path.join(path.dirname(inputPath), '_ascii_temp_' + Date.now());

    // Create output directory if it doesn't exist and we are using it
    if (outputDir && !fs.existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
    }

    // Create temporary directory for frames
    const tempDir = path.join(workDir, '_temp_frames');
    if (!fs.existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .outputOptions(`-vf fps=${fps}`)
            .output(`${tempDir}/frame-%04d.png`)
            .on('end', async () => {
                try {
                    // Process frames
                    const files = (await readdir(tempDir)).sort();
                    const framesRequest = files.map(async (file) => {
                        const framePath = path.join(tempDir, file);
                        const ascii = await imageToAscii(framePath, asciiOptions);
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
                            await writeFile(
                                path.join(outputDir, frames[i].name),
                                framesContent[i]
                            );
                        }
                    }

                    // Cleanup temp dir
                    if (!outputDir) {
                        await rm(workDir, { recursive: true, force: true });
                    } else {
                        await rm(tempDir, { recursive: true, force: true });
                    }

                    if (returnFrames) {
                        resolve(framesContent);
                    } else {
                        resolve();
                    }
                } catch (err) {
                    reject(err);
                }
            })
            .on('error', (err) => {
                reject(err);
            })
            .run();
    });
}
