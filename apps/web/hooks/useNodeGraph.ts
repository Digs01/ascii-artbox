import { useState, useCallback, useRef } from 'react';
import {
    GraphNode, Connection, NodeGraph, NodeKind,
    createNodePorts, createNodeDefaults
} from '../types/nodeGraph';

const genId = () => Math.random().toString(36).substring(2, 10);

export function useNodeGraph() {
    const [graph, setGraph] = useState<NodeGraph>({ nodes: [], connections: [] });
    const smoothCacheRef = useRef<Record<string, number>>({});

    // ─── CRUD ───

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
        // Prevent duplicate connections to same input port
        setGraph(prev => {
            const existing = prev.connections.find(c => c.toNodeId === toNodeId && c.toPortId === toPortId);
            const filtered = existing
                ? prev.connections.filter(c => c.id !== existing.id)
                : prev.connections;
            return {
                ...prev,
                connections: [...filtered, {
                    id: genId(),
                    fromNodeId,
                    fromPortId,
                    toNodeId,
                    toPortId,
                }],
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
    }, []);

    // ─── EVALUATE ───
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

        // Topological-ish resolve: simple recursive with cycle guard
        const resolving = new Set<string>();

        const resolveNode = (nodeId: string): Record<string, any> => {
            if (outputCache[nodeId]) return outputCache[nodeId];
            if (resolving.has(nodeId)) return {}; // Cycle guard

            resolving.add(nodeId);
            const node = nodes.find(n => n.id === nodeId);
            if (!node) { resolving.delete(nodeId); return {}; }

            // Gather inputs
            const inputs: Record<string, any> = {};
            for (const port of node.ports) {
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
                    outputs.seconds = context.currentTime;
                    outputs.normalized = context.maxDuration > 0 ? context.currentTime / context.maxDuration : 0;
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
                    const t = context.currentTime;
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
                    const cacheKey = node.id;
                    const prev = smoothCacheRef.current[cacheKey] ?? val;
                    const smoothed = prev * factor + val * (1 - factor);
                    smoothCacheRef.current[cacheKey] = smoothed;
                    outputs.out = smoothed;
                    break;
                }

                case 'layer-property': {
                    // Sink node — its input becomes the output property value
                    outputs.value = inputs.value;
                    break;
                }
            }

            outputCache[nodeId] = outputs;
            resolving.delete(nodeId);
            return outputs;
        };

        // Resolve all nodes (important: sinks pull from upstreams)
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
    };
}
