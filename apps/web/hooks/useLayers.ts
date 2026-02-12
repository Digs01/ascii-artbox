import { useState, useCallback, useMemo } from 'react';
import { Layer, LayerOptions, LayerTransform } from '../types/layer';

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
    const [layers, setLayers] = useState<Layer[]>([]);
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
    }, [layers.length]);

    const removeLayer = useCallback((id: string) => {
        setLayers(prev => {
            const newLayers = prev.filter(l => l.id !== id);
            // If we removed the active layer, select the next one
            if (activeLayerId === id) {
                setActiveLayerId(newLayers[0]?.id || null);
            }
            return newLayers;
        });
    }, [activeLayerId]);

    const updateLayer = useCallback((id: string, updates: Partial<Layer>) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }, []);

    const updateLayerOptions = useCallback((id: string, optionsUpdates: Partial<LayerOptions>) => {
        setLayers(prev => prev.map(l =>
            l.id === id ? { ...l, options: { ...l.options, ...optionsUpdates } } : l
        ));
    }, []);

    const updateLayerTransform = useCallback((id: string, transformUpdates: Partial<LayerTransform>) => {
        setLayers(prev => prev.map(l =>
            l.id === id ? { ...l, transform: { ...l.transform, ...transformUpdates } } : l
        ));
    }, []);

    const duplicateLayer = useCallback((id: string) => {
        const layer = layers.find(l => l.id === id);
        if (!layer) return;

        const newLayer: Layer = {
            ...layer,
            id: generateId(),
            name: `${layer.name} (Copy)`,
            // Create new preview URL object to avoid revoking issues if original is closed (though we rely on GC usually, explicit URL handling is better but for now copy is fine)
            // Ideally we clone the file if it exists, or just re-use the reference and be careful not to revoke until all are gone.
            // For simplicity, we just copy properties.
        };

        setLayers(prev => [newLayer, ...prev]);
        setActiveLayerId(newLayer.id);
    }, [layers]);

    const reorderLayers = useCallback((newOrder: Layer[]) => {
        setLayers(newOrder);
    }, []);

    const setLayerAscii = useCallback((id: string, frames: string[], fps?: number) => {
        setLayers(prev => prev.map(l =>
            l.id === id ? { ...l, frames, fps: fps || l.fps } : l
        ));
    }, []);

    return {
        layers,
        activeLayer,
        activeLayerId,
        setActiveLayerId,
        addLayer,
        removeLayer,
        updateLayer,
        updateLayerOptions,
        updateLayerTransform,
        duplicateLayer,
        reorderLayers,
        setLayerAscii
    };
}
