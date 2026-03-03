// ─── Node Graph Types ───
// Used by the visual scripting / node editor system

export type PortType = 'number' | 'color' | 'boolean' | 'any';
export type PortDirection = 'input' | 'output';

export interface Port {
    id: string;
    label: string;
    type: PortType;
    direction: PortDirection;
    defaultValue?: any;
}

export type NodeKind =
    | 'audio-band'
    | 'math-op'
    | 'constant'
    | 'time'
    | 'oscillator'
    | 'range-map'
    | 'smooth'
    | 'layer-property';

export interface GraphNode {
    id: string;
    kind: NodeKind;
    label: string;
    x: number;
    y: number;
    ports: Port[];
    // Internal config per node kind
    config: Record<string, any>;
}

export interface Connection {
    id: string;
    fromNodeId: string;
    fromPortId: string;
    toNodeId: string;
    toPortId: string;
}

export interface NodeGraph {
    nodes: GraphNode[];
    connections: Connection[];
}

// ─── Node Registry (port definitions per kind) ───

export function createNodePorts(kind: NodeKind): Port[] {
    switch (kind) {
        case 'audio-band':
            return [
                { id: 'out', label: 'Value', type: 'number', direction: 'output' },
            ];
        case 'math-op':
            return [
                { id: 'a', label: 'A', type: 'number', direction: 'input', defaultValue: 0 },
                { id: 'b', label: 'B', type: 'number', direction: 'input', defaultValue: 0 },
                { id: 'out', label: 'Result', type: 'number', direction: 'output' },
            ];
        case 'constant':
            return [
                { id: 'out', label: 'Value', type: 'any', direction: 'output' },
            ];
        case 'time':
            return [
                { id: 'seconds', label: 'Seconds', type: 'number', direction: 'output' },
                { id: 'normalized', label: 'Normalized', type: 'number', direction: 'output' },
                { id: 'frame', label: 'Frame', type: 'number', direction: 'output' },
            ];
        case 'oscillator':
            return [
                { id: 'freq', label: 'Frequency', type: 'number', direction: 'input', defaultValue: 1 },
                { id: 'amplitude', label: 'Amplitude', type: 'number', direction: 'input', defaultValue: 1 },
                { id: 'offset', label: 'Offset', type: 'number', direction: 'input', defaultValue: 0 },
                { id: 'out', label: 'Value', type: 'number', direction: 'output' },
            ];
        case 'range-map':
            return [
                { id: 'in', label: 'Input', type: 'number', direction: 'input', defaultValue: 0 },
                { id: 'out', label: 'Output', type: 'number', direction: 'output' },
            ];
        case 'smooth':
            return [
                { id: 'in', label: 'Input', type: 'number', direction: 'input', defaultValue: 0 },
                { id: 'out', label: 'Smoothed', type: 'number', direction: 'output' },
            ];
        case 'layer-property':
            return [
                { id: 'value', label: 'Value', type: 'any', direction: 'input', defaultValue: 0 },
            ];
        default:
            return [];
    }
}

export function createNodeDefaults(kind: NodeKind): Record<string, any> {
    switch (kind) {
        case 'audio-band':
            return { band: 'bass' }; // bass | mid | treble | volume
        case 'math-op':
            return { op: 'add' }; // add | sub | mul | div | mod | pow | min | max | abs | clamp
        case 'constant':
            return { value: 1 };
        case 'time':
            return {};
        case 'oscillator':
            return { waveform: 'sine' }; // sine | triangle | square | sawtooth
        case 'range-map':
            return { inMin: 0, inMax: 1, outMin: 0, outMax: 1, clamp: true };
        case 'smooth':
            return { factor: 0.9 };
        case 'layer-property':
            return { property: 'transform.scale' };
        default:
            return {};
    }
}
