import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LayoutList, UploadCloud, Pipette, Camera, CameraOff } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { Slider } from '../ui/Slider';
import { LayerManager } from './LayerManager';
import { AudioControlPanel } from './AudioControlPanel';
import { useToast } from '../ui/ToastContext';
import { Layer, LayerOptions } from '../../types/layer';
import { getInterpolatedValue } from '../../utils/interpolation';
import { MONOSPACE_FONTS } from '../../config/fonts';

const DEFAULT_CHARSET = " .:-=+*#%@";
const DENSE_CHARSET = "@%#*+=-:. ";
const MATRIX_CHARSET = "01";

const COLOR_PRESETS = [
    { label: 'White', value: '#ffffff' },
    { label: 'Green', value: '#00ff00' },
    { label: 'Amber', value: '#ffb000' },
    { label: 'Cyan', value: '#00ffff' },
    { label: 'Pink', value: '#ff6ec7' },
    { label: 'Red', value: '#ff3333' },
];

const BG_THEMES = [
    { label: 'Black', bg: '#000000', border: 'border-border' },
    { label: 'Dark', bg: '#121212', border: 'border-border-hover' },
    { label: 'Terminal', bg: '#0a1a0a', border: 'border-green-900/30' },
    { label: 'Navy', bg: '#0a0a1a', border: 'border-blue-900/30' },
];

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

interface PlaygroundSidebarProps {
    layers: Layer[];
    activeLayer: Layer | undefined;
    activeLayerId: string | null;
    setActiveLayerId: (id: string | null) => void;
    updateLayer: (id: string, updates: Partial<Layer>) => void;
    updateLayerOptions: (id: string, options: Partial<Layer['options']>) => void;
    updateLayerTransform: (id: string, transform: Partial<Layer['transform']>) => void;
    replaceLayerOptions: (id: string, options: Partial<Layer['options']>) => void;
    removeLayer: (id: string) => void;
    duplicateLayer: (id: string) => void;
    reorderLayers: (newOrder: Layer[]) => void;
    addLayer: (file: File | null) => void;
    addKeyframe: (layerId: string, property: string, time: number, value: any) => void;

    loading: boolean;
    progress: number;
    generate: () => void;

    autoKeyframe: boolean;
    currentTime: number;

    audioAnalyzer: any;
    globalEffects: any;
    setGlobalEffects: React.Dispatch<React.SetStateAction<any>>;
    setShowPresetLibrary: (val: boolean) => void;
    handleFitToCanvas: (cover: boolean) => void;
    // Camera props (Feature 2: WebRTC Live Camera)
    cameraIsStreaming?: boolean;
    cameraDevices?: Array<{ deviceId: string; label: string }>;
    cameraSelectedDeviceId?: string;
    cameraError?: string | null;
    onStartCamera?: (deviceId?: string) => void;
    onStopCamera?: () => void;
    onCameraDeviceChange?: (deviceId: string) => void;
}

