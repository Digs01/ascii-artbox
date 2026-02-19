import { Layer } from '../../types/layer';
import { useCallback, useRef, useState } from 'react';

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
    audioMetrics?: { bass: number; mid: number; treble: number; volume: number };
    isRecording?: boolean;
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
    audioMetrics,
    isRecording = false
}: CompositionCanvasProps) {

    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const activeLayerRef = useRef<Layer | null>(null);

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
        if (!isDragging || !activeLayerRef.current) return;

        const dx = (e.clientX - dragStartRef.current.x) / scale;
        const dy = (e.clientY - dragStartRef.current.y) / scale;

        onUpdateTransform(activeLayerRef.current.id, {
            x: activeLayerRef.current.transform.x + dx,
            y: activeLayerRef.current.transform.y + dy
        });

        dragStartRef.current = { x: e.clientX, y: e.clientY };
    }, [isDragging, onUpdateTransform, scale]);

    const handleMouseUp = () => {
        if (isDragging && activeLayerRef.current && onUpdateTransformEnd) {
            onUpdateTransformEnd(activeLayerRef.current.id, activeLayerRef.current.transform);
        }
        setIsDragging(false);
        activeLayerRef.current = null;
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
            onMouseLeave={handleMouseUp}
        >
            {/* Background/Grid can go here */}

            {[...layers].reverse().map((layer) => {
                if (!layer.visible) return null;

                const activeFrame = layer.frames.length > 0
                    ? layer.frames[globalFrameCount % layer.frames.length]
                    : '';

                // --- AUDIO REACTIVITY ---
                let transform = { ...layer.transform };
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

                return (
                    <div key={layer.id} className="absolute w-full h-full pointer-events-none">
                        {svgFilter}
                        <div
                            className={`absolute origin-center transition-transform select-none ${activeLayerId === layer.id ? 'z-10 pointer-events-auto' : 'pointer-events-auto'} ${activeLayerId === layer.id && activeFrame ? 'outline outline-1 outline-accent-primary' : ''} ${transform.lut && transform.lut !== 'none' ? `lut-${transform.lut}` : ''}`}
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotation}deg) scale(${transform.scale}) scaleX(${transform.flipX ? -1 : 1}) scaleY(${transform.flipY ? -1 : 1})`,
                                opacity: transform.opacity,
                                mixBlendMode: transform.blendMode as any,
                                filter: filterStyle
                            }}
                            onMouseDown={(e) => handleMouseDown(e, layer)}
                        >
                            {/* Render the ASCII Content */}
                            <pre
                                className="whitespace-pre font-mono leading-none"
                                style={{
                                    fontSize: `${layer.options.fontSize}px`,
                                    lineHeight: `${layer.options.fontSize}px`,
                                    color: layer.options.colorMode ? undefined : layer.options.color
                                }}
                                dangerouslySetInnerHTML={{ __html: activeFrame }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
