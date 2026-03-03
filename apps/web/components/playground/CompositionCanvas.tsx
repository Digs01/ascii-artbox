import { Layer } from '../../types/layer';
import { useCallback, useRef, useState, useEffect } from 'react';
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

    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
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

    const handleMouseDown = (e: React.MouseEvent, layer: Layer) => {
        if (layer.locked) return;

        e.stopPropagation();
        e.preventDefault();
        onSelectLayer(layer.id);
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
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

        if (!isDragging || !activeLayerRef.current) return;

        const dx = (e.clientX - dragStartRef.current.x) / scale;
        const dy = (e.clientY - dragStartRef.current.y) / scale;

        onUpdateTransform(activeLayerRef.current.id, {
            x: activeLayerRef.current.transform.x + dx,
            y: activeLayerRef.current.transform.y + dy
        });

        dragStartRef.current = { x: e.clientX, y: e.clientY };
    }, [isDragging, onUpdateTransform, scale, globalEffects, fluid]);

    const handleMouseUp = () => {
        if (isDragging && activeLayerRef.current && onUpdateTransformEnd) {
            onUpdateTransformEnd(activeLayerRef.current.id, activeLayerRef.current.transform);
        }
        setIsDragging(false);
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
                cursor: isRecording ? 'none' : (isDragging ? 'grabbing' : 'default')
                // But wait, if isRecording is true, we force 'none' anyway?
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        >
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
                {/* GLOBAL OVERLAYS */}
                {globalEffects?.crtScanlines && (
                    <div className="absolute inset-0 z-[100] pointer-events-none"
                        style={{
                            opacity: globalEffects.scanlineOpacity ?? 0.2,
                            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))`,
                            backgroundSize: `100% ${globalEffects.scanlineWidth ?? 4}px, 6px 100%`,
                            transform: 'translateZ(1000px)' // Force overlay to front
                        }}
                    />
                )}
                {globalEffects?.vignette && (
                    <div className="absolute inset-0 z-[90] pointer-events-none"
                        style={{
                            background: `radial-gradient(circle at center, transparent ${globalEffects.vignetteSize ?? 40}%, rgba(0,0,0,${globalEffects.vignetteIntensity ?? 0.8}) 120%)`,
                            transform: 'translateZ(900px)' // Force overlay space
                        }}
                    />
                )}

                {[...layers].reverse().map((layer, index) => {
                    if (!layer.visible) return null;

                    const activeFrame = layer.frames.length > 0
                        ? layer.frames[Math.floor(globalFrameCount) % layer.frames.length]
                        : '';

                    // --- KEYFRAME INTERPOLATION ---
                    // Merge active layer transforms and options with interpolated keyframe values
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
                        const mod = factor * strength; // 0 to ~2

                        if (target === 'scale') {
                            transform.scale = transform.scale * (1 + mod);
                        } else if (target === 'opacity') {
                            transform.opacity = Math.min(1, Math.max(0.1, transform.opacity * (1 + (mod - 0.5))));
                        } else if (target === 'rotation') {
                            transform.rotation = transform.rotation + (mod * 60 - 30);
                        } else if (target === 'distortion') {
                            // SVG Displacement Filter
                            const distortionScale = mod * 60; // Increased from 30 to 60 for more visible glitch
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
                            // Force some color (sepia+saturate) so white text actually changes color
                            filterStyle = `sepia(1) saturate(5) hue-rotate(${mod * 360}deg)`;
                        } else if (target === 'rgb-split') {
                            const offset = mod * 20; // Increased from 10 to 20
                            // Use text-shadow for chromatic aberration on text
                            // Red shift left, Blue shift right, with blur for glow
                            filterStyle += ` drop-shadow(${offset}px 0px 2px rgba(255,0,0,0.8)) drop-shadow(-${offset}px 0px 2px rgba(0,0,255,0.8))`;
                        }
                    }

                    // --- GLOBAL EFFECTS POST-PROCESSING ---
                    if (globalEffects?.chromaticAberration) {
                        filterStyle += ' drop-shadow(4px 0px 0px rgba(255,0,0,0.7)) drop-shadow(-4px 0px 0px rgba(0,255,255,0.7))';
                    }

                    if (globalEffects?.bloom) {
                        // Phosphor bloom multiplies the color glow
                        filterStyle += ' drop-shadow(0px 0px 8px currentColor) drop-shadow(0px 0px 16px currentColor)';
                    }

                    // --- KINETIC GRID DIMENSIONS ---
                    let kineticSize = { w: 0, h: 0 };
                    if (options.renderMode === 'kinetic' && activeFrame) {
                        const fontSize = options.fontSize || 12;
                        const lines = activeFrame.split('\n');
                        const maxChars = lines[0] ? lines[0].split('|').filter(Boolean).length : 0;
                        kineticSize = {
                            w: maxChars * (fontSize * 0.6),
                            h: lines.length * fontSize
                        };
                    }

                    return (
                        <div key={layer.id} className="absolute w-full h-full pointer-events-none">
                            {svgFilter}
                            <div
                                className={`absolute origin-center select-none ${activeLayerId === layer.id ? 'z-10 pointer-events-auto' : 'pointer-events-auto'} ${activeLayerId === layer.id && activeFrame ? 'outline outline-1 outline-accent-primary' : ''} ${transform.lut && transform.lut !== 'none' ? `lut-${transform.lut}` : ''}`}
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    width: kineticSize.w > 0 ? `${kineticSize.w}px` : undefined,
                                    height: kineticSize.h > 0 ? `${kineticSize.h}px` : undefined,
                                    // Use transform.z or index spacing if 3D is on
                                    transform: `translate(-50%, -50%) translate3d(${transform.x}px, ${transform.y}px, ${globalEffects?.enable3D ? index * 40 : 0}px) rotate(${transform.rotation}deg) scale(${transform.scale}) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
                                    opacity: transform.opacity,
                                    mixBlendMode: transform.blendMode as any,
                                    filter: filterStyle,
                                    transformStyle: "preserve-3d" // Pass 3D context to children
                                }}
                                onMouseDown={(e) => handleMouseDown(e, layer)}
                            >
                                {/* Render the Content */}
                                {layer.type === 'text' ? (
                                    <div
                                        className="whitespace-pre-wrap font-black leading-none text-center"
                                        style={{
                                            fontSize: `${options.fontSize || 120}px`,
                                            lineHeight: 1,
                                            color: options.color,
                                            fontFamily: 'Inter, system-ui, sans-serif' // Standard bold sans for masking
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
                                    />
                                ) : options.colorMode || activeFrame.includes('<span') ? (
                                    <ColorCanvasRenderer
                                        frame={activeFrame}
                                        layer={{ ...layer, options, transform }}
                                        audioMetrics={audioMetrics}
                                    />
                                ) : (
                                    <pre
                                        className="whitespace-pre font-mono leading-none"
                                        style={{
                                            fontSize: `${options.fontSize}px`,
                                            lineHeight: `${options.fontSize}px`,
                                            color: options.color
                                        }}
                                    >
                                        {activeFrame}
                                    </pre>
                                )}
                            </div>
                        </div>
                    );
                })}
            </motion.div>
        </div>
    );
}

