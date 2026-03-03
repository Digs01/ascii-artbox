import { KeyframeTrack, Keyframe } from '../types/layer';

const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [255, 255, 255];
};

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
};

const lerpColor = (start: string, end: string, factor: number) => {
    const rgba1 = hexToRgb(start);
    const rgba2 = hexToRgb(end);
    const r = Math.round(lerp(rgba1[0], rgba2[0], factor));
    const g = Math.round(lerp(rgba1[1], rgba2[1], factor));
    const b = Math.round(lerp(rgba1[2], rgba2[2], factor));
    return rgbToHex(r, g, b);
};

export const getInterpolatedValue = (tracks: KeyframeTrack[], propertyPath: string, currentTime: number, defaultValue: any) => {
    if (!tracks) return defaultValue;
    const track = tracks.find(t => t.property === propertyPath);
    if (!track || track.keyframes.length === 0) return defaultValue;

    const keyframes = track.keyframes;
    if (keyframes.length === 1) return keyframes[0].value;

    let k0 = keyframes[0];
    let k1 = keyframes[keyframes.length - 1];

    if (currentTime <= k0.time) return k0.value;
    if (currentTime >= k1.time) return k1.value;

    for (let i = 0; i < keyframes.length - 1; i++) {
        if (currentTime >= keyframes[i].time && currentTime < keyframes[i + 1].time) {
            k0 = keyframes[i];
            k1 = keyframes[i + 1];
            break;
        }
    }

    const duration = k1.time - k0.time;
    const progress = (currentTime - k0.time) / duration;

    let factor = progress;
    if (k0.easing === 'step') return k0.value;
    if (k0.easing === 'ease-in') factor = progress * progress;
    if (k0.easing === 'ease-out') factor = progress * (2 - progress);
    if (k0.easing === 'ease-in-out') factor = progress < .5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    if (typeof defaultValue === 'number') {
        return lerp(Number(k0.value), Number(k1.value), factor);
    } else if (typeof defaultValue === 'string' && defaultValue.startsWith('#')) {
        return lerpColor(k0.value, k1.value, factor);
    }

    return k0.value;
};
