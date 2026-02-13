import { useCallback, useEffect, useRef, useState } from 'react';
import { Layer } from '../types/layer';

const HTML_COLOR_REGEX = /<span style="color:(rgb\(\d+,\d+,\d+\)|#[0-9a-fA-F]+)">([\s\S]*?)<\/span>/g;
const NEWLINE_REGEX = /\n/g;

export interface UseAsciiCanvasRendererProps {
    layers: Layer[];
    width: number;
    height: number;
    globalFrameCount: number;
    audioMetrics?: { bass: number; mid: number; treble: number; volume: number };
    backgroundColor?: string;
}

export function useAsciiCanvasRenderer({
    layers,
    width,
    height,
    globalFrameCount,
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

            // Check if Color Mode (HTML)
            if (layer.options.colorMode && frame.includes('<span')) {
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
                    let cursorX = 0;

                    // Temporary simple parser for line:
                    // Matches <span style="color:...">text</span> OR plain text
                    const parts = [];
                    let lastIndex = 0;

                    // Reset regex state
                    const regex = new RegExp(HTML_COLOR_REGEX);
                    let match;

                    // This regex logic is fragile if tags are nested or malformed, but our converter is consistent.
                    // Also need to handle plain text between tags.

                    // Alternative: strip tags for width calculation, then accurate draw?
                    // Actually, we need to center the LINE horizontally.
                    // First, measure total width of the line (text only).
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = line;
                    const textContent = tempDiv.textContent || '';
                    const totalWidth = ctx.measureText(textContent).width;

                    cursorX = -totalWidth / 2;

                    // Now draw parts
                    // We can iterate the string.
                    // Check for '<span' vs text.

                    // Robust primitive parser:
                    let currentX = cursorX;
                    // Hacky regex loop on the line
                    let subMatch;
                    const lineRegex = /<span style="color:(.*?)">(.*?)<\/span>|([^<]+)/g;

                    while ((subMatch = lineRegex.exec(line)) !== null) {
                        if (subMatch[1]) {
                            // Color Span
                            // subMatch[1] = color, subMatch[2] = content
                            ctx.fillStyle = subMatch[1];
                            ctx.fillText(subMatch[2], currentX, lineY);
                            currentX += ctx.measureText(subMatch[2]).width;
                        } else if (subMatch[3]) {
                            // Plain text
                            ctx.fillStyle = layer.options.color || '#fff';
                            ctx.fillText(subMatch[3], currentX, lineY);
                            currentX += ctx.measureText(subMatch[3]).width;
                        }
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
