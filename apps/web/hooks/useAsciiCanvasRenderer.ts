import { useCallback, useEffect, useRef, useState } from 'react';
import { Layer } from '../types/layer';

const NEWLINE_REGEX = /\n/g;

export interface UseAsciiCanvasRendererProps {
    layers: Layer[];
    width: number;
    height: number;
    globalFrameCount: number;
    currentTime?: number;
    audioMetrics?: { bass: number; mid: number; treble: number; volume: number };
    backgroundColor?: string;
}

export function useAsciiCanvasRenderer({
    layers,
    width,
    height,
    globalFrameCount,
    currentTime = 0,
    audioMetrics,
    backgroundColor = '#111111'
}: UseAsciiCanvasRendererProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const animationRef = useRef<number | null>(null);

    // Initialize Canvas & Stream
    useEffect(() => {
        if (!canvasRef.current && typeof document !== 'undefined') {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvasRef.current = canvas;

            try {
                const s = canvas.captureStream(60); // 60 FPS target
                setStream(s);
            } catch (e) {
                console.error("Canvas captureStream failed:", e);
            }
        } else if (canvasRef.current) {
            // Update dimensions if changed
            if (canvasRef.current.width !== width) canvasRef.current.width = width;
            if (canvasRef.current.height !== height) canvasRef.current.height = height;
        }
    }, [width, height]);

    // Render Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Clear Background
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);

        // Draw Layers
        [...layers].reverse().forEach(layer => {
            if (!layer.visible) return;

            const frameIndex = (globalFrameCount % (layer.frames.length || 1));
            const frame = layer.frames[frameIndex] || '';

            // Calculate Transforms
            let scale = layer.transform.scale;
            let opacity = layer.transform.opacity;
            let rotation = layer.transform.rotation;
            let x = layer.transform.x;
            let y = layer.transform.y;

            // Audio Reactivity
            if (layer.transform.audioReact?.enabled && audioMetrics) {
                const { source, target, strength, invert } = layer.transform.audioReact;
                const val = audioMetrics[source as keyof typeof audioMetrics] || 0;
                const factor = invert ? (1 - val) : val;
                const mod = factor * strength;

                if (target === 'scale') scale *= (1 + mod);
                else if (target === 'opacity') opacity = Math.min(1, Math.max(0.1, opacity * (1 + (mod - 0.5))));
                else if (target === 'rotation') rotation += (mod * 60 - 30);
                // Note: Distortion filters are hard to replicate in 2D canvas without heavy lifting. Omitting for now.
            }

            ctx.save();

            // Center & Transform
            ctx.translate(width / 2, height / 2); // Origin at center
            ctx.translate(x, y);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(scale * (layer.transform.flipX ? -1 : 1), scale * (layer.transform.flipY ? -1 : 1));

            ctx.globalAlpha = opacity;
            if (layer.transform.blendMode !== 'normal') {
                // Map CSS blend modes to Canvas globalCompositeOperation where possible
                // 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity'
                ctx.globalCompositeOperation = layer.transform.blendMode as GlobalCompositeOperation;
            }

            // Font Settings
            const fontSize = layer.options.fontSize;
            ctx.font = `${fontSize}px monospace`; // Ensure monospace font matches CSS
            ctx.textBaseline = 'top';

            // Parsing & Layout
            const lineHeight = fontSize;

            // Check if Color Mode (HTML) or Kinetic Pipeline
            if (layer.options.renderMode === 'kinetic') {
                // Parse Kinetic Pipeline String: char,z,scale,opacity,r,g,b|
                const lines = frame.split('\n');
                const totalHeight = lines.length * lineHeight;
                const startY = -totalHeight / 2;

                // Center logic
                let gridWidth = 0;
                if (lines[0]) {
                    const firstLineChars = lines[0].split('|').filter(Boolean).length;
                    // Kinetic scales characters, so horizontal advance is tricky.
                    // Assuming uniform grid width based on font size for layout:
                    const charAdvance = ctx.measureText('A').width;
                    gridWidth = firstLineChars * charAdvance;
                }
                const startX = -gridWidth / 2;

                lines.forEach((line, i) => {
                    const charDataBlocks = line.split('|').filter(Boolean);
                    const lineY = startY + (i * lineHeight);
                    let currentX = startX;

                    for (let c = 0; c < charDataBlocks.length; c++) {
                        const block = charDataBlocks[c];
                        const parts = block.split(',');
                        if (parts.length === 7) {
                            const char = parts[0] === '&nbsp;' ? ' ' : parts[0];
                            const z = parseFloat(parts[1]);
                            const letterScale = parseFloat(parts[2]);
                            const op = parseFloat(parts[3]);
                            const r = parseInt(parts[4]);
                            const g = parseInt(parts[5]);
                            const b = parseInt(parts[6]);

                            if (op > 0.05 && char !== ' ') {
                                ctx.save();
                                // We simulate Z-depth via parallax translation if enable3d was passed,
                                // but for raw performance we rely on the pre-calculated scale
                                ctx.translate(currentX, lineY);
                                ctx.scale(letterScale, letterScale);

                                ctx.globalAlpha = opacity * op; // Combined Opacity
                                ctx.fillStyle = `rgb(${r},${g},${b})`;
                                ctx.fillText(char, 0, 0);

                                ctx.restore();
                            }
                        }
                        // Advance cursor by fixed character width, not scaled width, to maintain grid
                        currentX += ctx.measureText('A').width;
                    }
                });
            }
            else if (layer.options.colorMode && frame.includes('<span')) {
                // Complex HTML Parsing (Basic)
                // We split by newlines first to manage Y position
                // But since spans can wrap lines (rare in this generator?), assume strict structure from converter:
                // usually converter outputs <span ...>char</span> or <span ...>chunk</span> per line?
                // Let's assume the frame is a single block string.

                // Actually, splitting by newline is safest.

                // Wait, the frame string contains HTML tags. Splitting by \n might break tags if they span lines?
                // Converter usually emits valid HTML per line or per char?
                // Looking at video.ts diff logic, it implies spans are self-contained or handled carefully.

                // Let's TRY splitting by \n first, then parsing HTML per line.
                const lines = frame.split('\n');
                const totalHeight = lines.length * lineHeight;
                const startY = -totalHeight / 2;

                lines.forEach((line, i) => {
                    const lineY = startY + (i * lineHeight);

                    // Parse line into tokens
                    const tokens: { char: string, color: string }[] = [];
                    let j = 0;

                    while (j < line.length) {
                        if (line.substring(j, j + 5) === '<span') {
                            const endTagIndex = line.indexOf('>', j);
                            if (endTagIndex !== -1) {
                                const spanTag = line.substring(j, endTagIndex + 1);
                                const colorMatch = spanTag.match(/style="color:\s*([^"]+)"/);
                                const parsedColor = colorMatch ? colorMatch[1] : layer.options.color || 'white';

                                const closeTagIndex = line.indexOf('</span>', endTagIndex);
                                if (closeTagIndex !== -1) {
                                    const rawContent = line.substring(endTagIndex + 1, closeTagIndex);
                                    const char = rawContent === '&nbsp;' ? ' ' : rawContent
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>')
                                        .replace(/&amp;/g, '&')
                                        .replace(/&apos;/g, "'")
                                        .replace(/&quot;/g, '"');

                                    tokens.push({ char, color: parsedColor });
                                    j = closeTagIndex + 7;
                                } else {
                                    tokens.push({ char: line[j], color: layer.options.color || 'white' });
                                    j++;
                                }
                            } else {
                                tokens.push({ char: line[j], color: layer.options.color || 'white' });
                                j++;
                            }
                        } else {
                            const nextSpan = line.indexOf('<span', j);
                            const endIdx = nextSpan !== -1 ? nextSpan : line.length;
                            const chunk = line.substring(j, endIdx);
                            // unescape
                            const unescapedChunk = chunk.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                            for (let c = 0; c < unescapedChunk.length; c++) {
                                tokens.push({ char: unescapedChunk[c], color: layer.options.color || 'white' });
                            }
                            j = endIdx;
                        }
                    }

                    // Calculate total width to center it
                    let totalWidth = 0;
                    for (const t of tokens) {
                        totalWidth += ctx.measureText(t.char).width;
                    }

                    let currentX = -totalWidth / 2;
                    let lastColor = null;

                    // Draw tokens
                    for (const t of tokens) {
                        if (t.char !== ' ') {
                            if (t.color !== lastColor) {
                                ctx.fillStyle = t.color;
                                lastColor = t.color;
                            }
                            ctx.fillText(t.char, currentX, lineY);
                        }
                        currentX += ctx.measureText(t.char).width;
                    }
                });

            } else {
                // Plain Text Mode (Faster)
                const lines = frame.split('\n');
                const TotalHeight = lines.length * lineHeight;
                const startY = -TotalHeight / 2;

                ctx.fillStyle = layer.options.color || '#ffffff';

                lines.forEach((line, i) => {
                    const lineWidth = ctx.measureText(line).width;
                    const x = -lineWidth / 2;
                    const y = startY + (i * lineHeight);
                    ctx.fillText(line, x, y);
                });
            }

            ctx.restore();
        });

    }, [layers, width, height, globalFrameCount, audioMetrics, backgroundColor]);

    return { stream, canvasRef };
}
