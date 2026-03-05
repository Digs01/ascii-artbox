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

/**
 * Core rendering logic extracted to a pure function for use in GIF and other exports.
 */
export function renderLayersToCanvas(
    ctx: CanvasRenderingContext2D,
    layers: Layer[],
    width: number,
    height: number,
    globalFrameCount: number,
    currentTime: number,
    audioMetrics?: { bass: number; mid: number; treble: number; volume: number },
    backgroundColor: string = '#111111'
) {
    // Clear Background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw Layers
    [...layers].reverse().forEach(layer => {
        if (!layer.visible) return;

        const frameIndex = Math.floor(currentTime * (layer.fps || 12)) % Math.max(1, layer.frames.length);
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
        }

        ctx.save();

        // Center & Transform
        ctx.translate(width / 2, height / 2); // Origin at center
        ctx.translate(x, y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale * (layer.transform.flipX ? -1 : 1), scale * (layer.transform.flipY ? -1 : 1));

        ctx.globalAlpha = opacity;
        if (layer.transform.blendMode !== 'normal') {
            ctx.globalCompositeOperation = layer.transform.blendMode as GlobalCompositeOperation;
        }

        // Draw Layer Background (for obscuring)
        // If removeBackground is true, we don't draw it.
        if (!layer.options.removeBackground && layer.options.bgTheme?.bg) {
            // We need to calculate the bounding box based on the rendered text size.
            // Since we're centered, the box goes from -boxWidth/2 to boxWidth/2
            let boxWidth = 0;
            let boxHeight = 0;
            const lines = frame.split('\n');
            const fontSize = layer.options.fontSize;

            boxHeight = lines.length * fontSize;

            if (layer.options.renderMode === 'kinetic') {
                const firstLineChars = lines[0] ? lines[0].split('|').filter(Boolean).length : 0;
                boxWidth = firstLineChars * ctx.measureText('A').width;
            } else if (layer.options.colorMode && frame.includes('<span')) {
                // Approximate for color HTML (stripping tags)
                let maxLen = 0;
                lines.forEach(l => {
                    const clean = l.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
                    if (clean.length > maxLen) maxLen = clean.length;
                });
                boxWidth = maxLen * (fontSize * 0.6);
            } else {
                let maxLen = 0;
                lines.forEach(l => { if (l.length > maxLen) maxLen = l.length; });
                boxWidth = maxLen * (fontSize * 0.6);
            }

            if (boxWidth > 0 && boxHeight > 0) {
                ctx.fillStyle = layer.options.bgTheme.bg;
                ctx.fillRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight);
            }
        }

        // Font Settings
        const fontSize = layer.options.fontSize;
        ctx.font = `${fontSize}px monospace`;
        ctx.textBaseline = 'top';

        // Parsing & Layout
        const lineHeight = fontSize;

        if (layer.options.renderMode === 'kinetic') {
            const lines = frame.split('\n');
            const totalHeight = lines.length * lineHeight;
            const startY = -totalHeight / 2;

            let gridWidth = 0;
            if (lines[0]) {
                const firstLineChars = lines[0].split('|').filter(Boolean).length;
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
                        const letterScale = parseFloat(parts[2]);
                        const op = parseFloat(parts[3]);
                        const r = parseInt(parts[4]);
                        const g = parseInt(parts[5]);
                        const b = parseInt(parts[6]);

                        if (op > 0.05 && char !== ' ') {
                            ctx.save();
                            ctx.translate(currentX, lineY);
                            ctx.scale(letterScale, letterScale);
                            ctx.globalAlpha = opacity * op;
                            ctx.fillStyle = `rgb(${r},${g},${b})`;
                            ctx.fillText(char, 0, 0);
                            ctx.restore();
                        }
                    }
                    currentX += ctx.measureText('A').width;
                }
            });
        }
        else if (layer.options.colorMode && frame.includes('<span')) {
            const lines = frame.split('\n');
            const totalHeight = lines.length * lineHeight;
            const startY = -totalHeight / 2;

            lines.forEach((line, i) => {
                const lineY = startY + (i * lineHeight);
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
                        const unescapedChunk = chunk.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                        for (let c = 0; c < unescapedChunk.length; c++) {
                            tokens.push({ char: unescapedChunk[c], color: layer.options.color || 'white' });
                        }
                        j = endIdx;
                    }
                }

                let totalLineWidth = 0;
                for (const t of tokens) totalLineWidth += ctx.measureText(t.char).width;

                let currentX = -totalLineWidth / 2;
                let lastColor = null;

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
            const lines = frame.split('\n');
            const totalFrameHeight = lines.length * lineHeight;
            const startY = -totalFrameHeight / 2;
            ctx.fillStyle = layer.options.color || '#ffffff';
            lines.forEach((line, i) => {
                const lineWidth = ctx.measureText(line).width;
                const xPos = -lineWidth / 2;
                const yPos = startY + (i * lineHeight);
                ctx.fillText(line, xPos, yPos);
            });
        }

        ctx.restore();
    });
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

    // Cleanup stream tracks on unmount to free resources
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

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

        renderLayersToCanvas(ctx, layers, width, height, globalFrameCount, currentTime, audioMetrics, backgroundColor);

    }, [layers, width, height, globalFrameCount, currentTime, audioMetrics, backgroundColor]);

    return { stream, canvasRef };
}
