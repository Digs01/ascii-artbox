import { useState, useCallback, useMemo } from 'react';
import { Layer, LayerOptions, LayerTransform, Keyframe, KeyframeTrack } from '../types/layer';
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
            type: file ? (file.type.startsWith('video/') ? 'video' : 'image') : 'image',
            file: file,
            previewUrl: file ? URL.createObjectURL(file) : null,
            frames: [],
            fps: 12,
            options: { ...DEFAULT_OPTIONS },
            transform: { ...DEFAULT_TRANSFORM },
            animationTracks: []
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

    // --- Keyframing Methods ---
    const addKeyframe = useCallback((layerId: string, property: string, time: number, value: any, easing: Keyframe['easing'] = 'linear') => {
        setLayers(prev => prev.map(l => {
            if (l.id !== layerId) return l;

            const tracks = l.animationTracks || [];
            let trackIndex = tracks.findIndex(t => t.property === property);

            // If track doesn't exist, create it
            let newTracks = [...tracks];
            if (trackIndex === -1) {
                newTracks.push({ property, keyframes: [] });
                trackIndex = newTracks.length - 1;
            }

            // Create new track object with added keyframe
            const targetTrack = newTracks[trackIndex];

            // Check if keyframe exists at this exact time
            const existingIndex = targetTrack.keyframes.findIndex(k => Math.abs(k.time - time) < 0.001);
            let updatedKeyframes = [...targetTrack.keyframes];

            if (existingIndex !== -1) {
                // Update existing
                updatedKeyframes[existingIndex] = { ...updatedKeyframes[existingIndex], value, easing };
            } else {
                // Add new and sort by time
                updatedKeyframes.push({ id: generateId(), time, value, easing });
                updatedKeyframes.sort((a, b) => a.time - b.time);
            }

            newTracks[trackIndex] = { ...targetTrack, keyframes: updatedKeyframes };
            return { ...l, animationTracks: newTracks };
        }));
    }, [setLayers]);

    const removeKeyframe = useCallback((layerId: string, property: string, keyframeId: string) => {
        setLayers(prev => prev.map(l => {
            if (l.id !== layerId || !l.animationTracks) return l;

            const newTracks = l.animationTracks.map(t => {
                if (t.property !== property) return t;
                return { ...t, keyframes: t.keyframes.filter(k => k.id !== keyframeId) };
            });

            return { ...l, animationTracks: newTracks };
        }));
    }, [setLayers]);

    const updateKeyframe = useCallback((layerId: string, property: string, keyframeId: string, updates: Partial<Keyframe>) => {
        setLayers(prev => prev.map(l => {
            if (l.id !== layerId || !l.animationTracks) return l;

            const newTracks = l.animationTracks.map(t => {
                if (t.property !== property) return t;

                let newKeyframes = t.keyframes.map(k => k.id === keyframeId ? { ...k, ...updates } : k);
                // If time was updated, re-sort
                if (updates.time !== undefined) {
                    newKeyframes.sort((a, b) => a.time - b.time);
                }
                return { ...t, keyframes: newKeyframes };
            });

            return { ...l, animationTracks: newTracks };
        }));
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
        addKeyframe,
        removeKeyframe,
        updateKeyframe,
        undo, redo, canUndo, canRedo // New
    };
}
