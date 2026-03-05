import { Layer } from '../../types/layer';
import { useCallback, useRef, useState, useEffect, memo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useFluidDynamics } from '../../hooks/useFluidDynamics';
import { WebGLKineticRenderer } from './WebGLKineticRenderer';
import { ModelRenderer } from './ModelRenderer';

import { getInterpolatedValue } from '../../utils/interpolation';

interface CompositionCanvasProps {
    layers: Layer[];
    activeLayerId: string | null;
    onSelectLayer: (id: string) => void;
    onUpdateTransform: (id: string, transform: { x: number; y: number }) => void;
    onUpdateTransformEnd?: (id: string, transform: { x: number; y: number }) => void;
    width: number; // Container width
    height: number; // Container height
    scale: number; // Zoom scale
    globalFrameCount: number;
    currentTime?: number;
    maxDuration?: number;
    audioMetrics?: { bass: number; mid: number; treble: number; volume: number };
    isRecording?: boolean;
    globalEffects?: {
        enable3D: boolean;
        depthOffset: number;
        bloom: boolean;
        bloomRadius: number;
        chromaticAberration: boolean;
        aberrationOffset: number;
        crtScanlines: boolean;
        scanlineWidth: number;
        scanlineOpacity: number;
        vignette: boolean;
        vignetteIntensity: number;
        vignetteSize: number;
        fluidDynamics?: boolean;
        fluidForce?: number;
        fluidRadius?: number;
        fluidViscosity?: number;
    };
}

