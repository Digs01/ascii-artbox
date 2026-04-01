import { useState, useCallback, useRef } from 'react';
import {
    GraphNode, Connection, NodeGraph, NodeKind,
    createNodePorts, createNodeDefaults
} from '../types/nodeGraph';

const genId = () => Math.random().toString(36).substring(2, 10);

// ─── Color Utilities ─────────────────────────────────────────────────────────
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const clean = hex.replace('#', '').padEnd(6, '0');
    return {
        r: parseInt(clean.slice(0, 2), 16) || 0,
        g: parseInt(clean.slice(2, 4), 16) || 0,
        b: parseInt(clean.slice(4, 6), 16) || 0,
    };
}
function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}

const LS_KEY = 'ascii-node-graphs';

export function useNodeGraph() {
    const [graph, setGraph] = useState<NodeGraph>({ nodes: [], connections: [] });
    const smoothCacheRef = useRef<Record<string, number>>({});
    // Delay node ring buffers: { nodeId → { buffer: number[], head: number, sampleRate: number } }
    const delayBufferRef = useRef<Map<string, { buffer: number[]; head: number }>>(new Map());

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    const addNode = useCallback((kind: NodeKind, x: number, y: number) => {
        const node: GraphNode = {
            id: genId(),
            kind,
            label: kind.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            x,
            y,
            ports: createNodePorts(kind),
            config: createNodeDefaults(kind),
        };
        setGraph(prev => ({ ...prev, nodes: [...prev.nodes, node] }));
        return node.id;
    }, []);

    const removeNode = useCallback((nodeId: string) => {
        delayBufferRef.current.delete(nodeId);
        smoothCacheRef.current = Object.fromEntries(
            Object.entries(smoothCacheRef.current).filter(([k]) => k !== nodeId)
        );
        setGraph(prev => ({
            nodes: prev.nodes.filter(n => n.id !== nodeId),
            connections: prev.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId),
        }));
    }, []);

    const moveNode = useCallback((nodeId: string, x: number, y: number) => {
        setGraph(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, x, y } : n),
        }));
    }, []);

    const updateNodeConfig = useCallback((nodeId: string, config: Record<string, any>) => {
        setGraph(prev => ({
            ...prev,
            nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, config: { ...n.config, ...config } } : n),
        }));
    }, []);

    const addConnection = useCallback((fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => {
        setGraph(prev => {
            const existing = prev.connections.find(c => c.toNodeId === toNodeId && c.toPortId === toPortId);
            const filtered = existing
                ? prev.connections.filter(c => c.id !== existing.id)
                : prev.connections;
            return {
                ...prev,
                connections: [...filtered, { id: genId(), fromNodeId, fromPortId, toNodeId, toPortId }],
            };
        });
    }, []);

    const removeConnection = useCallback((connId: string) => {
        setGraph(prev => ({
            ...prev,
            connections: prev.connections.filter(c => c.id !== connId),
        }));
    }, []);

    const clearGraph = useCallback(() => {
        setGraph({ nodes: [], connections: [] });
        smoothCacheRef.current = {};
        delayBufferRef.current.clear();
    }, []);

    // ─── Graph Serialization (localStorage) ──────────────────────────────────

    const saveGraph = useCallback((name: string) => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            saved[name] = graph;
            localStorage.setItem(LS_KEY, JSON.stringify(saved));
        } catch { /* storage unavailable */ }
    }, [graph]);

    const loadGraph = useCallback((name: string) => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            if (saved[name]) {
                setGraph(saved[name]);
                smoothCacheRef.current = {};
                delayBufferRef.current.clear();
            }
        } catch { /* storage unavailable */ }
    }, []);

    const deleteSavedGraph = useCallback((name: string) => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
            delete saved[name];
            localStorage.setItem(LS_KEY, JSON.stringify(saved));
        } catch { /* storage unavailable */ }
    }, []);

    const listSavedGraphs = useCallback((): string[] => {
        try {
            return Object.keys(JSON.parse(localStorage.getItem(LS_KEY) || '{}'));
        } catch { return []; }
    }, []);

    const loadPreset = useCallback((presetGraph: NodeGraph) => {
        setGraph(presetGraph);
        smoothCacheRef.current = {};
        delayBufferRef.current.clear();
    }, []);

    // ─── EVALUATE ─────────────────────────────────────────────────────────────
    // Runs the graph and returns { [property]: value } for all LayerProperty sinks

    const evaluate = useCallback((context: {
        currentTime: number;
        maxDuration: number;
        globalFrameCount: number;
        audioMetrics?: { bass: number; mid: number; treble: number; volume: number };
    }): Record<string, number | string | boolean> => {
        const { nodes, connections } = graph;
        if (nodes.length === 0) return {};

        const outputCache: Record<string, Record<string, any>> = {};
        const resolving = new Set<string>();

        const resolveNode = (nodeId: string): Record<string, any> => {
            if (outputCache[nodeId]) return outputCache[nodeId];
            if (resolving.has(nodeId)) return {}; // Cycle guard

            resolving.add(nodeId);
            const node = nodes.find(n => n.id === nodeId);
            if (!node) { resolving.delete(nodeId); return {}; }

            // Gather inputs
            const inputs: Record<string, any> = {};
            for (const port of (node.ports.length > 0 ? node.ports : createNodePorts(node.kind))) {
                if (port.direction === 'input') {
                    const conn = connections.find(c => c.toNodeId === nodeId && c.toPortId === port.id);
                    if (conn) {
                        const upstream = resolveNode(conn.fromNodeId);
                        inputs[port.id] = upstream[conn.fromPortId] ?? port.defaultValue ?? 0;
                    } else {
                        inputs[port.id] = port.defaultValue ?? 0;
                    }
                }
            }

            // Compute outputs
            let outputs: Record<string, any> = {};
            const t = context.currentTime;

            switch (node.kind) {
                case 'audio-band': {
                    const band = node.config.band || 'bass';
                    outputs.out = context.audioMetrics?.[band as keyof typeof context.audioMetrics] ?? 0;
                    break;
                }

                case 'constant': {
                    outputs.out = node.config.value ?? 0;
                    break;
                }

                case 'time': {
                    outputs.seconds = t;
                    outputs.normalized = context.maxDuration > 0 ? t / context.maxDuration : 0;
                    outputs.frame = context.globalFrameCount;
                    break;
                }

                case 'math-op': {
                    const a = Number(inputs.a) || 0;
                    const b = Number(inputs.b) || 0;
                    switch (node.config.op) {
                        case 'add': outputs.out = a + b; break;
                        case 'sub': outputs.out = a - b; break;
                        case 'mul': outputs.out = a * b; break;
                        case 'div': outputs.out = b !== 0 ? a / b : 0; break;
                        case 'mod': outputs.out = b !== 0 ? a % b : 0; break;
                        case 'pow': outputs.out = Math.pow(a, b); break;
                        case 'min': outputs.out = Math.min(a, b); break;
                        case 'max': outputs.out = Math.max(a, b); break;
                        case 'abs': outputs.out = Math.abs(a); break;
                        case 'clamp': outputs.out = Math.max(0, Math.min(1, a)); break;
                        default: outputs.out = a + b;
                    }
                    break;
                }

                case 'oscillator': {
                    const freq = Number(inputs.freq) || 1;
                    const amp = Number(inputs.amplitude) || 1;
                    const offset = Number(inputs.offset) || 0;
                    switch (node.config.waveform) {
                        case 'sine': outputs.out = offset + amp * Math.sin(t * freq * Math.PI * 2); break;
                        case 'triangle': outputs.out = offset + amp * (2 * Math.abs(2 * ((t * freq) % 1) - 1) - 1); break;
                        case 'square': outputs.out = offset + amp * (Math.sin(t * freq * Math.PI * 2) >= 0 ? 1 : -1); break;
                        case 'sawtooth': outputs.out = offset + amp * (2 * ((t * freq) % 1) - 1); break;
                        default: outputs.out = offset + amp * Math.sin(t * freq * Math.PI * 2);
                    }
                    break;
                }

                case 'range-map': {
                    const val = Number(inputs.in) || 0;
                    const { inMin = 0, inMax = 1, outMin = 0, outMax = 1, clamp: doClamp = true } = node.config;
                    let mapped = outMin + ((val - inMin) / ((inMax - inMin) || 1)) * (outMax - outMin);
                    if (doClamp) mapped = Math.max(Math.min(outMin, outMax), Math.min(Math.max(outMin, outMax), mapped));
                    outputs.out = mapped;
                    break;
                }

                case 'smooth': {
                    const val = Number(inputs.in) || 0;
                    const factor = node.config.factor ?? 0.9;
                    const prev = smoothCacheRef.current[node.id] ?? val;
                    const smoothed = prev * factor + val * (1 - factor);
                    smoothCacheRef.current[node.id] = smoothed;
                    outputs.out = smoothed;
                    break;
                }

                case 'layer-property': {
                    outputs.value = inputs.value;
                    break;
                }

                // ─── New Nodes ───────────────────────────────────────────────

                case 'noise': {
                    // Organic-feeling value noise without external deps
                    // Uses multiple overlapping sin waves (similar to Perlin spectral synthesis)
                    const freq = Number(inputs.freq) || 1;
                    const amp = Number(inputs.amplitude) || 1;
                    const seed = node.config.seed ?? 42;
                    const n = Math.sin(seed + t * freq) * Math.sin(seed * 2.1 + t * freq * 1.77)
                             + Math.sin(seed * 3.7 + t * freq * 0.53) * 0.5
                             + Math.sin(seed * 1.3 + t * freq * 2.37) * 0.25;
                    outputs.out = amp * (n / 1.75); // normalise to approx ±1
                    break;
                }

                case 'delay': {
                    // Ring buffer delay — 60fps assumed for buffer sizing
                    const val = Number(inputs.in) || 0;
                    const delaySec = node.config.delaySeconds ?? 0.5;
                    const SAMPLE_RATE = 60;
                    const bufLen = Math.max(1, Math.round(delaySec * SAMPLE_RATE));

                    let buf = delayBufferRef.current.get(node.id);
                    if (!buf || buf.buffer.length !== bufLen) {
                        buf = { buffer: new Array(bufLen).fill(0), head: 0 };
                        delayBufferRef.current.set(node.id, buf);
                    }

                    const delayed = buf.buffer[buf.head];
                    buf.buffer[buf.head] = val;
                    buf.head = (buf.head + 1) % bufLen;
                    outputs.out = delayed;
                    break;
                }

                case 'compare': {
                    const a = Number(inputs.a) || 0;
                    const b = Number(inputs.b) || 0;
                    switch (node.config.op) {
                        case '>':  outputs.out = a > b  ? 1 : 0; break;
                        case '<':  outputs.out = a < b  ? 1 : 0; break;
                        case '>=': outputs.out = a >= b ? 1 : 0; break;
                        case '<=': outputs.out = a <= b ? 1 : 0; break;
                        case '===': outputs.out = Math.abs(a - b) < 0.001 ? 1 : 0; break;
                        default:   outputs.out = a > b  ? 1 : 0;
                    }
                    break;
                }

                case 'select': {
                    const condition = Number(inputs.condition) || 0;
                    outputs.out = condition > 0.5 ? inputs.a : inputs.b;
                    break;
                }

                case 'color-lerp': {
                    const tVal = Math.max(0, Math.min(1, Number(inputs.t) || 0));
                    const colorA = hexToRgb(node.config.colorA || '#000000');
                    const colorB = hexToRgb(node.config.colorB || '#ffffff');
                    outputs.out = rgbToHex(
                        colorA.r + (colorB.r - colorA.r) * tVal,
                        colorA.g + (colorB.g - colorA.g) * tVal,
                        colorA.b + (colorB.b - colorA.b) * tVal,
                    );
                    break;
                }
            }

            outputCache[nodeId] = outputs;
            resolving.delete(nodeId);
            return outputs;
        };

        // Resolve all nodes (sinks pull from upstreams)
        for (const node of nodes) {
            resolveNode(node.id);
        }

        // Collect LayerProperty sinks
        const result: Record<string, any> = {};
        for (const node of nodes) {
            if (node.kind === 'layer-property') {
                const property = node.config.property;
                if (property && outputCache[node.id]) {
                    result[property] = outputCache[node.id].value;
                }
            }
        }

        return result;
    }, [graph]);

    return {
        graph,
        setGraph,
        addNode,
        removeNode,
        moveNode,
        updateNodeConfig,
        addConnection,
        removeConnection,
        clearGraph,
        evaluate,
        // Serialization
        saveGraph,
        loadGraph,
        deleteSavedGraph,
        listSavedGraphs,
        loadPreset,
    };
}