// Dedicated inline Canvas renderer for Color HTML mode to vastly improve performance
const ColorCanvasRenderer = ({ frame, layer, audioMetrics }: { frame: string, layer: Layer, audioMetrics?: any }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!canvasRef.current || !frame) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const fontSize = layer.options.fontSize || 12;
        let baseOpacity = layer.transform.opacity;

        if (layer.transform.audioReact?.enabled && audioMetrics) {
            const { source, target, strength, invert } = layer.transform.audioReact;
            const val = audioMetrics[source] || 0;
            const factor = invert ? (1 - val) : val;
            const mod = factor * strength;
            if (target === 'opacity') baseOpacity = Math.min(1, Math.max(0.1, baseOpacity * (1 + (mod - 0.5))));
        }

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

        // Use precise Monospace font rendering
        ctx.font = `${fontSize}px monospace`;
        const charAdvance = Math.ceil(ctx.measureText('M').width) || (fontSize * 0.6);

        const gridWidth = Math.ceil(maxChars * charAdvance);
        const totalHeight = Math.ceil(lines.length * fontSize);

        if (canvas.width !== gridWidth || canvas.height !== totalHeight) {
            canvas.width = gridWidth || 800;
            canvas.height = totalHeight || 600;
            // re-apply font setting since context resets on resize
            ctx.font = `${fontSize}px monospace`;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.textBaseline = 'top';
        ctx.globalAlpha = baseOpacity;

        // Draw batched
        let lastColor = null;
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            if (t.char !== ' ') {
                if (t.color !== lastColor) {
                    ctx.fillStyle = t.color;
                    lastColor = t.color;
                }
                ctx.fillText(t.char, t.x * charAdvance, t.lineY);
            }
        }
    }, [frame, layer, audioMetrics]);

    return <canvas ref={canvasRef} style={{ display: 'block' }} />;
};