export function CompositionCanvas({
    layers,
    activeLayerId,
    onSelectLayer,
    onUpdateTransform,
    onUpdateTransformEnd,
    width,
    height,
    scale = 1,
    globalFrameCount = 0,
    currentTime = 0,
    maxDuration = 5,
    audioMetrics,
    isRecording = false,
    globalEffects
}: CompositionCanvasProps) {

    const [dragMode, setDragMode] = useState<'translate' | 'scale' | 'rotate' | null>(null);
    const dragStartRef = useRef({ x: 0, y: 0, initialTransform: { x: 0, y: 0, scale: 1, rotation: 0 } });
    const activeLayerRef = useRef<Layer | null>(null);

    // --- 3D INTERACTIVE HOLOGRMA ---
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    const rotateX = useTransform(y, [-400, 400], [15, -15]);
    const rotateY = useTransform(x, [-400, 400], [-15, 15]);

    // --- FLUID DYNAMICS ---
    const fluid = useFluidDynamics({
        enabled: globalEffects?.fluidDynamics || false,
        force: globalEffects?.fluidForce,
        radius: globalEffects?.fluidRadius,
        viscosity: globalEffects?.fluidViscosity,
        gridResolution: 12 // approximate font size for grid matching
    });

    const handleMouseDown = (e: React.MouseEvent, layer: Layer, mode: 'translate' | 'scale' | 'rotate' = 'translate') => {
        if (layer.locked) return;

        e.stopPropagation();
        e.preventDefault();
        onSelectLayer(layer.id);
        setIsDragging(true);
        setDragMode(mode);
        dragStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            initialTransform: { ...layer.transform }
        };
        activeLayerRef.current = layer;
    };

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        // Record Mouse for Fluid Dynamics
        if (globalEffects?.fluidDynamics) {
            fluid.pointerMove(e.nativeEvent, e.currentTarget.getBoundingClientRect());
        }

        if (globalEffects?.enable3D && !isDragging) {
            const rect = e.currentTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            mouseX.set(e.clientX - centerX);
            mouseY.set(e.clientY - centerY);
        }

        if (!isDragging || !activeLayerRef.current || !dragMode) return;

        const dx = (e.clientX - dragStartRef.current.x) / scale;
        const dy = (e.clientY - dragStartRef.current.y) / scale;
        const initial = dragStartRef.current.initialTransform;

        if (dragMode === 'translate') {
            onUpdateTransform(activeLayerRef.current.id, {
                x: initial.x + dx,
                y: initial.y + dy
            });
        } else if (dragMode === 'scale') {
            // Simple uniform scale based on primary diagonal drag distance
            // Negative dx/dy means dragging left/up (shrinking)
            // We use the dominant axis movement to scale uniformly
            const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy) * 0.01;
            const newScale = Math.max(0.1, initial.scale + delta);
            onUpdateTransform(activeLayerRef.current.id, { scale: newScale });
        } else if (dragMode === 'rotate') {
            // Calculate angle between center of element and mouse position
            // Since dx/dy are relative to start click, we map the x movement to rotation
            // 1px = roughly 1 degree for intuitive scrubbing
            const newRotation = initial.rotation + dx;
            onUpdateTransform(activeLayerRef.current.id, { rotation: newRotation });
        }
    }, [isDragging, dragMode, onUpdateTransform, scale, globalEffects, fluid]);

    const handleMouseUp = () => {
        if (isDragging && activeLayerRef.current && onUpdateTransformEnd) {
            onUpdateTransformEnd(activeLayerRef.current.id, activeLayerRef.current.transform);
        }
        setIsDragging(false);
        setDragMode(null);
        activeLayerRef.current = null;
    };

    const handleMouseLeave = () => {
        handleMouseUp();
        if (globalEffects?.enable3D) {
            mouseX.set(0);
            mouseY.set(0);
        }
    };

    // Helper to generate depth-mapped HTML or standard HTML
    // This logic is duplicated from page.tsx, we should probably extract it, 
    // but for now keeping it simple or maybe we pass rendered content?
    // Passing rendered content might be heavy if we re-render often.
    // Actually, we can reuse the renderer logic or just render the frames here.


    return (
        <div
            className={`relative overflow-hidden select-none ${isRecording ? '!cursor-none [&_*]:!cursor-none' : ''}`}
            style={{
                width: '100%',
                height: '100%',
                minHeight: '500px',
                // Inline styles override classes, so we only set cursor inline if NOT recording
                // Wait, if recording, CSS '!cursor-none' wins over inline? Yes with '!'
                // But inline is specific. Let's ensure inline cursor IS default if not recording.
                cursor: isRecording ? 'none' : (isDragging && dragMode === 'translate' ? 'grabbing' : 'default')
                // But wait, if isRecording is true, we force 'none' anyway?
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        >
            {/* GLOBAL OVERLAYS (Screen Space) */}
            {globalEffects?.crtScanlines && (
                <div className="absolute inset-0 z-[100] pointer-events-none"
                    style={{
                        opacity: globalEffects.scanlineOpacity ?? 0.2,
                        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))`,
                        backgroundSize: `100% ${globalEffects.scanlineWidth ?? 4}px, 6px 100%`,
                        mixBlendMode: 'multiply' // Helps it blend into bright ASCII art organically
                    }}
                />
            )}
            {globalEffects?.vignette && (
                <div className="absolute inset-0 z-[90] pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at center, transparent ${globalEffects.vignetteSize ?? 40}%, rgba(0,0,0,${globalEffects.vignetteIntensity ?? 0.8}) 120%)`,
                        mixBlendMode: 'multiply'
                    }}
                />
            )}

            <motion.div
                style={{
                    width: '100%',
                    height: '100%',
                    perspective: globalEffects?.enable3D ? 1200 : 'none',
                    rotateX: globalEffects?.enable3D ? rotateX : 0,
                    rotateY: globalEffects?.enable3D ? rotateY : 0,
                    transformStyle: "preserve-3d"
                }}
                className="relative w-full h-full"
            >
                {layers.map((layer, index) => (
                    <AsciiLayer
                        key={layer.id}
                        layer={layer}
                        index={index}
                        totalLayers={layers.length}
                        activeLayerId={activeLayerId}
                        globalFrameCount={globalFrameCount}
                        currentTime={currentTime}
                        audioMetrics={audioMetrics}
                        globalEffects={globalEffects}
                        onMouseDown={handleMouseDown}
                        fluid={fluid}
                        isRecording={isRecording}
                    />
                ))}
            </motion.div>
        </div>
    );
}