export const PlaygroundSidebar = ({
    layers, activeLayer, activeLayerId, setActiveLayerId, updateLayer,
    updateLayerOptions, updateLayerTransform, replaceLayerOptions,
    removeLayer, duplicateLayer, reorderLayers, addLayer, addKeyframe,
    loading, progress, generate, autoKeyframe, currentTime,
    audioAnalyzer, globalEffects, setGlobalEffects, setShowPresetLibrary, handleFitToCanvas,
    cameraIsStreaming, cameraDevices, cameraSelectedDeviceId, cameraError,
    onStartCamera, onStopCamera, onCameraDeviceChange
}: PlaygroundSidebarProps) => {

    const { toast } = useToast();

    // Local Sidebar State
    const [showEffects, setShowEffects] = useState(false);
    const [showGlobalEffects, setShowGlobalEffects] = useState(false);
    const [showAlgoSettings, setShowAlgoSettings] = useState(true);
    const [isDraggingFile, setIsDraggingFile] = useState(false);

    // Fallback options
    const options = activeLayer?.options || {} as any;

    const setOptions = useCallback((updater: (prev: LayerOptions) => LayerOptions) => {
        if (!activeLayerId || !activeLayer) return;
        const newOptions = updater(activeLayer.options);
        updateLayerOptions(activeLayerId, newOptions);
    }, [activeLayer, activeLayerId, updateLayerOptions]);

    const handleAnimatedPropChange = useCallback((
        propertyPath: string,
        value: any,
        baseUpdater: () => void
    ) => {
        if (!activeLayerId || !activeLayer) return;
        const tracks = activeLayer.animationTracks || [];
        const trackExists = tracks.some(t => t.property === propertyPath);
        if (autoKeyframe || trackExists) {
            addKeyframe(activeLayerId, propertyPath, currentTime, value);
        }
        baseUpdater();
    }, [activeLayerId, activeLayer, autoKeyframe, currentTime, addKeyframe]);

    const generateDensityCharset = useCallback((text: string) => {
        const uniqueChars = Array.from(new Set(text.split('')));
        if (uniqueChars.length < 2) {
            toast('Not enough unique characters to sort', 'error');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = 20;
        canvas.height = 20;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.font = '20px monospace';
        ctx.textBaseline = 'top';

        const measured = uniqueChars.map((char: string) => {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 20, 20);
            ctx.fillStyle = 'black';
            ctx.fillText(char, 2, 2);

            const imgData = ctx.getImageData(0, 0, 20, 20).data;
            let darkPixels = 0;
            for (let i = 0; i < imgData.length; i += 4) {
                if (imgData[i] < 128) darkPixels++;
            }
            return { char, density: darkPixels };
        });

        measured.sort((a, b) => a.density - b.density);
        const sortedCharset = measured.map(m => m.char).join('');
        const finalCharset = sortedCharset.startsWith(' ') ? sortedCharset : ' ' + sortedCharset.replace(' ', '');
        setOptions(p => ({ ...p, charset: finalCharset }));
        toast(`Charset sorted by density!`, 'success');
    }, [setOptions, toast]);

    const {
        width, inverted, videoFps, charset, color, fontSize, bgTheme,
        removeBackground, transparentColor, colorTolerance, colorMode, renderMode,
        posterize, clahe, frameDiff, dither, sharpen, blur, noise, overlayText, edgeThreshold
    } = options as LayerOptions || {};

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(false); };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingFile(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const f = e.dataTransfer.files[0];
            const isModel = f.name.toLowerCase().endsWith('.obj') || f.name.toLowerCase().endsWith('.glb') || f.name.toLowerCase().endsWith('.gltf');
            const isVideoExt = /\.(mp4|webm|avi|mov|mkv|gif)$/i.test(f.name);
            const extType = isModel ? 'model' : (f.type.startsWith('video/') || isVideoExt ? 'video' : 'image');

            if (activeLayer && !activeLayer.file) {
                if (activeLayer.previewUrl) URL.revokeObjectURL(activeLayer.previewUrl);
                updateLayer(activeLayer.id, {
                    file: f,
                    name: f.name,
                    previewUrl: isModel ? null : URL.createObjectURL(f),
                    type: extType
                });
            } else {
                addLayer(f);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            const isModel = f.name.toLowerCase().endsWith('.obj') || f.name.toLowerCase().endsWith('.glb') || f.name.toLowerCase().endsWith('.gltf');
            const isVideoExt = /\.(mp4|webm|avi|mov|mkv|gif)$/i.test(f.name);
            const extType = isModel ? 'model' : (f.type.startsWith('video/') || isVideoExt ? 'video' : 'image');

            if (activeLayer) {
                if (activeLayer.previewUrl) URL.revokeObjectURL(activeLayer.previewUrl);
                updateLayer(activeLayer.id, {
                    file: f,
                    name: f.name,
                    previewUrl: isModel ? null : URL.createObjectURL(f),
                    type: extType,
                    frames: []
                });
            } else {
                addLayer(f);
            }
        }
    };

    if (!activeLayer) return null;

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="w-[400px] flex flex-col border-r border-white/[0.05] bg-[#000000] shrink-0 z-10">
            {/* Header & Generate Button */}
            <div className="h-14 border-b border-white/[0.05] shrink-0 flex items-center justify-between px-4">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
                    <LayoutList size={12} /> Workstation
                </span>
                <Button onClick={generate} disabled={!activeLayer.file || loading} isLoading={loading} className="h-7 px-4 text-[10px] font-bold tracking-[0.1em] shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all bg-white text-black hover:bg-white/90 rounded-sm">
                    {loading ? '...' : 'GENERATE'}
                </Button>
            </div>
            {loading && (
                <div className="px-4 py-2 border-b border-white/[0.05] bg-black">
                    <div className="h-1 bg-surface-active rounded-full overflow-hidden mb-1">
                        <div className="h-full bg-white transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-mono text-text-muted">
                        <span>PIPELINE</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                </div>
            )}

            <motion.div variants={container} className="flex-1 overflow-y-auto custom-scrollbar">
                {/* LAYERS MANAGER */}
                <motion.div variants={item} className="p-4 border-b border-white/[0.05]">
                    <LayerManager
                        layers={layers}
                        activeLayerId={activeLayerId}
                        onSelectLayer={setActiveLayerId}
                        onToggleVisibility={(id) => {
                            const l = layers.find(x => x.id === id);
                            if (l) updateLayer(id, { visible: !l.visible });
                        }}
                        onToggleLock={(id) => {
                            const l = layers.find(x => x.id === id);
                            if (l) updateLayer(id, { locked: !l.locked });
                        }}
                        onRemoveLayer={removeLayer}
                        onDuplicateLayer={duplicateLayer}
                        onReorderLayers={reorderLayers}
                        onAddLayer={() => addLayer(null)}
                        onUpdateLayer={updateLayer}
                    />
                </motion.div>

                {/* SECTION 1: Source */}
                <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Source</h3>
                            <span className="text-[9px] text-text-secondary truncate max-w-[100px]">{activeLayer.name}</span>
                        </div>
                        <div className="flex gap-1 bg-black rounded p-0.5 border border-border">
                            <button onClick={() => updateLayer(activeLayer.id, { type: 'image' })} className={clsx('px-2 py-1 rounded text-[9px] uppercase transition-colors', activeLayer.type !== 'text' && activeLayer.type !== 'camera' ? 'bg-surface-active text-text-primary' : 'text-text-muted hover:text-text-primary')}>Media</button>
                            <button onClick={() => updateLayer(activeLayer.id, { type: 'text' })} className={clsx('px-2 py-1 rounded text-[9px] uppercase transition-colors', activeLayer.type === 'text' ? 'bg-surface-active text-text-primary' : 'text-text-muted hover:text-text-primary')}>Text</button>
                            <button onClick={() => { updateLayer(activeLayer.id, { type: 'camera', file: null, frames: [] }); }} className={clsx('px-2 py-1 rounded text-[9px] uppercase transition-colors flex items-center gap-1', activeLayer.type === 'camera' ? 'bg-accent-primary/20 text-accent-primary' : 'text-text-muted hover:text-text-primary')}><Camera size={9} />Live</button>
                        </div>
                    </div>

                    {/* Camera Source UI */}
                    {activeLayer.type === 'camera' ? (
                        <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-surface/30 border border-border/50 space-y-3">
                                <div className="text-[9px] text-text-muted uppercase tracking-widest font-bold">Camera Device</div>
                                {cameraDevices && cameraDevices.length > 0 ? (
                                    <select
                                        value={cameraSelectedDeviceId || ''}
                                        onChange={(e) => onCameraDeviceChange?.(e.target.value)}
                                        className="w-full bg-black border border-border rounded px-2 py-1 text-[10px] text-text-primary"
                                    >
                                        {cameraDevices.map(d => (
                                            <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="text-[9px] text-text-muted">No cameras found. Click Start to request access.</div>
                                )}
                                {cameraError && <div className="text-[9px] text-red-400">{cameraError}</div>}
                                <button
                                    onClick={() => cameraIsStreaming ? onStopCamera?.() : onStartCamera?.(cameraSelectedDeviceId)}
                                    className={clsx(
                                        'w-full py-2 rounded text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors',
                                        cameraIsStreaming
                                            ? 'bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30'
                                            : 'bg-accent-primary/20 border border-accent-primary/40 text-accent-primary hover:bg-accent-primary/30'
                                    )}
                                >
                                    {cameraIsStreaming ? <><CameraOff size={12} /> Stop Camera</> : <><Camera size={12} /> Start Camera</>}
                                </button>
                                {cameraIsStreaming && (
                                    <div className="flex items-center gap-2 text-[9px] text-green-400">
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                                        Live — ASCII updates at ~15fps
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeLayer.type === 'text' ? (
                        <div className="space-y-3">
                            <textarea
                                value={options.overlayText || ''}
                                onChange={(e) => setOptions(p => ({ ...p, overlayText: e.target.value }))}
                                placeholder="TYPE MASSIVE TEXT HERE..."
                                className="w-full h-32 bg-black border border-border rounded p-3 text-text-primary resize-none font-mono text-sm focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                            />
                            <div className="text-[10px] text-text-muted leading-tight">
                                <span className="text-accent-primary font-bold">PRO TIP:</span> Use this text layer as a <strong className="text-text-secondary">Clipping Mask</strong> over a video by setting its Blend Mode to "Multiply" in the Transform panel, and moving the text layer to the top.
                            </div>
                        </div>
                    ) : (
                        <div className={`relative group transition-all duration-200 ${isDraggingFile ? 'scale-[1.01]' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
                            <input type="file" accept="image/*,video/*,.obj,.gltf,.glb" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className={clsx("border border-dashed rounded-lg p-5 text-center transition-all", isDraggingFile ? 'border-accent-success bg-accent-success/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-border group-hover:border-border-hover')}>
                                {activeLayer.file ? (
                                    <div className="text-text-primary text-xs font-mono truncate">
                                        {activeLayer.file.name}
                                        <span className="block text-[10px] text-text-muted mt-1">{(activeLayer.file.size / 1024).toFixed(1)} KB</span>
                                    </div>
                                ) : (
                                    <div className={clsx("text-[10px] flex flex-col items-center gap-2", isDraggingFile ? 'text-accent-success' : 'text-text-muted transition-colors group-hover:text-text-secondary')}>
                                        <div className={clsx("p-2 rounded-full bg-white/[0.02] group-hover:bg-white/[0.05] transition-colors", isDraggingFile && "animate-bounce bg-accent-success/20 text-accent-success")}>
                                            <UploadCloud size={20} />
                                        </div>
                                        <span className="font-bold tracking-widest uppercase">{isDraggingFile ? 'DROP IT HERE' : 'DROP MEDIA OR 3D MODEL'}</span>
                                        <span className="text-[9px] font-normal opacity-70">.obj, .gltf, .glb, image, video</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeLayer.previewUrl && activeLayer.file && (
                        <div className="mt-3 rounded-lg overflow-hidden border border-border bg-black">
                            {activeLayer.type === 'video' ? (
                                <video src={activeLayer.previewUrl} className="w-full max-h-48 object-contain" autoPlay loop muted playsInline />
                            ) : (
                                <img src={activeLayer.previewUrl} alt="Source preview" className="w-full max-h-48 object-contain" />
                            )}
                        </div>
                    )}
                </motion.div>

                {/* MODEL CONTROLS */}
                {activeLayer.type === 'model' && activeLayer.file && (
                    <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-accent-primary uppercase tracking-widest">3D ASCII Point Cloud</h3>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent-primary/20 text-accent-primary">NEW</span>
                        </div>
                        {/* Mode toggle */}
                        <div className="space-y-2">
                            <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold">Render Mode</label>
                            <div className="flex gap-1 bg-black rounded p-0.5 border border-border">
                                <button
                                    onClick={() => setOptions(p => ({ ...p, modelRenderMode: 'ascii-point-cloud' }))}
                                    className={clsx('flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-colors',
                                        (options.modelRenderMode ?? 'ascii-point-cloud') === 'ascii-point-cloud' ? 'bg-accent-primary text-black' : 'text-text-muted hover:text-text-primary')}
                                >
                                    ASCII Point Cloud
                                </button>
                                <button
                                    onClick={() => setOptions(p => ({ ...p, modelRenderMode: 'viewport' }))}
                                    className={clsx('flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-colors',
                                        options.modelRenderMode === 'viewport' ? 'bg-surface-active text-text-primary' : 'text-text-muted hover:text-text-primary')}
                                >
                                    3D Viewport
                                </button>
                            </div>
                        </div>

                        {(options.modelRenderMode ?? 'ascii-point-cloud') === 'ascii-point-cloud' && (
                            <>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Auto-Rotate</div>
                                        <div className="text-[9px] text-text-secondary">Drag canvas to rotate manually</div>
                                    </div>
                                    <input type="checkbox" checked={options.modelAutoRotate ?? true} onChange={(e) => setOptions(p => ({ ...p, modelAutoRotate: e.target.checked }))} className="w-4 h-4 rounded bg-black border-border accent-accent-primary cursor-pointer" />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold">Character Density Map</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={options.charset || ' .:-=+*#%@'} onChange={(e) => setOptions(p => ({ ...p, charset: e.target.value }))} className="flex-1 bg-black border border-border rounded px-2 py-1 text-xs text-text-primary font-mono focus:border-accent-primary transition-colors" />
                                    </div>
                                    <div className="flex gap-1 flex-wrap mt-1">
                                        {[
                                            { label: 'Classic', value: ' .:-=+*#%@' },
                                            { label: 'Matrix', value: ' ░▒▓█' },
                                            { label: 'Binary', value: ' 01' },
                                            { label: 'Braille', value: '⣀⣄⣤⣦⣶⣷⣿' },
                                        ].map(p => (
                                            <button key={p.label} onClick={() => setOptions(opt => ({ ...opt, charset: p.value }))} className="text-[9px] px-2 py-0.5 border border-border rounded hover:border-accent-primary hover:text-accent-primary text-text-muted transition-colors">{p.label}</button>
                                        ))}
                                    </div>
                                </div>

                                <Slider label="Point Density (Font Size)" value={options.fontSize || 10} min={4} max={24} step={1} onChange={(v) => setOptions(p => ({ ...p, fontSize: v }))} valueDisplay={`${options.fontSize || 10}px`} />

                                <div className="space-y-2">
                                    <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold">Point Color</label>
                                    <div className="flex gap-2 h-9">
                                        <div className="relative flex-1 rounded border border-border overflow-hidden">
                                            <input type="color" value={options.color || '#00ff00'} onChange={(e) => setOptions(p => ({ ...p, color: e.target.value }))} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
                                            <div className="w-full h-full flex items-center justify-center" style={{ background: options.color || '#00ff00' }}>
                                                <span className="text-xs font-mono font-bold mix-blend-difference text-white pointer-events-none">{options.color || '#00ff00'}</span>
                                            </div>
                                        </div>
                                        {['#00ff00', '#00ffff', '#ff6ec7', '#ffb000', '#ffffff'].map(c => (
                                            <button key={c} onClick={() => setOptions(p => ({ ...p, color: c }))} className={clsx('w-9 h-9 rounded border transition-all', options.color === c ? 'border-2 border-white scale-110' : 'border-border hover:border-white/50')} style={{ background: c }} />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                        <div className="pt-1 text-[10px] text-text-muted border-t border-border/50">
                            <span className="text-accent-primary font-bold">TIP:</span> Drag the canvas to rotate. Each vertex is lit by surface normals — bright faces = dense chars.
                        </div>
                    </motion.div>
                )}

                {/* SECTION 2: ENGINE */}
                {['image', 'video'].includes(activeLayer.type) && (
                    <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-6">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Generative Engine</h3>
                        <div>
                            <label className="block text-xs text-text-muted mb-3 uppercase tracking-wider font-bold">Render Algorithm</label>
                            <div className="grid grid-cols-6 gap-1">
                                {[
                                    { value: 'standard' as const, label: 'Mode', icon: 'Aa' },
                                    { value: 'braille' as const, label: 'Dots', icon: '⣿' },
                                    { value: 'halfblock' as const, label: 'Pixel', icon: '▄▀' },
                                    { value: 'edge' as const, label: 'Edge', icon: '╱╲' },
                                    { value: 'silhouette' as const, label: 'Cutout', icon: '◐' },
                                    { value: 'kinetic' as const, label: 'Kinetic', icon: '3D' },
                                    { value: 'halftone' as const, label: 'Halftone', icon: '◉' },
                                    { value: 'matrix' as const, label: 'Matrix', icon: '雨' },
                                    { value: 'crosshatch' as const, label: 'Hatch', icon: '╳' },
                                    { value: 'mosaic' as const, label: 'Mosaic', icon: '◆' },
                                    { value: 'outline' as const, label: 'Outline', icon: '◻' },
                                    { value: 'stipple' as const, label: 'Stipple', icon: '∴' },
                                ].map(mode => (
                                    <button key={mode.value} onClick={() => setOptions(p => ({ ...p, renderMode: mode.value }))}
                                        className={clsx(
                                            "flex flex-col items-center py-2 rounded border transition-all cursor-pointer min-w-0 px-0.5",
                                            renderMode === mode.value
                                                ? 'border-accent-success bg-accent-success/5 text-text-primary shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                                                : 'border-surface bg-surface/50 hover:border-border hover:bg-surface text-text-muted hover:text-text-secondary'
                                        )}>
                                        <div className="text-sm">{mode.icon}</div>
                                        <div className="text-[8px] font-bold uppercase tracking-tight leading-none mt-1 w-full truncate text-center">{mode.label}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <motion.div variants={item} className="border-b border-white/[0.05]">
                            <div className="p-0 overflow-hidden card-hover-animation">
                                <button onClick={() => setShowAlgoSettings(!showAlgoSettings)} className="w-full px-5 py-4 flex items-center justify-between text-text-muted hover:text-text-primary transition-colors bg-surface-active/20">
                                    <div className="flex items-center gap-2"><span className="text-xs font-bold uppercase tracking-widest">Algorithm Settings</span></div>
                                    <span className="text-xs">{showAlgoSettings ? '▲' : '▼'}</span>
                                </button>

                                {showAlgoSettings && (
                                    <div className="p-5 space-y-5 border-t border-border">
                                        {/* Font Selector — Feature 3: Custom Font */}
                                        {renderMode !== 'kinetic' && activeLayer.type !== 'model' && (
                                            <div className="space-y-2">
                                                <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold">Display Font</label>
                                                <select
                                                    value={options.fontFamily || 'monospace'}
                                                    onChange={(e) => setOptions(p => ({ ...p, fontFamily: e.target.value }))}
                                                    className="w-full bg-black border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:border-accent-primary focus:outline-none"
                                                >
                                                    {MONOSPACE_FONTS.map(f => (
                                                        <option key={f.id} value={f.id}>{f.label}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[9px] text-text-muted">Affects canvas & SVG export rendering.</p>
                                            </div>
                                        )}
                                        {renderMode === 'kinetic' && (
                                            <div className="space-y-2">
                                                <label className="text-xs text-accent-primary uppercase tracking-wider font-bold">Kinetic Input Word</label>
                                                <input type="text" value={options.overlayText || ''} onChange={(e) => setOptions(p => ({ ...p, overlayText: e.target.value.toUpperCase() }))} placeholder="E.g. FUTURE" className="w-full bg-black border border-border rounded px-3 py-2 text-sm text-text-primary font-mono focus:border-accent-primary transition-colors" />
                                                <div className="text-[11px] text-text-muted mt-1">Words map brightness to 3D Z-depth and scale.</div>
                                            </div>
                                        )}
                                        {(renderMode === 'edge' || renderMode === 'outline') && (
                                            <Slider label="Edge Sensitivity" value={options.edgeThreshold || 30} min={5} max={100} onChange={(v) => setOptions(p => ({ ...p, edgeThreshold: v }))} valueDisplay={`${options.edgeThreshold || 30}`} />
                                        )}
                                        {(activeLayer?.file?.type.startsWith('image/') || renderMode === 'kinetic') && (
                                            <Slider label="Output Width" value={width} min={20} max={300} onChange={(v) => setOptions(p => ({ ...p, width: v }))} valueDisplay={`${width} CH`} />
                                        )}
                                        {(activeLayer.file?.type.startsWith('video/') || activeLayer.file?.name.toLowerCase().endsWith('.gif')) && (
                                            <Slider label="Motion FPS" value={videoFps || 12} min={1} max={30} onChange={(v) => setOptions(p => ({ ...p, videoFps: v }))} valueDisplay={`${videoFps} FPS`} />
                                        )}

                                        {renderMode !== 'kinetic' && (
                                            <div className="space-y-3 pt-3 border-t border-border/50">
                                                <label className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Processing Options</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {!['halfblock'].includes(renderMode) && (
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] text-text-muted uppercase tracking-tight">Invert Lighting</label>
                                                            <input type="checkbox" checked={!!inverted} onChange={(e) => setOptions(p => ({ ...p, inverted: e.target.checked }))} className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                                                        </div>
                                                    )}
                                                    {['standard', 'braille', 'edge', 'outline', 'silhouette', 'halftone', 'crosshatch', 'stipple'].includes(renderMode) && (
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] text-text-muted uppercase tracking-tight">Extract Colors</label>
                                                            <input type="checkbox" checked={!!colorMode} onChange={(e) => setOptions(p => ({ ...p, colorMode: e.target.checked }))} className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                                                        </div>
                                                    )}
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[10px] text-text-muted uppercase tracking-tight">Adaptive Contrast</label>
                                                        <input type="checkbox" checked={!!clahe} onChange={(e) => setOptions(p => ({ ...p, clahe: e.target.checked }))} className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                                                    </div>
                                                    {renderMode !== 'outline' && (
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] text-text-muted uppercase tracking-tight">Sharpen Detail</label>
                                                            <input type="checkbox" checked={!!sharpen} onChange={(e) => setOptions(p => ({ ...p, sharpen: e.target.checked }))} className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                                                        </div>
                                                    )}
                                                    {renderMode === 'standard' && (
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] text-text-muted uppercase tracking-tight">Luminance Dither</label>
                                                            <input type="checkbox" checked={!!dither} onChange={(e) => setOptions(p => ({ ...p, dither: e.target.checked }))} className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                                                        </div>
                                                    )}
                                                    {(activeLayer.file?.type.startsWith('video/') || activeLayer.file?.type === 'image/gif' || activeLayer.file?.name.toLowerCase().endsWith('.gif')) && (
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] text-text-muted uppercase tracking-tight">Isolate Motion</label>
                                                            <input type="checkbox" checked={!!frameDiff} onChange={(e) => setOptions(p => ({ ...p, frameDiff: e.target.checked }))} className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="space-y-3 pt-2">
                                                    {renderMode !== 'outline' && (
                                                        <Slider label="Blur Radius" value={blur || 0} min={0} max={5} step={0.5} onChange={(v) => setOptions(p => ({ ...p, blur: v }))} valueDisplay={blur > 0 ? blur.toFixed(1) : 'Off'} />
                                                    )}
                                                    <Slider label="Film Grain" value={noise || 0} min={0} max={100} step={5} onChange={(v) => setOptions(p => ({ ...p, noise: v }))} valueDisplay={noise > 0 ? noise.toString() : 'Off'} />
                                                    <Slider label="Posterize" value={posterize || 0} min={0} max={8} step={1} onChange={(v) => setOptions(p => ({ ...p, posterize: v }))} valueDisplay={posterize < 2 ? 'Off' : `${posterize} levels`} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        <div className="space-y-4 pt-5 border-t border-border">
                            <div className="flex items-center justify-between">
                                <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Character Set</label>
                                <div className="flex gap-3">
                                    <button onClick={() => setOptions(p => ({ ...p, charset: " .:-=+*#%@" }))} className="text-[10px] font-bold text-text-muted hover:text-accent-primary uppercase tracking-wider cursor-pointer">Standard</button>
                                    <button onClick={() => setOptions(p => ({ ...p, charset: " ░▒▓█" }))} className="text-[10px] font-bold text-text-muted hover:text-accent-primary uppercase tracking-wider cursor-pointer">Blocks</button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <input type="text" value={options.charset || ''} onChange={(e) => setOptions(p => ({ ...p, charset: e.target.value }))} placeholder="Type chars to use..." className="flex-1 bg-black border border-border rounded px-3 py-2 text-sm text-text-primary font-mono focus:border-accent-primary transition-colors" />
                                <Button variant="secondary" size="sm" onClick={() => generateDensityCharset(options.charset || '')} className="px-4" title="Auto-sort characters by visual density">Sort Density</Button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* SECTION 3: STYLE */}
                <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest">Style</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowPresetLibrary(true)} className="h-6 px-3 text-[10px] font-bold border border-border hover:border-accent-primary hover:text-accent-primary">LIBRARY</Button>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Canvas Background</label>
                        <div className="grid grid-cols-2 gap-3">
                            {BG_THEMES.map(theme => (
                                <button key={theme.label} onClick={() => setOptions(p => ({ ...p, bgTheme: theme as any }))} className={clsx("py-2 px-3 rounded text-xs font-bold truncate transition-colors cursor-pointer text-center", options.bgTheme?.label === theme.label ? "border-2 border-accent-success text-white bg-surface-active" : "border border-border text-text-muted hover:border-border-hover hover:text-text-primary bg-black")}>{theme.label}</button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-5 border-t border-border pt-5">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center cursor-pointer group" onClick={() => setOptions(p => ({ ...p, colorMode: !p.colorMode }))}>
                                <div className="flex flex-col">
                                    <label className="text-xs text-text-muted uppercase tracking-wider font-bold cursor-pointer group-hover:text-text-primary transition-colors">Extract Original Colors</label>
                                    <span className="text-[11px] text-text-secondary mt-0.5 pointer-events-none">Use source image pixel colors</span>
                                </div>
                                <input type="checkbox" checked={options.colorMode || false} readOnly className="rounded flex-shrink-0 w-4 h-4 bg-black border-border cursor-pointer text-accent-success focus:ring-0 focus:ring-offset-0" />
                            </div>

                            {(!options.colorMode) && (
                                <div className="space-y-3 pt-2">
                                    <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Solid Color Override</label>
                                    <div className="flex gap-3 h-10">
                                        <div className="flex flex-1 rounded border border-border group-hover:border-border-hover shadow-sm overflow-hidden transition-colors">
                                            <div className="relative flex-1 group/picker focus-within:ring-2 focus-within:ring-accent-primary">
                                                <input type="color" value={options.color || '#ffffff'} onChange={(e) => replaceLayerOptions(activeLayer.id, { color: e.target.value, customColor: e.target.value, palette: undefined })} onBlur={(e) => updateLayerOptions(activeLayer.id, { color: e.target.value })} className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" />
                                                <div className="w-full h-full flex items-center justify-center transition-colors shadow-inner" style={{ backgroundColor: getInterpolatedValue(activeLayer.animationTracks || [], 'options.color', currentTime, options.color || '#ffffff') }}>
                                                    <span className="text-xs font-mono font-bold mix-blend-difference text-white/90 drop-shadow-md pointer-events-none">{getInterpolatedValue(activeLayer.animationTracks || [], 'options.color', currentTime, options.color || '#ffffff')}</span>
                                                </div>
                                            </div>
                                            <button onClick={async () => { try { if ('EyeDropper' in window) { const eyeDropper = new (window as any).EyeDropper(); const result = await eyeDropper.open(); replaceLayerOptions(activeLayer.id, { color: result.sRGBHex, customColor: result.sRGBHex, palette: undefined }); updateLayerOptions(activeLayer.id, { color: result.sRGBHex }); } else { alert('Color picker not supported in this browser.'); } } catch (e) { } }} className="w-10 flex items-center justify-center bg-surface hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors border-l border-border" title="Pick color from screen"><Pipette size={16} /></button>
                                        </div>
                                        <div className="flex gap-2 isolate">
                                            {COLOR_PRESETS.slice(0, 4).map(c => (
                                                <button key={c.value} onClick={() => setOptions(p => ({ ...p, color: c.value, customColor: c.value, palette: undefined }))} className={clsx("w-10 h-10 rounded border transition-all cursor-pointer shadow-sm relative", options.color === c.value ? 'border-2 border-white scale-110 z-10' : 'border-border hover:border-white/50 hover:scale-105')} style={{ backgroundColor: c.value }} title={c.label} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5 pt-4 border-t border-border">
                        <Slider label="Font Size" value={getInterpolatedValue(activeLayer.animationTracks || [], 'options.fontSize', currentTime, fontSize || (activeLayer.type === 'text' || options.renderMode === 'kinetic' ? 120 : 8))} min={activeLayer.type === 'text' || options.renderMode === 'kinetic' ? 10 : 4} max={activeLayer.type === 'text' || options.renderMode === 'kinetic' ? 400 : 30} onChange={(v) => handleAnimatedPropChange('options.fontSize', v, () => setOptions(p => ({ ...p, fontSize: v })))} valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'options.fontSize', currentTime, fontSize || (activeLayer.type === 'text' || options.renderMode === 'kinetic' ? 120 : 8)))}px`} />
                    </div>
                </motion.div>

                {/* TRANSFORM CONTROL */}
                <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-4">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Transform</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <Slider label="Position X" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.x', currentTime, activeLayer.transform.x)} min={-400} max={400} step={1} onChange={(v) => handleAnimatedPropChange('transform.x', v, () => updateLayerTransform(activeLayer.id, { x: v }))} valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'transform.x', currentTime, activeLayer.transform.x))}px`} />
                        <Slider label="Position Y" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.y', currentTime, activeLayer.transform.y)} min={-300} max={300} step={1} onChange={(v) => handleAnimatedPropChange('transform.y', v, () => updateLayerTransform(activeLayer.id, { y: v }))} valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'transform.y', currentTime, activeLayer.transform.y))}px`} />
                        <div className="col-span-2 flex justify-end"><button onClick={() => updateLayerTransform(activeLayer.id, { x: 0, y: 0 })} className="text-[9px] text-text-muted hover:text-text-primary uppercase tracking-wider">Reset Position</button></div>

                        <Slider label="Opacity" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.opacity', currentTime, activeLayer.transform.opacity)} min={0} max={1} step={0.01} onChange={(v) => handleAnimatedPropChange('transform.opacity', v, () => updateLayerTransform(activeLayer.id, { opacity: v }))} valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'transform.opacity', currentTime, activeLayer.transform.opacity) * 100)}%`} />
                        <div className="flex items-end gap-2">
                            <div className="flex-1"><Slider label="Scale" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.scale', currentTime, activeLayer.transform.scale)} min={0.1} max={3} step={0.1} onChange={(v) => handleAnimatedPropChange('transform.scale', v, () => updateLayerTransform(activeLayer.id, { scale: v }))} valueDisplay={`${getInterpolatedValue(activeLayer.animationTracks || [], 'transform.scale', currentTime, activeLayer.transform.scale).toFixed(1)}x`} /></div>
                            <div className="flex gap-1 mb-1">
                                <button onClick={() => handleFitToCanvas(false)} title="Fit to Canvas" className="px-2 py-1 bg-surface border border-border rounded text-[9px] uppercase hover:bg-surface-hover text-text-muted hover:text-text-primary">Fit</button>
                                <button onClick={() => handleFitToCanvas(true)} title="Cover Canvas" className="px-2 py-1 bg-surface border border-border rounded text-[9px] uppercase hover:bg-surface-hover text-text-muted hover:text-text-primary">Cover</button>
                            </div>
                        </div>
                        <Slider label="Rotation" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.rotation', currentTime, activeLayer.transform.rotation)} min={0} max={360} step={1} onChange={(v) => handleAnimatedPropChange('transform.rotation', v, () => updateLayerTransform(activeLayer.id, { rotation: v }))} valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'transform.rotation', currentTime, activeLayer.transform.rotation))}°`} />
                        <div>
                            <label className="block text-[10px] text-text-muted mb-2 uppercase tracking-wider font-bold">Blend Mode</label>
                            <select value={activeLayer.transform.blendMode} onChange={(e) => updateLayerTransform(activeLayer.id, { blendMode: e.target.value as any })} className="w-full bg-black border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-border-hover">
                                <optgroup label="CSS Pixel Modes">
                                    <option value="normal">Normal</option><option value="multiply">Multiply</option><option value="screen">Screen</option><option value="overlay">Overlay</option><option value="darken">Darken</option><option value="lighten">Lighten</option><option value="difference">Difference</option><option value="exclusion">Exclusion</option>
                                </optgroup>
                                <optgroup label="⚡ ASCII-Native Modes">
                                    <option value="ascii-max">ASCII Max (Density Lighten)</option>
                                    <option value="ascii-min">ASCII Min (Density Darken)</option>
                                    <option value="ascii-xor">XOR Braille (Mesh Glitch)</option>
                                </optgroup>
                            </select>
                            <div className="mt-2">
                                <label className="block text-[10px] text-text-muted mb-2 uppercase tracking-wider font-bold">Animation LUT</label>
                                <select value={activeLayer.transform.lut || 'none'} onChange={(e) => updateLayerTransform(activeLayer.id, { lut: e.target.value as any })} className="w-full bg-black border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-border-hover">
                                    <option value="none">None</option><option value="spectrum">Spectrum (RGB Cycle)</option><option value="pulse">Pulse (Brightness)</option><option value="flicker">Flicker (Opacity)</option><option value="glitch">Glitch (Red/Blue)</option><option value="thermal">Thermal (Invert+Hue)</option><option value="noir">Noir (Grayscale)</option><option value="cyber">Cyber (Neon Glow)</option>
                                </select>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <button onClick={() => updateLayerTransform(activeLayer.id, { flipX: !activeLayer.transform.flipX })} className={clsx("flex-1 py-1.5 text-[9px] uppercase font-bold rounded border transition-colors", activeLayer.transform.flipX ? 'bg-surface-active border-text-secondary text-text-primary' : 'border-border text-text-muted hover:text-text-primary')}>Flip H</button>
                                <button onClick={() => updateLayerTransform(activeLayer.id, { flipY: !activeLayer.transform.flipY })} className={clsx("flex-1 py-1.5 text-[9px] uppercase font-bold rounded border transition-colors", activeLayer.transform.flipY ? 'bg-surface-active border-text-secondary text-text-primary' : 'border-border text-text-muted hover:text-text-primary')}>Flip V</button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* AUDIO CONTROL */}
                <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-4">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Audio Source</h3>
                    <AudioControlPanel analyzer={audioAnalyzer} />
                    <div className="mt-4 pt-4 border-t border-zinc-900/50">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Audio Reactivity</label>
                            <input type="checkbox" checked={activeLayer.transform.audioReact?.enabled ?? false} onChange={(e) => updateLayerTransform(activeLayer.id, { audioReact: { ...activeLayer.transform.audioReact!, enabled: e.target.checked } } as any)} className="w-3 h-3 accent-green-500 cursor-pointer" />
                        </div>
                        {activeLayer.transform.audioReact?.enabled && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[9px] text-zinc-600 mb-1 uppercase">Source</label>
                                        <select value={activeLayer.transform.audioReact.source} onChange={(e) => updateLayerTransform(activeLayer.id, { audioReact: { ...activeLayer.transform.audioReact!, source: e.target.value as any } } as any)} className="w-full bg-black border border-zinc-800 rounded px-1.5 py-1 text-[9px] text-white">
                                            <option value="bass">Bass</option><option value="mid">Mid</option><option value="treble">Treble</option><option value="volume">Volume</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] text-zinc-600 mb-1 uppercase">Target</label>
                                        <select value={activeLayer.transform.audioReact.target} onChange={(e) => updateLayerTransform(activeLayer.id, { audioReact: { ...activeLayer.transform.audioReact!, target: e.target.value as any } } as any)} className="w-full bg-black border border-zinc-800 rounded px-1.5 py-1 text-[9px] text-white">
                                            <option value="scale">Scale</option><option value="opacity">Opacity</option><option value="rotation">Rotation</option><option value="distortion">Distortion (Glitch)</option><option value="hue">Hue Shift</option><option value="rgb-split">RGB Split (Chromatic)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px]"><span className="text-zinc-600 uppercase">Strength</span><span className="text-zinc-400">{(activeLayer.transform.audioReact.strength * 100).toFixed(0)}%</span></div>
                                    <input type="range" min="0" max="2" step="0.05" value={activeLayer.transform.audioReact.strength} onChange={(e) => updateLayerTransform(activeLayer.id, { audioReact: { ...activeLayer.transform.audioReact!, strength: parseFloat(e.target.value) } } as any)} className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500" />
                                </div>
                                <button onClick={() => updateLayerTransform(activeLayer.id, { audioReact: { ...activeLayer.transform.audioReact!, invert: !activeLayer.transform.audioReact?.invert } } as any)} className={`w-full py-1 text-[8px] uppercase font-bold rounded border ${activeLayer.transform.audioReact.invert ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-600'}`}>Invert Signal</button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* SECTION 4: EFFECTS */}
                <motion.div variants={item} className="border-b border-white/[0.05]">
                    <div className="p-0 overflow-hidden card-hover-animation">
                        <button onClick={() => setShowEffects(!showEffects)} className="w-full px-5 py-4 flex items-center justify-between text-text-muted hover:text-text-primary transition-colors bg-surface-active/20">
                            <div className="flex items-center gap-2"><span className="text-xs font-bold uppercase tracking-widest">4. Effects & Filters</span><span className="px-1.5 py-0.5 rounded-full bg-surface-active text-[8px] font-mono text-text-secondary">ADVANCED</span></div>
                            <span className="text-xs">{showEffects ? '▲' : '▼'}</span>
                        </button>
                        {showEffects && (
                            <div className="p-5 space-y-5 border-t border-border">
                                <div>
                                    <label className="block text-[10px] text-text-muted mb-2 font-mono uppercase font-bold">Custom Character Set</label>
                                    <input type="text" value={charset} onChange={(e) => setOptions(p => ({ ...p, charset: e.target.value }))} className="w-full bg-black border border-border rounded px-3 py-2 text-[10px] font-mono text-text-primary focus:border-accent-success/50 focus:outline-none transition-all" />
                                    <div className="flex gap-1.5 flex-wrap mt-2">
                                        <button onClick={() => setOptions(p => ({ ...p, charset: DEFAULT_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-border rounded hover:border-border-hover text-text-muted hover:text-text-primary">STD</button>
                                        <button onClick={() => setOptions(p => ({ ...p, charset: DENSE_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-border rounded hover:border-border-hover text-text-muted hover:text-text-primary">DENSE</button>
                                        <button onClick={() => setOptions(p => ({ ...p, charset: MATRIX_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-border rounded hover:border-border-hover text-text-muted hover:text-text-primary">BINARY</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2 border-t border-border pt-5">
                                    {[
                                        { label: 'Invert Lighting', value: inverted, key: 'inverted' as const },
                                        { label: 'Sharpen Detail', value: sharpen, key: 'sharpen' as const },
                                        { label: 'Adaptive Contrast', value: clahe, key: 'clahe' as const },
                                        { label: 'Luminance Dither', value: dither, key: 'dither' as const },
                                        { label: 'Isolate Motion', value: frameDiff, key: 'frameDiff' as const, hidden: !((activeLayer.file?.type.startsWith('video/') || activeLayer.file?.type === 'image/gif' || activeLayer.file?.name.toLowerCase().endsWith('.gif'))) },
                                        { label: 'Remove BG', value: removeBackground, key: 'removeBackground' as const },
                                    ].map(f => !f.hidden && (
                                        <div key={f.label} className="flex items-center justify-between">
                                            <label className="text-[10px] text-text-muted uppercase tracking-tight">{f.label}</label>
                                            <input type="checkbox" checked={!!f.value} onChange={(e) => setOptions(p => ({ ...p, [f.key]: e.target.checked }))} className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-4 border-t border-border pt-5">
                                    <Slider label="Film Grain" value={noise || 0} min={0} max={100} step={5} onChange={(v) => setOptions(p => ({ ...p, noise: v }))} valueDisplay={noise > 0 ? noise.toString() : 'Off'} />
                                    <Slider label="Blur Radius" value={blur || 0} min={0} max={5} step={0.5} onChange={(v) => setOptions(p => ({ ...p, blur: v }))} valueDisplay={blur > 0 ? blur.toFixed(1) : 'Off'} />
                                    <Slider label="Posterize" value={posterize || 0} min={0} max={8} step={1} onChange={(v) => setOptions(p => ({ ...p, posterize: v }))} valueDisplay={posterize < 2 ? 'Off' : `${posterize} levels`} />
                                </div>
                                {removeBackground && (
                                    <div className="space-y-3 p-3 bg-surface/30 rounded-lg border border-border/50">
                                        <label className="block text-[10px] text-text-muted uppercase font-bold tracking-widest">BG Threshold</label>
                                        <div className="flex gap-3">
                                            <input type="color" value={transparentColor} onChange={(e) => setOptions(p => ({ ...p, transparentColor: e.target.value }))} className="w-8 h-8 bg-surface border border-border rounded-lg cursor-pointer" />
                                            <div className="flex-1"><Slider label="Sensitivity" value={colorTolerance || 30} min={1} max={200} onChange={(v) => setOptions(p => ({ ...p, colorTolerance: v }))} valueDisplay={colorTolerance.toString()} /></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* SECTION 5: GLOBAL EFFECTS */}
                <motion.div variants={item} className="border-b border-white/[0.05]">
                    <div className="p-0 overflow-hidden card-hover-animation pb-2">
                        <button onClick={() => setShowGlobalEffects(!showGlobalEffects)} className="w-full px-5 py-4 flex items-center justify-between text-text-muted hover:text-text-primary transition-colors bg-surface-active/20">
                            <div className="flex items-center gap-2"><span className="text-xs font-bold uppercase tracking-widest">5. Cinematic Effects</span><span className="px-1.5 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary text-[8px] font-mono">GLOBAL</span></div>
                            <span className="text-xs">{showGlobalEffects ? '▲' : '▼'}</span>
                        </button>
                        {showGlobalEffects && (
                            <div className="p-5 space-y-4 border-t border-border">
                                <div className="space-y-3">
                                    {[
                                        { id: 'enable3D', label: 'Interactive 3D Hologram', desc: 'Tilt composition with mouse depth', controls: [{ id: 'depthOffset', label: 'Z-Depth Pop', min: 10, max: 150, step: 5 }] },
                                        { id: 'chromaticAberration', label: 'RGB Aberration', desc: 'Cinematic color channel splitting', controls: [{ id: 'aberrationOffset', label: 'Split Distance', min: 1, max: 20, step: 1 }] },
                                        { id: 'bloom', label: 'Phosphor Bloom', desc: 'Glowing aura for bright characters', controls: [{ id: 'bloomRadius', label: 'Glow Radius', min: 2, max: 30, step: 1 }] },
                                        { id: 'crtScanlines', label: 'CRT Scanlines', desc: 'Vintage monitor interference', controls: [{ id: 'scanlineWidth', label: 'Line Width', min: 1, max: 10, step: 1 }, { id: 'scanlineOpacity', label: 'Opacity', min: 0.05, max: 0.8, step: 0.05 }] },
                                        { id: 'vignette', label: 'Lens Vignette', desc: 'Darkened screen edges', controls: [{ id: 'vignetteSize', label: 'Clear Center Size', min: 10, max: 100, step: 5 }, { id: 'vignetteIntensity', label: 'Darkness', min: 0.1, max: 1, step: 0.1 }] },
                                        { id: 'fluidDynamics', label: 'Interactive Fluid Dynamics', desc: 'Liquid displacement mapped to mouse', controls: [{ id: 'fluidForce', label: 'Push Force', min: 1, max: 20, step: 1 }, { id: 'fluidRadius', label: 'Ripple Radius', min: 10, max: 100, step: 5 }, { id: 'fluidViscosity', label: 'Viscosity (Settle Time)', min: 0.7, max: 0.99, step: 0.01 }] },
                                    ].map(effect => (
                                        <div key={effect.id} className="flex flex-col rounded-lg bg-surface/30 border border-border/50 hover:border-border transition-colors overflow-hidden">
                                            <div className="flex items-center justify-between p-3">
                                                <div>
                                                    <div className="text-[10px] text-text-primary uppercase tracking-tight font-bold">{effect.label}</div>
                                                    <div className="text-[9px] text-text-muted mt-0.5">{effect.desc}</div>
                                                </div>
                                                <input type="checkbox" checked={globalEffects[effect.id as keyof typeof globalEffects] as boolean} onChange={(e) => setGlobalEffects((p: typeof globalEffects) => ({ ...p, [effect.id]: e.target.checked }))} className="rounded-sm bg-black border-border text-accent-primary focus:ring-0 w-4 h-4 cursor-pointer" />
                                            </div>
                                            {globalEffects[effect.id as keyof typeof globalEffects] && effect.controls && (
                                                <div className="p-3 pt-0 border-t border-border/30 bg-black/20 space-y-3 mt-2">
                                                    {effect.controls.map(ctrl => (
                                                        <Slider key={ctrl.id} label={ctrl.label} value={globalEffects[ctrl.id as keyof typeof globalEffects] as number} min={ctrl.min} max={ctrl.max} step={ctrl.step} onChange={(v) => setGlobalEffects((p: typeof globalEffects) => ({ ...p, [ctrl.id]: v }))} valueDisplay={globalEffects[ctrl.id as keyof typeof globalEffects].toString()} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};
