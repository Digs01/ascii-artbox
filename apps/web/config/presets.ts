import { LayerOptions, LayerTransform } from '../types/layer';

export interface Preset {
    id: string;
    name: string;
    description: string;
    thumbnail?: string; // Optional path or CSS color
    category: 'Style' | 'Effect' | 'Utility';
    options?: Partial<LayerOptions>;
    transform?: Partial<LayerTransform>;
}

export const PRESETS: Preset[] = [
    {
        id: 'matrix',
        name: 'The Matrix',
        description: 'Classic falling code aesthetic',
        category: 'Style',
        thumbnail: 'bg-green-900',
        options: {
            renderMode: 'standard',
            palette: 'matrix',
            colorMode: true,
            color: '#00ff00', // Fallback Green
            fontSize: 12,
            bgTheme: { label: 'Black', bg: '#000000', border: 'border-green-900' },
            dither: false,
            posterize: 4,
            charset: "01" // Matrix binary
        },
        transform: {
            lut: 'terminal',
            blendMode: 'screen',
            opacity: 0.9
        }
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk',
        description: 'Neon pink and blue glitch vibes',
        category: 'Style',
        thumbnail: 'bg-pink-600',
        options: {
            renderMode: 'halfblock',
            palette: 'cyberpunk',
            colorMode: true,
            color: '#ff00ff', // Fallback Pink
            fontSize: 8,
            sharpen: true,
            bgTheme: { label: 'Dark', bg: '#050510', border: 'border-pink-500' },
            noise: 15
        },
        transform: {
            lut: 'glitch',
            blendMode: 'lighten',
            opacity: 1
        }
    },
    {
        id: 'crimson',
        name: 'Crimson',
        description: 'Deep red horror aesthetic',
        category: 'Style',
        thumbnail: 'bg-red-900',
        options: {
            renderMode: 'standard',
            palette: 'magma',
            colorMode: true,
            color: '#ff0000', // Crimson fallback
            fontSize: 10,
            bgTheme: { label: 'Dark Red', bg: '#1a0000', border: 'border-red-900' },
            blur: 0.5,
            noise: 25
        },
        transform: {
            lut: 'thermal',
            blendMode: 'difference' // Creeepy
        }
    },
    {
        id: 'blueprint',
        name: 'Blueprint',
        description: 'Technical drawing style',
        category: 'Style',
        thumbnail: 'bg-blue-700',
        options: {
            renderMode: 'edge', // Edge detection
            colorMode: false,
            color: '#ffffff',
            bgTheme: { label: 'Blueprint', bg: '#0033cc', border: 'border-white' },
            fontSize: 6,
            inverted: true // White lines on blue
        },
        transform: {
            lut: 'none',
            blendMode: 'screen'
        }
    },
    {
        id: 'vaporwave',
        name: 'Vaporwave',
        description: 'Aesthetic pinks and purples',
        category: 'Style',
        thumbnail: 'bg-purple-500',
        options: {
            renderMode: 'halfblock',
            palette: 'synthwave',
            colorMode: true,
            color: '#ff77ff', // Fallback
            fontSize: 9,
            dither: true,
            bgTheme: { label: 'Purple', bg: '#100010', border: 'border-purple-500' },
        },
        transform: {
            lut: 'spectrum',
            blendMode: 'overlay'
        }
    },
    {
        id: 'terminal',
        name: 'Retro Terminal',
        description: 'Old school green phosphor monitor',
        category: 'Style',
        thumbnail: 'bg-green-700',
        options: {
            renderMode: 'standard',
            colorMode: false,
            color: '#33ff33',
            bgTheme: { label: 'Terminal', bg: '#001100', border: 'border-green-500' },
            fontSize: 14,
            blur: 1, // Slight glow
            noise: 10, // Grain
            charset: " .:-=+*#%@"
        },
        transform: {
            lut: 'flicker',
            blendMode: 'screen'
        }
    },
    {
        id: 'ascii-classic',
        name: 'ASCII Classic',
        description: 'Pure text representation',
        category: 'Style',
        thumbnail: 'bg-zinc-500',
        options: {
            renderMode: 'standard',
            colorMode: false,
            color: '#ffffff',
            bgTheme: { label: 'Black', bg: '#000000', border: 'border-zinc-800' },
            fontSize: 8,
            charset: " .:-=+*#%@"
        },
        transform: {
            lut: 'none',
            blendMode: 'normal',
            opacity: 1
        }
    }
];