// Memoized Layer Component to isolate re-renders
const AsciiLayer = memo(({
    layer,
    index,
    totalLayers,
    activeLayerId,
    globalFrameCount,
    currentTime,
    audioMetrics,
    globalEffects,
    onMouseDown,
    fluid
}: {
    layer: Layer;
    index: number;
    totalLayers: number;
    activeLayerId: string | null;
    globalFrameCount: number;
    currentTime: number;
    audioMetrics: any;
    globalEffects: any;
    onMouseDown: (e: React.MouseEvent, layer: Layer, mode?: 'translate' | 'scale' | 'rotate') => void;
    fluid: any;
    isRecording: boolean;
}) => {
    if (!layer.visible) return null;

    const activeFrame = layer.frames.length > 0
        ? layer.frames[Math.floor(currentTime * (layer.fps || 12)) % Math.max(1, layer.frames.length)]
        : '';

    // --- KEYFRAME INTERPOLATION ---
    const t = layer.transform;
    const o = layer.options;
    const tracks = layer.animationTracks || [];

    let transform = {
        ...t,
        x: getInterpolatedValue(tracks, 'transform.x', currentTime, t.x),
        y: getInterpolatedValue(tracks, 'transform.y', currentTime, t.y),
        scale: getInterpolatedValue(tracks, 'transform.scale', currentTime, t.scale),
        rotation: getInterpolatedValue(tracks, 'transform.rotation', currentTime, t.rotation),
        opacity: getInterpolatedValue(tracks, 'transform.opacity', currentTime, t.opacity),
    };

    let options = {
        ...o,
        fontSize: getInterpolatedValue(tracks, 'options.fontSize', currentTime, o.fontSize),
        color: getInterpolatedValue(tracks, 'options.color', currentTime, o.color),
    };

    // --- AUDIO REACTIVITY ---
    let filterStyle = '';
    let svgFilter = null;

    if (audioMetrics && layer.transform.audioReact?.enabled) {
        const { source, target, strength, invert } = layer.transform.audioReact;
        const val = audioMetrics[source] || 0;
        const factor = invert ? (1 - val) : val;
        const mod = factor * strength;

        if (target === 'scale') {
            transform.scale = transform.scale * (1 + mod);
        } else if (target === 'opacity') {
            transform.opacity = Math.min(1, Math.max(0.1, transform.opacity * (1 + (mod - 0.5))));
        } else if (target === 'rotation') {
            transform.rotation = transform.rotation + (mod * 60 - 30);
        } else if (target === 'distortion') {
            const distortionScale = mod * 60;
            const filterId = `distort-${layer.id}`;
            filterStyle = `url(#${filterId})`;

            svgFilter = (
                <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                    <defs>
                        <filter id={filterId}>
                            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="3" result="noise" seed={globalFrameCount} />
                            <feDisplacementMap in="SourceGraphic" in2="noise" scale={distortionScale} xChannelSelector="R" yChannelSelector="G" />
                        </filter>
                    </defs>
                </svg>
            );
        } else if (target === 'hue') {
            filterStyle = `sepia(1) saturate(5) hue-rotate(${mod * 360}deg)`;
        } else if (target === 'rgb-split') {
            const offset = mod * 20;
            filterStyle += ` drop-shadow(${offset}px 0px 2px rgba(255,0,0,0.8)) drop-shadow(-${offset}px 0px 2px rgba(0,0,255,0.8))`;
        }
    }

    // --- GLOBAL EFFECTS POST-PROCESSING ---
    if (globalEffects?.chromaticAberration) {
        filterStyle += ' drop-shadow(4px 0px 0px rgba(255,0,0,0.7)) drop-shadow(-4px 0px 0px rgba(0,255,255,0.7))';
    }

    if (globalEffects?.bloom) {
        const radius = globalEffects.bloomRadius || 8;
        filterStyle += ` drop-shadow(0px 0px ${radius}px currentColor) drop-shadow(0px 0px ${radius * 2}px currentColor)`;
    }

    // --- GRID DIMENSIONS (Unify 0.6 Aspect Ratio) ---
    let contentSize = { w: 0, h: 0 };
    if (activeFrame) {
        const fontSize = options.fontSize || 12;
        const charAdvance = fontSize * 0.6;
        const lines = activeFrame.split('\n');

        let charCount = 0;
        if (options.renderMode === 'kinetic') {
            charCount = lines[0] ? lines[0].split('|').filter(Boolean).length : 0;
        } else {
            // Strip HTML and unescape for accurate char count across ALL lines
            let maxLineLength = 0;
            for (let i = 0; i < lines.length; i++) {
                const cleanLine = lines[i]
                    ? lines[i].replace(/<[^>]*>/g, '')
                        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
                    : '';
                if (cleanLine.length > maxLineLength) {
                    maxLineLength = cleanLine.length;
                }
            }
            charCount = maxLineLength;
        }

        contentSize = {
            w: (charCount * charAdvance) + 2, // +2px buffer for subpixel anti-aliasing bleed
            h: (lines.length * fontSize) + 2
        };
    }

    return (
        <div className="absolute w-full h-full pointer-events-none overflow-visible" style={{ zIndex: totalLayers - index }}>
            {svgFilter}
            <div
                className={`absolute origin-center select-none pointer-events-auto overflow-visible ${transform.lut && transform.lut !== 'none' ? `lut-${transform.lut}` : ''}`}
                style={{
                    left: '50%',
                    top: '50%',
                    width: contentSize.w > 0 ? `${contentSize.w}px` : undefined,
                    height: contentSize.h > 0 ? `${contentSize.h}px` : undefined,
                    transform: `translate(-50%, -50%) translate3d(${transform.x}px, ${transform.y}px, ${globalEffects?.enable3D ? index * 40 : 0}px) rotate(${transform.rotation}deg) scale(${transform.scale}) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
                    opacity: transform.opacity,
                    mixBlendMode: transform.blendMode as any,
                    filter: filterStyle,
                    transformStyle: "preserve-3d",
                    backgroundColor: options.removeBackground ? 'transparent' : (options.bgTheme?.bg || 'transparent')
                }}
                onMouseDown={(e) => onMouseDown(e, layer)}
            >
                {/* Render the Content */}
                {layer.type === 'text' ? (
                    <div
                        className="whitespace-pre-wrap font-black leading-none text-center"
                        style={{
                            fontSize: `${options.fontSize || 120}px`,
                            lineHeight: 1,
                            color: options.color,
                            fontFamily: 'Inter, system-ui, sans-serif'
                        }}
                    >
                        {options.overlayText || 'TEXT'}
                    </div>
                ) : layer.type === 'model' ? (
                    <ModelRenderer layer={layer} />
                ) : options.renderMode === 'kinetic' ? (
                    <WebGLKineticRenderer
                        frame={activeFrame}
                        layer={{ ...layer, options, transform }}
                        audioMetrics={audioMetrics}
                        fluid={fluid}
                        globalEffects={globalEffects}
                    />
                ) : options.colorMode || activeFrame.includes('<span') ? (
                    <ColorCanvasRenderer
                        frame={activeFrame}
                        layer={{ ...layer, options, transform }}
                        audioMetrics={audioMetrics}
                        globalEffects={globalEffects}
                    />
                ) : (
                    <pre
                        className="whitespace-pre font-mono leading-none w-full h-full text-left"
                        style={{
                            fontSize: `${options.fontSize}px`,
                            lineHeight: `${options.fontSize}px`,
                            color: options.color,
                            margin: 0,
                            padding: 0
                        }}
                    >
                        {activeFrame}
                    </pre>
                )}

                {/* Transform Gizmo Overlay */}
                {layer.id === activeLayerId && !isRecording && (
                    <div className="absolute inset-0 border-2 border-primary/80 pointer-events-none" style={{ left: -1, right: -1, top: -1, bottom: -1 }}>
                        {/* Rotation Handle */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-ew-resize"
                            onMouseDown={(e) => onMouseDown(e, layer, 'rotate')}>
                            <div className="w-3 h-3 bg-white border-2 border-primary rounded-full hover:scale-125 transition-transform" />
                            <div className="w-0.5 h-4 bg-primary/80" />
                        </div>

                        {/* Scale Handles (Corners) */}
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-primary pointer-events-auto cursor-nwse-resize hover:scale-125 transition-transform"
                            onMouseDown={(e) => onMouseDown(e, layer, 'scale')} />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-primary pointer-events-auto cursor-nesw-resize hover:scale-125 transition-transform"
                            onMouseDown={(e) => onMouseDown(e, layer, 'scale')} />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-primary pointer-events-auto cursor-nesw-resize hover:scale-125 transition-transform"
                            onMouseDown={(e) => onMouseDown(e, layer, 'scale')} />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-primary pointer-events-auto cursor-nwse-resize hover:scale-125 transition-transform"
                            onMouseDown={(e) => onMouseDown(e, layer, 'scale')} />
                    </div>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    // Custom Memoization Comparison
    // We only re-render if:
    // 1. Layer base data / keyframes changed
    // 2. It's the active layer (for cursor/selection)
    // 3. CurrentTime changed AND layer has keyframes
    // 4. Global frame count changed AND layer has multiple frames (animation)
    // 5. Global effects changed
    // 6. Audio metrics changed AND audio reactivity is ON

    if (prev.layer !== next.layer) return false;
    if (prev.globalEffects !== next.globalEffects) return false;
    if (prev.activeLayerId !== next.activeLayerId && (prev.layer.id === prev.activeLayerId || prev.layer.id === next.activeLayerId)) return false;

    // Check keyframe animation
    if (prev.currentTime !== next.currentTime) {
        const hasKeyframes = next.layer.animationTracks && next.layer.animationTracks.length > 0;
        if (hasKeyframes) return false;
    }

    // Check frame animation
    if (prev.globalFrameCount !== next.globalFrameCount) {
        if (next.layer.frames.length > 1) return false;
    }

    // Audio reactivity check
    if (prev.audioMetrics !== next.audioMetrics) {
        if (next.layer.transform.audioReact?.enabled) return false;
    }

    return true;
});

// Dedicated inline Canvas renderer for Color HTML mode to vastly improve performance
const ColorCanvasRenderer = ({ frame, layer, audioMetrics, globalEffects }: { frame: string, layer: Layer, audioMetrics?: any, globalEffects?: any }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !frame) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const fontSize = layer.options.fontSize || 12;
        const lines = frame.split('\n');
        const tokens: { char: string, color: string, x: number, lineY: number }[] = [];
        let maxChars = 0;

        lines.forEach((line, i) => {
            let currentX = 0;
            const lineY = i * fontSize;
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

                            tokens.push({ char, color: parsedColor, x: currentX, lineY });
                            currentX++;
                            j = closeTagIndex + 7;
                        } else {
                            tokens.push({ char: line[j], color: layer.options.color || 'white', x: currentX, lineY });
                            currentX++;
                            j++;
                        }
                    } else {
                        tokens.push({ char: line[j], color: layer.options.color || 'white', x: currentX, lineY });
                        currentX++;
                        j++;
                    }
                } else {
                    const nextSpan = line.indexOf('<span', j);
                    const endIdx = nextSpan !== -1 ? nextSpan : line.length;
                    const chunk = line.substring(j, endIdx);
                    // unescape
                    const unescapedChunk = chunk.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                    for (let c = 0; c < unescapedChunk.length; c++) {
                        tokens.push({ char: unescapedChunk[c], color: layer.options.color || 'white', x: currentX, lineY });
                        currentX++;
                    }
                    j = endIdx;
                }
            }
            if (currentX > maxChars) maxChars = currentX;
        });

        // Use precise Monospace font rendering matching the backend aspect ratio (0.6)
        ctx.font = `${fontSize}px monospace`;
        const charAdvance = fontSize * 0.6; // Consistent 0.6 ratio

        // Add padding if Phosphor Bloom is active to allow CSS drop-shadow to bleed over without hard clipping
        const bloomPadding = globalEffects?.bloom ? (globalEffects.bloomRadius || 8) * 3 : 2;

        const gridWidth = Math.ceil(maxChars * charAdvance) + (bloomPadding * 2);
        const totalHeight = (lines.length * fontSize) + (bloomPadding * 2);

        if (canvas.width !== gridWidth || canvas.height !== totalHeight) {
            canvas.width = gridWidth || 800;
            canvas.height = totalHeight || 600;
            // re-apply font setting since context resets on resize
            ctx.font = `${fontSize}px monospace`;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.textBaseline = 'top';

        // Draw batched
        let lastColor = null;
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.char !== ' ') {
                if (t.color !== lastColor) {
                    ctx.fillStyle = t.color;
                    lastColor = t.color;
                }
                ctx.fillText(t.char, (t.x * charAdvance) + bloomPadding, t.lineY + bloomPadding);
            }
        }
    }, [frame, layer, audioMetrics, globalEffects]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                display: 'block',
                position: 'absolute',
                top: -(globalEffects?.bloom ? (globalEffects.bloomRadius || 8) * 3 : 2),
                left: -(globalEffects?.bloom ? (globalEffects.bloomRadius || 8) * 3 : 2)
            }}
        />
    );
};

