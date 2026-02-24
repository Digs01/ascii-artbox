import { useState, useCallback, useMemo } from 'react';
import { Layer, LayerOptions, LayerTransform } from '../types/layer';
import { useHistory } from './useHistory';

const generateId = () => Math.random().toString(36).substr(2, 9);


// Default options (copied from page.tsx initial state)
const DEFAULT_OPTIONS: LayerOptions = {
    width: 100,
    inverted: false,
    videoFps: 12,
    charset: " .:-=+*#%@",
    color: '#ffffff',
    customColor: '#ffffff',
    fontSize: 8,
    bgTheme: { label: 'Black', bg: '#000000', border: 'border-zinc-800' },
    removeBackground: false,
    transparentColor: '#000000',
    colorTolerance: 30,
    colorMode: false,
    renderMode: 'standard',
    posterize: 0,
    clahe: false,
    frameDiff: false,
    dither: false,
    palette: undefined,
    sharpen: false,
    blur: 0,
    noise: 0,
    overlayText: '',
    depthMode: false,
    edgeThreshold: 30,
};

const DEFAULT_TRANSFORM: LayerTransform = {
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    flipX: false,
    flipY: false,
    lut: 'none',
    blendMode: 'normal',
    audioReact: {
        enabled: false,
        source: 'bass',
        target: 'scale',
        strength: 0.5,
        invert: false
    }
};

export function useLayers() {
    const { state: layers, set: setLayers, replace: replaceLayers, undo, redo, canUndo, canRedo } = useHistory<Layer[]>([]);
    const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

    const activeLayer = useMemo(() =>
        layers.find(l => l.id === activeLayerId) || null
        , [layers, activeLayerId]);

    const addLayer = useCallback((file: File | null = null) => {
        const newLayer: Layer = {
            id: generateId(),
            name: file ? file.name : `Layer ${layers.length + 1}`,
            visible: true,
            locked: false,
            type: file ? (file.type.startsWith('video/') ? 'video' : 'image') : 'text',
            file: file,
            previewUrl: file ? URL.createObjectURL(file) : null,
            frames: [],
            fps: 12,
            options: { ...DEFAULT_OPTIONS },
            transform: { ...DEFAULT_TRANSFORM },
        };

        setLayers(prev => [newLayer, ...prev]); // Add to top
        setActiveLayerId(newLayer.id);
        return newLayer.id;
    }, [layers.length, setLayers]);

    const removeLayer = useCallback((id: string) => {
        setLayers(prev => {
            const newLayers = prev.filter(l => l.id !== id);
            // If we removed the active layer, select the next one
            if (activeLayerId === id) {
                // Determine new active layer ID properly? 
                // We can't set state inside setLayers callback if it depends on result.
                // But setActiveLayerId is outside. 
                // We'll fix active ID in effect or just check existence in Page.
                // For now, let's just update layers.
            }
            return newLayers;
        });
        // We set active ID separately if needed, but for history purposes we only track layers.
        // If activeID becomes invalid, Page handles it.
    }, [activeLayerId, setLayers]);

    const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }, [setLayers]);

    // Used for Sliders - currently commits every change. 
    // Ideally we'd use 'replace' while dragging and 'set' on release, but UI doesn't support it yet.
    const updateLayerOptions = useCallback((id: string, optionsUpdates: Partial<LayerOptions>) => {
        setLayers(prev => prev.map(l =>
            l.id === id ? { ...l, options: { ...l.options, ...optionsUpdates } } : l
        ));
    }, [setLayers]);

    // Used for Real-time Color Picking - Uses REPLACE to avoid history spam
    const replaceLayerOptions = useCallback((id: string, optionsUpdates: Partial<LayerOptions>) => {
        replaceLayers(prev => prev.map(l =>
            l.id === id ? { ...l, options: { ...l.options, ...optionsUpdates } } : l
        ));
    }, [replaceLayers]);

    // Used for Canvas Dragging - Uses REPLACE to avoid history spam
    const updateLayerTransform = useCallback((id: string, transformUpdates: Partial<LayerTransform>) => {
        replaceLayers(prev => prev.map(l =>
            l.id === id ? { ...l, transform: { ...l.transform, ...transformUpdates } } : l
        ));
    }, [replaceLayers]);

    // Used for Canvas Drag End - Commits to history
    const commitLayerTransform = useCallback((id: string, transformUpdates: Partial<LayerTransform>) => {
        setLayers(prev => prev.map(l =>
            l.id === id ? { ...l, transform: { ...l.transform, ...transformUpdates } } : l
        ));
    }, [setLayers]);

    const duplicateLayer = useCallback((id: string) => {
        const layer = layers.find(l => l.id === id);
        if (!layer) return;

        const newLayer: Layer = {
            ...layer,
            id: generateId(),
            name: `${layer.name} (Copy)`,
        };

        setLayers(prev => [newLayer, ...prev]);
        setActiveLayerId(newLayer.id);
    }, [layers, setLayers]);

    const reorderLayers = useCallback((newOrder: Layer[]) => {
        setLayers(newOrder);
    }, [setLayers]);

    const setLayerAscii = useCallback((id: string, frames: string[], fps?: number) => {
        setLayers(prev => prev.map(l =>
            l.id === id ? { ...l, frames, fps: fps || l.fps } : l
        ));
    }, [setLayers]);

    return {
        layers,
        activeLayer,
        activeLayerId,
        setActiveLayerId,
        addLayer,
        removeLayer,
        updateLayer,
        updateLayerOptions,
        replaceLayerOptions, // New
        updateLayerTransform,
        commitLayerTransform, // New
        duplicateLayer,
        reorderLayers,
        setLayerAscii,
        undo, redo, canUndo, canRedo // New
    };
}
