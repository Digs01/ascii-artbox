export interface LayerOptions {
    // Core generator options
    width: number;
    inverted: boolean;
    videoFps: number;
    charset: string;
    color: string;
    customColor: string;
    fontSize: number;
    bgTheme: { label: string; bg: string; border: string };
    removeBackground: boolean;
    transparentColor: string;
    colorTolerance: number;
    colorMode: boolean;
    renderMode: 'standard' | 'braille' | 'edge' | 'halfblock' | 'silhouette';
    posterize: number;
    clahe: boolean;
    frameDiff: boolean;
    dither: boolean;
    palette?: string;
    sharpen: boolean;
    blur: number;
    noise: number;
    overlayText: string;
    depthMode: boolean;
}

export interface LayerTransform {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    flipX?: boolean;
    flipY?: boolean;
    lut?: 'none' | 'spectrum' | 'pulse' | 'flicker' | 'glitch' | 'thermal' | 'noir' | 'cyber';
    blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn' | 'hard-light' | 'soft-light' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity';
    audioReact?: {
        enabled: boolean;
        source: 'bass' | 'mid' | 'treble' | 'volume';
        target: 'scale' | 'opacity' | 'rotation' | 'lut' | 'distortion' | 'hue' | 'rgb-split';
        strength: number; // 0 to 2 (multiplier)
        invert: boolean;
    };
}

export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    type: 'image' | 'video' | 'text';
    file: File | null;
    previewUrl: string | null;
    frames: string[]; // generated ASCII frames
    fps: number;
    options: LayerOptions;
    transform: LayerTransform;
    metadata?: {
        originalWidth?: number;
        originalHeight?: number;
    }
}
