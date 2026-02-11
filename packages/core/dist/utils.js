"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PALETTES = exports.DENSE_CHARSET = exports.SIMPLE_CHARSET = void 0;
exports.getLuminance = getLuminance;
exports.getGlyph = getGlyph;
exports.getColorFromPalette = getColorFromPalette;
exports.hexToRgb = hexToRgb;
exports.posterizeChannel = posterizeChannel;
exports.SIMPLE_CHARSET = " .:-=+*#%@";
exports.DENSE_CHARSET = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";
exports.PALETTES = {
    synthwave: {
        name: 'Synthwave',
        colors: [
            { r: 10, g: 10, b: 50 }, // Dark Deep Blue
            { r: 80, g: 0, b: 120 }, // Purple
            { r: 255, g: 0, b: 150 }, // Neon Pink
            { r: 0, g: 255, b: 255 } // Cyan
        ]
    },
    cyberpunk: {
        name: 'Cyberpunk',
        colors: [
            { r: 30, g: 0, b: 30 }, // Dark Magenta
            { r: 255, g: 0, b: 100 }, // Pink
            { r: 0, g: 255, b: 200 }, // Bright Teal
            { r: 255, g: 255, b: 0 } // Yellow
        ]
    },
    matrix: {
        name: 'Matrix',
        colors: [
            { r: 0, g: 10, b: 0 }, // Black-Green
            { r: 0, g: 100, b: 0 }, // Dark Green
            { r: 0, g: 255, b: 0 }, // Matrix Green
            { r: 200, g: 255, b: 200 } // Light Green
        ]
    },
    sepia: {
        name: 'Sepia',
        colors: [
            { r: 40, g: 25, b: 15 }, // Dark Brown
            { r: 110, g: 70, b: 40 }, // Medium Brown
            { r: 190, g: 150, b: 100 }, // Light Brown
            { r: 255, g: 240, b: 200 } // Cream
        ]
    },
    ice: {
        name: 'Ice',
        colors: [
            { r: 0, g: 20, b: 50 }, // Deep Blue
            { r: 0, g: 100, b: 200 }, // Blue
            { r: 150, g: 220, b: 255 }, // Sky Blue
            { r: 255, g: 255, b: 255 } // White
        ]
    },
    magma: {
        name: 'Magma',
        colors: [
            { r: 10, g: 0, b: 0 }, // Near Black
            { r: 120, g: 0, b: 0 }, // Deep Red
            { r: 255, g: 80, b: 0 }, // Orange
            { r: 255, g: 255, b: 100 } // Yellow-White
        ]
    }
};
function getLuminance(r, g, b) {
    // Standard Rec. 709 luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function getGlyph(luminance, charset = exports.SIMPLE_CHARSET, invert = false) {
    const val = invert ? 255 - luminance : luminance;
    const index = Math.floor((val * charset.length) / 256);
    return charset[index];
}
function getColorFromPalette(luminance, paletteKey) {
    const palette = exports.PALETTES[paletteKey];
    if (!palette)
        return null;
    const colors = palette.colors;
    if (colors.length === 0)
        return null;
    if (colors.length === 1)
        return colors[0];
    // Normalize luminance to 0 to (colors.length - 1)
    const scaled = (luminance / 255) * (colors.length - 1);
    const index = Math.floor(scaled);
    const t = scaled - index;
    if (index >= colors.length - 1)
        return colors[colors.length - 1];
    const c1 = colors[index];
    const c2 = colors[index + 1];
    return {
        r: Math.round(c1.r + t * (c2.r - c1.r)),
        g: Math.round(c1.g + t * (c2.g - c1.g)),
        b: Math.round(c1.b + t * (c2.b - c1.b))
    };
}
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
/**
 * Posterize a single color channel to N levels.
 * E.g., levels=4 maps 0-255 to 4 discrete values: 0, 85, 170, 255
 */
function posterizeChannel(value, levels) {
    if (levels <= 1)
        return value;
    const step = 255 / (levels - 1);
    return Math.round(Math.round(value / step) * step);
}
