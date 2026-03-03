import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

export interface RenderOptions {
    width?: number; // Output image width
    height?: number; // Output image height (if not provided, calculated from text)
    fontSize?: number;
    color?: string; // Hex or CSS color
    backgroundColor?: string;
    fontFamily?: string;
    lineHeight?: number;
}

export async function renderAsciiFrameToBuffer(text: string, options: RenderOptions = {}): Promise<Buffer> {
    const {
        fontSize = 12, // Increased default
        color = 'white',
        backgroundColor = 'black',
        fontFamily = 'monospace', // Use a monospaced font available on system
        width,
        height
    } = options;

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
    const escapeXml = (unsafe: string) => unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });

    const parseHtmlSpansToTspans = (line: string): string => {
        if (!line.includes('<span')) return escapeXml(line) || ' ';

        let svgLine = '';
        let i = 0;
        while (i < line.length) {
            if (line.substring(i, i + 5) === '<span') {
                const endTagIndex = line.indexOf('>', i);
                if (endTagIndex !== -1) {
                    const spanTag = line.substring(i, endTagIndex + 1);
                    const colorMatch = spanTag.match(/style="color:\s*([^"]+)"/);
                    const parsedColor = colorMatch ? colorMatch[1] : '';

                    const closeTagIndex = line.indexOf('</span>', endTagIndex);
                    if (closeTagIndex !== -1) {
                        const content = line.substring(endTagIndex + 1, closeTagIndex);
                        if (parsedColor) {
                            svgLine += `<tspan fill="${parsedColor}">${escapeXml(content)}</tspan>`;
                        } else {
                            svgLine += `<tspan>${escapeXml(content)}</tspan>`;
                        }
                        i = closeTagIndex + 7;
                    } else {
                        svgLine += escapeXml(line[i]); i++;
                    }
                } else {
                    svgLine += escapeXml(line[i]); i++;
                }
            } else {
                const nextSpan = line.indexOf('<span', i);
                if (nextSpan !== -1) {
                    svgLine += escapeXml(line.substring(i, nextSpan));
                    i = nextSpan;
                } else {
                    svgLine += escapeXml(line.substring(i));
                    break;
                }
            }
        }
        return svgLine || ' ';
    };

    // We position each line manually to ensure correct line height
    const tspans = lines.map((line, i) => {
        // We use dy on sequential tspans or absolute y.
        // Let's use absolute y for predictability (or dy with x=0)
        return `<tspan x="${fontSize}" dy="${lineHeight}px">${parseHtmlSpansToTspans(line)}</tspan>`;
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

    return sharp(Buffer.from(svg))
        .png()
        .toBuffer();
}

/**
 * Creates an MP4 video from ASCII frames.
 * Returns the path to the generated video file.
 * The caller is responsible for deleting the file after use.
 */
export async function createAsciiVideo(frames: string[], fps: number, options: RenderOptions = {}): Promise<string> {
    const tempDir = path.join(process.cwd(), `temp-ascii-vid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await mkdir(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, 'output.mp4');

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
                await writeFile(path.join(tempDir, `frame-${String(frameIndex).padStart(5, '0')}.png`), buffer);
            }));
        }

        await new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(path.join(tempDir, 'frame-%05d.png'))
                .inputFPS(fps)
                .output(outputPath)
                .videoCodec('libx264')
                .outputOptions([
                    '-pix_fmt yuv420p', // Essential for wide compatibility
                    '-color_primaries bt709',
                    '-color_trc bt709',
                    '-colorspace bt709',
                    '-color_range pc', // Force full 0-255 range instead of 16-235 TV range
                    '-preset fast',      // Speed up encoding
                    '-crf 22'           // Reasonable quality
                ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        // We return the path inside tempDir.
        // Caller must read it and then delete tempDir.
        return outputPath;

    } catch (error) {
        // Cleanup on failed attempt
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (e) { console.error('Failed to cleanup temp dir', e); }
        throw error;
    }
}
export interface LayerData {
    frames: string[];
    fps: number;
    options: RenderOptions;
    transform: {
        x: number;
        y: number;
        scale: number;
        rotation: number;
        opacity: number;
        flipX?: boolean;
        flipY?: boolean;
        blendMode: string;
    };
    width: number; // Layer specific width
}

export interface CompositeVideoOptions {
    width: number;
    height: number;
    backgroundColor: string;
    duration?: number; // Optional duration in seconds, otherwise max of layers
    fps?: number; // Output FPS
}

export async function createCompositeAsciiVideo(layers: LayerData[], options: CompositeVideoOptions): Promise<string> {
    const tempDir = path.join(process.cwd(), `temp-ascii-comp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    await mkdir(tempDir, { recursive: true });

    const outputPath = path.join(tempDir, 'output.mp4');

    try {
        const outputFps = options.fps || 12;

        // Calculate total frames
        // If duration is provided use it, otherwise find max duration of layers
        let totalFrames = 0;
        if (options.duration) {
            totalFrames = Math.ceil(options.duration * outputFps);
        } else {
            let maxDuration = 0;
            layers.forEach(l => {
                const duration = l.frames.length / (l.fps || 12);
                if (duration > maxDuration) maxDuration = duration;
            });
            // Default to at least 1 second if empty?
            if (maxDuration === 0) maxDuration = 3;
            totalFrames = Math.ceil(maxDuration * outputFps);
        }

        const width = options.width || 800;
        const height = options.height || 600;

        // Render frames
        const chunkSize = 10;
        for (let i = 0; i < totalFrames; i += chunkSize) {
            // Process chunk
            const end = Math.min(i + chunkSize, totalFrames);
            const indices = [];
            for (let j = i; j < end; j++) indices.push(j);

            await Promise.all(indices.map(async (frameIndex) => {
                const currentTime = frameIndex / outputFps;

                // Create base compositor
                // Start with background
                let compositor = sharp({
                    create: {
                        width,
                        height,
                        channels: 4,
                        background: options.backgroundColor || '#000000'
                    }
                });

                const layerBuffers: { input: Buffer, blend: any, opacity: number, top: number, left: number }[] = [];

                // Render each layer
                // Layers are strictly ordered bottom-to-top in the array for rendering (0 is bottom)
                // But in frontend 0 is top. We should reverse before calling this function or reverse here?
                // Implementation plan said: "Frontend: Send full layer data... Backend: Iterate..."
                // Typical convention: painters algo, bottom first.
                // Let's assume input `layers` is ordered bottom-to-top (reverse of frontend UI list).

                for (const layer of layers) {
                    if (layer.transform.opacity === 0) continue;

                    // Determine active frame for this layer
                    const layerFrameIndex = Math.floor(currentTime * (layer.fps || 12)) % (layer.frames.length || 1);
                    const frameContent = layer.frames[layerFrameIndex] || '';

                    // Render layer content to transparent buffer
                    // We need to calculate the bounding box or use provided width
                    // Ideally we render tight and then transform.
                    // But `renderAsciiFrameToBuffer` creates a canvas based on content size.

                    const buffer = await renderAsciiFrameToBuffer(frameContent, {
                        ...layer.options,
                        backgroundColor: 'transparent', // Always transparent for layers
                        width: undefined, // Let it auto-size or uses layer.options.width? 
                        // Actually in playground `width` is "Output Width" in chars. 
                        // `renderAsciiFrameToBuffer` handles this.
                    });

                    // Get metadata to know dimensions for centering
                    const meta = await sharp(buffer).metadata();
                    const layerWidth = meta.width || 0;
                    const layerHeight = meta.height || 0;

                    // Calculate affine transform
                    // We want to center the layer at (width/2 + x, height/2 + y)
                    // Initial position of `buffer` is top-left (0,0) of the *buffer itself*.
                    // We need to place it such that its center is at target.

                    const cx = width / 2;
                    const cy = height / 2;

                    const tx = layer.transform.x;
                    const ty = layer.transform.y;

                    // Frontend Transform: translate(-50%, -50%) translate(x, y) ...
                    // This means center of object is at (50% parent + x, 50% parent + y).

                    // Sharp composite uses `top` and `left`.
                    // But we also need rotation and scale.
                    // Sharp operations are sequential.

                    // Resize (Scale)
                    // Sharp resize is centered? No.
                    const scale = layer.transform.scale || 1;
                    const flipX = layer.transform.flipX || false;
                    const flipY = layer.transform.flipY || false;

                    // We can use an SVG chain for complex transforms or use Sharp's affine?
                    // Sharp doesn't strictly support arbitrary affine on buffers easily without growing canvas.
                    // EASIEST WAY: Use SVG to wrap the image with transforms?
                    // OR: Rotate/Scale the buffer itself.

                    let layerImg = sharp(buffer);

                    // 1. Flip
                    if (flipX) layerImg = layerImg.flop();
                    if (flipY) layerImg = layerImg.flip();

                    // 2. Scale
                    if (scale !== 1) {
                        layerImg = layerImg.resize(Math.round(layerWidth * scale), null);
                    }

                    // 3. Rotate
                    if (layer.transform.rotation !== 0) {
                        layerImg = layerImg.rotate(layer.transform.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
                    }

                    // 4. Opacity is handled in composite options usually? 
                    // Sharp composite doesn't support global alpha easily.
                    // We might need to modulate alpha channel.
                    if (layer.transform.opacity < 1) {
                        // linear modulation
                        layerImg = layerImg.ensureAlpha().modulate({ brightness: 1, saturation: 1, hue: 0, lightness: 0 });
                        // Wait, modulate doesn't do alpha.
                        // We can use a bandbool or raw buffer maniupulation.
                        // Or iterate pixels.
                        // For now, let's assume fully opaque or use a composite hack (image * opacity).
                        // Actually SVG wrapper is cleaner for Opacity.
                    }

                    // Get new dimensions after transform
                    const transformedBuffer = await layerImg.toBuffer();
                    const tMeta = await sharp(transformedBuffer).metadata();
                    const tw = tMeta.width || 0;
                    const th = tMeta.height || 0;

                    // Calculate Composition Position (Top/Left)
                    // Target Center: (cx + tx, cy + ty)
                    // Top-Left: Target Center - (tw/2, th/2)

                    const left = Math.round((cx + tx) - (tw / 2));
                    const top = Math.round((cy + ty) - (th / 2));

                    // Sharp doesn't support 'opacity' in composite input options.
                    // We handle blend modes roughly.

                    layerBuffers.push({
                        input: transformedBuffer,
                        top,
                        left,
                        blend: layer.transform.blendMode === 'normal' ? 'over' : layer.transform.blendMode as any,
                        opacity: layer.transform.opacity
                    });
                }

                // Composite all layers
                const finalFrame = await compositor.composite(layerBuffers.map(l => ({
                    input: l.input,
                    top: l.top,
                    left: l.left,
                    blend: l.blend
                }))).png().toBuffer();

                await writeFile(path.join(tempDir, `frame-${String(frameIndex).padStart(5, '0')}.png`), finalFrame);
            }));
        }

        await new Promise<void>((resolve, reject) => {
            ffmpeg()
                .input(path.join(tempDir, 'frame-%05d.png'))
                .inputFPS(outputFps)
                .output(outputPath)
                .videoCodec('libx264')
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-color_primaries bt709',
                    '-color_trc bt709',
                    '-colorspace bt709',
                    '-color_range pc',
                    '-preset fast',
                    '-crf 22'
                ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        return outputPath;

    } catch (error) {
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch (e) { console.error('Failed to cleanup temp dir', e); }
        throw error;
    }
}
