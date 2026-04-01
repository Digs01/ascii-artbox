/**
 * nodePresets.ts — Pre-built node graph templates
 *
 * Each preset is a function that returns a raw { nodes, connections }
 * object ready to be loaded into useNodeGraph's setGraph().
 * Positions are laid out for comfortable editing (~400px wide).
 */

import { NodeGraph } from '../types/nodeGraph';

const id = (suffix: string) => `preset-${suffix}`;

export interface NodePreset {
    name: string;
    description: string;
    icon: string;
    build: () => NodeGraph;
}

export const NODE_PRESETS: NodePreset[] = [
    // ─── 1: Audio Scale Bounce ───────────────────────────────────────────────
    {
        name: 'Audio Scale Bounce',
        description: 'Bass drives layer scale with smoothing',
        icon: '🎵',
        build: () => ({
            nodes: [
                { id: id('ab'), kind: 'audio-band', label: 'Audio Band', x: 60,  y: 100, ports: [], config: { band: 'bass' } },
                { id: id('sm'), kind: 'smooth',     label: 'Smooth',     x: 280, y: 100, ports: [], config: { factor: 0.85 } },
                { id: id('rm'), kind: 'range-map',  label: 'Range Map',  x: 500, y: 100, ports: [], config: { inMin: 0, inMax: 1, outMin: 0.8, outMax: 2.2, clamp: true } },
                { id: id('lp'), kind: 'layer-property', label: 'Scale', x: 720, y: 100, ports: [], config: { property: 'transform.scale' } },
            ],
            connections: [
                { id: id('c1'), fromNodeId: id('ab'), fromPortId: 'out',     toNodeId: id('sm'), toPortId: 'in'    },
                { id: id('c2'), fromNodeId: id('sm'), fromPortId: 'out',     toNodeId: id('rm'), toPortId: 'in'    },
                { id: id('c3'), fromNodeId: id('rm'), fromPortId: 'out',     toNodeId: id('lp'), toPortId: 'value' },
            ],
        }),
    },

    // ─── 2: Sine Orbit ───────────────────────────────────────────────────────
    {
        name: 'Sine Orbit',
        description: 'Two oscillators drive X/Y for circular motion',
        icon: '⭕',
        build: () => ({
            nodes: [
                { id: id('ox'), kind: 'oscillator',     label: 'Osc X', x: 60,  y: 60,  ports: [], config: { waveform: 'sine' } },
                { id: id('oy'), kind: 'oscillator',     label: 'Osc Y', x: 60,  y: 220, ports: [], config: { waveform: 'cosine' } },
                { id: id('cx'), kind: 'constant',       label: 'Freq',  x: 60,  y: 380, ports: [], config: { value: 0.4 } },
                { id: id('ax'), kind: 'constant',       label: 'Amp',   x: 60,  y: 460, ports: [], config: { value: 80 } },
                { id: id('mx'), kind: 'math-op',        label: 'Mul X', x: 280, y: 60,  ports: [], config: { op: 'mul' } },
                { id: id('my'), kind: 'math-op',        label: 'Mul Y', x: 280, y: 220, ports: [], config: { op: 'mul' } },
                { id: id('lx'), kind: 'layer-property', label: 'X Pos', x: 500, y: 60,  ports: [], config: { property: 'transform.x' } },
                { id: id('ly'), kind: 'layer-property', label: 'Y Pos', x: 500, y: 220, ports: [], config: { property: 'transform.y' } },
            ],
            connections: [
                { id: id('c1'), fromNodeId: id('cx'), fromPortId: 'out', toNodeId: id('ox'), toPortId: 'freq'      },
                { id: id('c2'), fromNodeId: id('cx'), fromPortId: 'out', toNodeId: id('oy'), toPortId: 'freq'      },
                { id: id('c3'), fromNodeId: id('ox'), fromPortId: 'out', toNodeId: id('mx'), toPortId: 'a'         },
                { id: id('c4'), fromNodeId: id('ax'), fromPortId: 'out', toNodeId: id('mx'), toPortId: 'b'         },
                { id: id('c5'), fromNodeId: id('oy'), fromPortId: 'out', toNodeId: id('my'), toPortId: 'a'         },
                { id: id('c6'), fromNodeId: id('ax'), fromPortId: 'out', toNodeId: id('my'), toPortId: 'b'         },
                { id: id('c7'), fromNodeId: id('mx'), fromPortId: 'out', toNodeId: id('lx'), toPortId: 'value'     },
                { id: id('c8'), fromNodeId: id('my'), fromPortId: 'out', toNodeId: id('ly'), toPortId: 'value'     },
            ],
        }),
    },

    // ─── 3: Beat Flash ───────────────────────────────────────────────────────
    {
        name: 'Beat Flash',
        description: 'Opacity snaps to 1 on bass transients',
        icon: '⚡',
        build: () => ({
            nodes: [
                { id: id('ab'), kind: 'audio-band',     label: 'Bass',    x: 60,  y: 100, ports: [], config: { band: 'bass' } },
                { id: id('th'), kind: 'constant',       label: 'Thresh',  x: 60,  y: 220, ports: [], config: { value: 0.6 } },
                { id: id('cm'), kind: 'compare',        label: 'Compare', x: 280, y: 150, ports: [], config: { op: '>' } },
                { id: id('sl'), kind: 'select',         label: 'Select',  x: 500, y: 150, ports: [], config: {} },
                { id: id('c1v'), kind: 'constant',      label: 'Full',    x: 280, y: 280, ports: [], config: { value: 1.0 } },
                { id: id('c0v'), kind: 'constant',      label: 'Dim',     x: 280, y: 360, ports: [], config: { value: 0.15 } },
                { id: id('lp'), kind: 'layer-property', label: 'Opacity', x: 720, y: 150, ports: [], config: { property: 'transform.opacity' } },
            ],
            connections: [
                { id: id('c1'), fromNodeId: id('ab'),  fromPortId: 'out', toNodeId: id('cm'), toPortId: 'a'         },
                { id: id('c2'), fromNodeId: id('th'),  fromPortId: 'out', toNodeId: id('cm'), toPortId: 'b'         },
                { id: id('c3'), fromNodeId: id('cm'),  fromPortId: 'out', toNodeId: id('sl'), toPortId: 'condition' },
                { id: id('c4'), fromNodeId: id('c1v'), fromPortId: 'out', toNodeId: id('sl'), toPortId: 'a'         },
                { id: id('c5'), fromNodeId: id('c0v'), fromPortId: 'out', toNodeId: id('sl'), toPortId: 'b'         },
                { id: id('c6'), fromNodeId: id('sl'),  fromPortId: 'out', toNodeId: id('lp'), toPortId: 'value'     },
            ],
        }),
    },

    // ─── 4: Breathing ────────────────────────────────────────────────────────
    {
        name: 'Breathing',
        description: 'Slow sinus wave gently scales the layer',
        icon: '🌊',
        build: () => ({
            nodes: [
                { id: id('os'), kind: 'oscillator',     label: 'Breathe',   x: 60,  y: 100, ports: [], config: { waveform: 'sine' } },
                { id: id('fr'), kind: 'constant',       label: '0.25 Hz',   x: 60,  y: 240, ports: [], config: { value: 0.25 } },
                { id: id('rm'), kind: 'range-map',      label: 'Scale Map', x: 300, y: 100, ports: [], config: { inMin: -1, inMax: 1, outMin: 0.85, outMax: 1.15, clamp: true } },
                { id: id('lp'), kind: 'layer-property', label: 'Scale',     x: 520, y: 100, ports: [], config: { property: 'transform.scale' } },
            ],
            connections: [
                { id: id('c1'), fromNodeId: id('fr'), fromPortId: 'out', toNodeId: id('os'), toPortId: 'freq'  },
                { id: id('c2'), fromNodeId: id('os'), fromPortId: 'out', toNodeId: id('rm'), toPortId: 'in'    },
                { id: id('c3'), fromNodeId: id('rm'), fromPortId: 'out', toNodeId: id('lp'), toPortId: 'value' },
            ],
        }),
    },

    // ─── 5: Color Pulse ──────────────────────────────────────────────────────
    {
        name: 'Color Pulse',
        description: 'Color lerps between two hues over time',
        icon: '🎨',
        build: () => ({
            nodes: [
                { id: id('tm'), kind: 'time',           label: 'Time',      x: 60,  y: 100, ports: [], config: {} },
                { id: id('os'), kind: 'oscillator',     label: 'Speed',     x: 60,  y: 240, ports: [], config: { waveform: 'sine' } },
                { id: id('fr'), kind: 'constant',       label: '0.2 Hz',    x: 60,  y: 380, ports: [], config: { value: 0.2 } },
                { id: id('rm'), kind: 'range-map',      label: 'Normalize', x: 300, y: 240, ports: [], config: { inMin: -1, inMax: 1, outMin: 0, outMax: 1, clamp: true } },
                { id: id('cl'), kind: 'color-lerp',     label: 'Color',     x: 520, y: 180, ports: [], config: { colorA: '#00ff88', colorB: '#ff3366' } },
                { id: id('lp'), kind: 'layer-property', label: 'Color Prop',x: 740, y: 180, ports: [], config: { property: 'options.color' } },
            ],
            connections: [
                { id: id('c1'), fromNodeId: id('fr'), fromPortId: 'out', toNodeId: id('os'), toPortId: 'freq'  },
                { id: id('c2'), fromNodeId: id('os'), fromPortId: 'out', toNodeId: id('rm'), toPortId: 'in'    },
                { id: id('c3'), fromNodeId: id('rm'), fromPortId: 'out', toNodeId: id('cl'), toPortId: 't'     },
                { id: id('c4'), fromNodeId: id('cl'), fromPortId: 'out', toNodeId: id('lp'), toPortId: 'value' },
            ],
        }),
    },
];
