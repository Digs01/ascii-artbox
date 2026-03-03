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
    renderMode: 'standard' | 'braille' | 'edge' | 'halfblock' | 'silhouette' | 'kinetic';
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
    edgeThreshold: number;
    modelRenderMode?: 'viewport' | 'ascii-point-cloud';
    modelAutoRotate?: boolean;
}

export interface LayerTransform {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    flipX?: boolean;
    flipY?: boolean;
    lut?: 'none' | 'spectrum' | 'pulse' | 'flicker' | 'glitch' | 'thermal' | 'noir' | 'cyber' | 'terminal';
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
    type: 'image' | 'video' | 'text' | 'model';
    file: File | null;
    previewUrl: string | null;
    frames: string[]; // generated ASCII frames
    fps: number;
    options: LayerOptions;
    transform: LayerTransform;
    metadata?: {
        originalWidth?: number;
        originalHeight?: number;
    };
    animationTracks?: KeyframeTrack[]; // Added for node-based parameter animation
}

// --- Keyframing Types ---
export interface Keyframe {
    id: string;
    time: number; // usually in seconds
    value: number | string | boolean | any;
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step';
}

export interface KeyframeTrack {
    property: string; // The dot-notated path, e.g., 'transform.scale', 'options.fontSize'
    keyframes: Keyframe[];
}
