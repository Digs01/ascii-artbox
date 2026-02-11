export declare const SIMPLE_CHARSET = " .:-=+*#%@";
export declare const DENSE_CHARSET = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";
export type RenderMode = 'standard' | 'braille' | 'edge' | 'halfblock' | 'silhouette';
export interface Color {
    r: number;
    g: number;
    b: number;
}
export interface Palette {
    name: string;
    colors: Color[];
}
export declare const PALETTES: Record<string, Palette>;
export interface AsciiOptions {
    width?: number;
    height?: number;
    charset?: string;
    invert?: boolean;
    transparentColor?: string;
    colorTolerance?: number;
    colorMode?: boolean;
    renderMode?: RenderMode;
    posterize?: number;
    clahe?: boolean;
    dither?: boolean;
    palette?: string;
    sharpen?: boolean;
    blur?: number;
    noise?: number;
}
export declare function getLuminance(r: number, g: number, b: number): number;
export declare function getGlyph(luminance: number, charset?: string, invert?: boolean): string;
export declare function getColorFromPalette(luminance: number, paletteKey: string): Color | null;
export declare function hexToRgb(hex: string): Color | null;
/**
 * Posterize a single color channel to N levels.
 * E.g., levels=4 maps 0-255 to 4 discrete values: 0, 85, 170, 255
 */
export declare function posterizeChannel(value: number, levels: number): number;
