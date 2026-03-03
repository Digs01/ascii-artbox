'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GraphNode, Connection, NodeKind, Port, createNodePorts, createNodeDefaults } from '../../types/nodeGraph';

// ─── Constants ───
const NODE_WIDTH = 180;
const PORT_RADIUS = 6;
const PORT_SPACING = 28;
const HEADER_HEIGHT = 30;

const NODE_COLORS: Record<NodeKind, { bg: string; header: string; accent: string }> = {
    'audio-band': { bg: '#1a1a2e', header: '#e94560', accent: '#e94560' },
    'math-op': { bg: '#1a2a1a', header: '#53d769', accent: '#53d769' },
    'constant': { bg: '#2a2a1a', header: '#f5a623', accent: '#f5a623' },
    'time': { bg: '#1a2a2a', header: '#4fc3f7', accent: '#4fc3f7' },
    'oscillator': { bg: '#2a1a2a', header: '#ce93d8', accent: '#ce93d8' },
    'range-map': { bg: '#1a1a1a', header: '#90a4ae', accent: '#90a4ae' },
    'smooth': { bg: '#1a2020', header: '#80cbc4', accent: '#80cbc4' },
    'layer-property': { bg: '#0d1b2a', header: '#ffd700', accent: '#ffd700' },
};

const NODE_CATALOG: { kind: NodeKind; label: string; description: string }[] = [
    { kind: 'audio-band', label: 'Audio Band', description: 'Read live audio frequency band' },
    { kind: 'time', label: 'Time', description: 'Current time, normalized, frame' },
    { kind: 'oscillator', label: 'Oscillator', description: 'Sine/Triangle/Square/Sawtooth wave' },
    { kind: 'constant', label: 'Constant', description: 'Fixed numeric value' },
    { kind: 'math-op', label: 'Math', description: 'Add, Multiply, Clamp, Pow...' },
    { kind: 'range-map', label: 'Range Map', description: 'Remap value range' },
    { kind: 'smooth', label: 'Smooth', description: 'Exponential smoothing filter' },
    { kind: 'layer-property', label: 'Layer Property', description: 'Drive a layer parameter' },
];

// ─── Helpers ───
function getPortPosition(node: GraphNode, portId: string): { x: number; y: number } {
    const port = node.ports.find(p => p.id === portId);
    if (!port) return { x: node.x, y: node.y };
    const inputs = node.ports.filter(p => p.direction === 'input');
    const outputs = node.ports.filter(p => p.direction === 'output');
    const list = port.direction === 'input' ? inputs : outputs;
    const idx = list.indexOf(port);
    const yOffset = HEADER_HEIGHT + 14 + idx * PORT_SPACING;
    const xOffset = port.direction === 'input' ? 0 : NODE_WIDTH;
    return { x: node.x + xOffset, y: node.y + yOffset };
}

// ─── Props ───
interface NodeEditorProps {
    nodes: GraphNode[];
    connections: Connection[];
    onAddNode: (kind: NodeKind, x: number, y: number) => string;
    onRemoveNode: (nodeId: string) => void;
    onMoveNode: (nodeId: string, x: number, y: number) => void;
    onUpdateNodeConfig: (nodeId: string, config: Record<string, any>) => void;
    onAddConnection: (fromNodeId: string, fromPortId: string, toNodeId: string, toPortId: string) => void;
    onRemoveConnection: (connId: string) => void;
    onClearGraph: () => void;
    evaluatedValues?: Record<string, any>;
}

// ─── Component ───
export function NodeEditor({
    nodes,
    connections,
    onAddNode,
    onRemoveNode,
    onMoveNode,
    onUpdateNodeConfig,
    onAddConnection,
    onRemoveConnection,
    onClearGraph,
    evaluatedValues,
}: NodeEditorProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    const [wire, setWire] = useState<{ fromNodeId: string; fromPortId: string; mouseX: number; mouseY: number } | null>(null);

    const [showCatalog, setShowCatalog] = useState(false);
    const [catalogPos, setCatalogPos] = useState({ x: 0, y: 0 });

    // ─── Coordinate helpers ───
    const screenToGraph = useCallback((clientX: number, clientY: number) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: clientX - rect.left - pan.x, y: clientY - rect.top - pan.y };
    }, [pan]);

    // ─── Pan ───
    const handlePanStart = (e: React.MouseEvent) => {
        if (e.button !== 1 && !(e.button === 0 && e.altKey)) return;
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    };

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (isPanning) {
            setPan({
                x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
                y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
            });
            return;
        }

        if (draggingNode) {
            const pos = screenToGraph(e.clientX, e.clientY);
            onMoveNode(draggingNode, pos.x - dragOffsetRef.current.x, pos.y - dragOffsetRef.current.y);
            return;
        }

        if (wire) {
            const rect = svgRef.current?.getBoundingClientRect();
            if (rect) {
                setWire(prev => prev ? { ...prev, mouseX: e.clientX - rect.left - pan.x, mouseY: e.clientY - rect.top - pan.y } : null);
            }
        }
    }, [isPanning, draggingNode, wire, screenToGraph, onMoveNode, pan]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (isPanning) { setIsPanning(false); return; }
        if (draggingNode) { setDraggingNode(null); return; }

        if (wire) {
            // Check if we're over an input port
            const pos = screenToGraph(e.clientX, e.clientY);
            for (const node of nodes) {
                const inputPorts = node.ports.filter(p => p.direction === 'input');
                for (const port of inputPorts) {
                    const pp = getPortPosition(node, port.id);
                    const dist = Math.hypot(pos.x - pp.x, pos.y - pp.y);
                    if (dist < PORT_RADIUS * 2 && node.id !== wire.fromNodeId) {
                        onAddConnection(wire.fromNodeId, wire.fromPortId, node.id, port.id);
                        break;
                    }
                }
            }
            setWire(null);
        }
    }, [isPanning, draggingNode, wire, nodes, screenToGraph, onAddConnection]);

    // ─── Context Menu (Right Click → Add Node) ───
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const pos = screenToGraph(e.clientX, e.clientY);
        setCatalogPos(pos);
        setShowCatalog(true);
    };

    const handleAddFromCatalog = (kind: NodeKind) => {
        onAddNode(kind, catalogPos.x, catalogPos.y);
        setShowCatalog(false);
    };

    // ─── Node Drag ───
    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const pos = screenToGraph(e.clientX, e.clientY);
        dragOffsetRef.current = { x: pos.x - node.x, y: pos.y - node.y };
        setDraggingNode(nodeId);
    };

    // ─── Port Interaction ───
    const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string, direction: string) => {
        e.stopPropagation();
        if (direction === 'output') {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            setWire({
                fromNodeId: nodeId,
                fromPortId: portId,
                mouseX: e.clientX - rect.left - pan.x,
                mouseY: e.clientY - rect.top - pan.y,
            });
        }
    };

    // ─── Render ───
    const nodeHeight = (node: GraphNode) => {
        const inputs = node.ports.filter(p => p.direction === 'input').length;
        const outputs = node.ports.filter(p => p.direction === 'output').length;
        return HEADER_HEIGHT + 14 + Math.max(inputs, outputs) * PORT_SPACING + 10;
    };

    return (
        <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a]" style={{ cursor: isPanning ? 'grabbing' : 'default' }}>
            {/* Toolbar */}
            <div className="absolute top-2 left-2 z-20 flex gap-1">
                <button
                    onClick={(e) => { const r = svgRef.current?.getBoundingClientRect(); setCatalogPos({ x: 100 - pan.x, y: 50 - pan.y }); setShowCatalog(!showCatalog); }}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors font-bold uppercase tracking-wider"
                >
                    + Add Node
                </button>
                <button
                    onClick={onClearGraph}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-zinc-400 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800 transition-colors font-bold uppercase tracking-wider"
                >
                    Clear
                </button>
                <div className="px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded text-[9px] text-zinc-600 font-mono">
                    Alt+Drag = Pan · Right Click = Add · Drag output → input = Wire
                </div>
            </div>

            {/* Evaluated values display */}
            {evaluatedValues && Object.keys(evaluatedValues).length > 0 && (
                <div className="absolute top-2 right-2 z-20 bg-zinc-900/90 border border-zinc-700 rounded p-2 text-[9px] font-mono text-zinc-400 space-y-0.5 max-w-[200px]">
                    <div className="text-accent-primary font-bold text-[10px] mb-1">LIVE OUTPUT</div>
                    {Object.entries(evaluatedValues).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                            <span className="text-zinc-500 truncate">{k}</span>
                            <span className="text-zinc-200 font-bold">{typeof v === 'number' ? v.toFixed(3) : String(v)}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Catalog Dropdown */}
            {showCatalog && (
                <div
                    className="absolute z-30 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-1 w-52"
                    style={{ left: catalogPos.x + pan.x, top: catalogPos.y + pan.y }}
                >
                    <div className="px-2 py-1 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Add Node</div>
                    {NODE_CATALOG.map(item => (
                        <button
                            key={item.kind}
                            onClick={() => handleAddFromCatalog(item.kind)}
                            className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-zinc-800 transition-colors flex items-center gap-2 group"
                        >
                            <div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[item.kind].accent }} />
                            <div>
                                <div className="text-zinc-200 font-bold text-[11px] group-hover:text-white">{item.label}</div>
                                <div className="text-zinc-500 text-[9px]">{item.description}</div>
                            </div>
                        </button>
                    ))}
                    <button onClick={() => setShowCatalog(false)} className="w-full text-center text-[9px] text-zinc-600 hover:text-zinc-400 py-1 mt-1 border-t border-zinc-800">Cancel</button>
                </div>
            )}

            {/* SVG Canvas */}
            <svg
                ref={svgRef}
                className="w-full h-full"
                onMouseDown={handlePanStart}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
                onClick={() => setShowCatalog(false)}
            >
                {/* Grid Background */}
                <defs>
                    <pattern id="grid-small" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % 20},${pan.y % 20})`}>
                        <circle cx="10" cy="10" r="0.5" fill="#1a1a1a" />
                    </pattern>
                    <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % 100},${pan.y % 100})`}>
                        <rect width="100" height="100" fill="url(#grid-small)" />
                        <circle cx="50" cy="50" r="1" fill="#222" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-large)" />

                <g transform={`translate(${pan.x},${pan.y})`}>
                    {/* Connections */}
                    {connections.map(conn => {
                        const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                        const toNode = nodes.find(n => n.id === conn.toNodeId);
                        if (!fromNode || !toNode) return null;
                        const from = getPortPosition(fromNode, conn.fromPortId);
                        const to = getPortPosition(toNode, conn.toPortId);
                        const dx = Math.abs(to.x - from.x) * 0.5;
                        return (
                            <g key={conn.id}>
                                <path
                                    d={`M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`}
                                    fill="none"
                                    stroke="#555"
                                    strokeWidth="2"
                                    className="cursor-pointer hover:stroke-red-400 transition-colors"
                                    onClick={() => onRemoveConnection(conn.id)}
                                />
                                <path
                                    d={`M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`}
                                    fill="none"
                                    stroke="transparent"
                                    strokeWidth="12"
                                    className="cursor-pointer"
                                    onClick={() => onRemoveConnection(conn.id)}
                                />
                            </g>
                        );
                    })}

                    {/* Active Wire (dragging) */}
                    {wire && (() => {
                        const fromNode = nodes.find(n => n.id === wire.fromNodeId);
                        if (!fromNode) return null;
                        const from = getPortPosition(fromNode, wire.fromPortId);
                        const dx = Math.abs(wire.mouseX - from.x) * 0.5;
                        return (
                            <path
                                d={`M${from.x},${from.y} C${from.x + dx},${from.y} ${wire.mouseX - dx},${wire.mouseY} ${wire.mouseX},${wire.mouseY}`}
                                fill="none"
                                stroke="#888"
                                strokeWidth="2"
                                strokeDasharray="4 4"
                                pointerEvents="none"
                            />
                        );
                    })()}

                    {/* Nodes */}
                    {nodes.map(node => {
                        const h = nodeHeight(node);
                        const colors = NODE_COLORS[node.kind];
                        const inputs = node.ports.filter(p => p.direction === 'input');
                        const outputs = node.ports.filter(p => p.direction === 'output');

                        return (
                            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                                {/* Body */}
                                <rect
                                    width={NODE_WIDTH} height={h}
                                    rx="6" ry="6"
                                    fill={colors.bg}
                                    stroke={colors.accent}
                                    strokeWidth="1"
                                    strokeOpacity="0.4"
                                    className="cursor-grab"
                                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                                />
                                {/* Header */}
                                <rect width={NODE_WIDTH} height={HEADER_HEIGHT} rx="6" ry="6" fill={colors.header} fillOpacity="0.2" onMouseDown={(e) => handleNodeMouseDown(e, node.id)} className="cursor-grab" />
                                <rect y={HEADER_HEIGHT - 1} width={NODE_WIDTH} height="2" fill={colors.header} fillOpacity="0.3" />
                                <text x="10" y="20" fill={colors.accent} fontSize="11" fontWeight="bold" fontFamily="monospace" pointerEvents="none">
                                    {node.label}
                                </text>
                                {/* Delete button */}
                                <text
                                    x={NODE_WIDTH - 16} y="19"
                                    fill="#555" fontSize="14"
                                    className="cursor-pointer hover:fill-red-400"
                                    onClick={() => onRemoveNode(node.id)}
                                >×</text>

                                {/* Input Ports */}
                                {inputs.map((port, i) => {
                                    const py = HEADER_HEIGHT + 14 + i * PORT_SPACING;
                                    return (
                                        <g key={port.id}>
                                            <circle
                                                cx={0} cy={py}
                                                r={PORT_RADIUS}
                                                fill={connections.some(c => c.toNodeId === node.id && c.toPortId === port.id) ? colors.accent : '#333'}
                                                stroke={colors.accent}
                                                strokeWidth="1.5"
                                                className="cursor-crosshair"
                                                onMouseUp={(e) => {
                                                    // Drop a wire here
                                                    if (wire && wire.fromNodeId !== node.id) {
                                                        e.stopPropagation();
                                                        onAddConnection(wire.fromNodeId, wire.fromPortId, node.id, port.id);
                                                        setWire(null);
                                                    }
                                                }}
                                            />
                                            <text x="14" y={py + 4} fill="#888" fontSize="10" fontFamily="monospace" pointerEvents="none">{port.label}</text>
                                        </g>
                                    );
                                })}

                                {/* Output Ports */}
                                {outputs.map((port, i) => {
                                    const py = HEADER_HEIGHT + 14 + i * PORT_SPACING;
                                    return (
                                        <g key={port.id}>
                                            <circle
                                                cx={NODE_WIDTH} cy={py}
                                                r={PORT_RADIUS}
                                                fill={connections.some(c => c.fromNodeId === node.id && c.fromPortId === port.id) ? colors.accent : '#333'}
                                                stroke={colors.accent}
                                                strokeWidth="1.5"
                                                className="cursor-crosshair"
                                                onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, 'output')}
                                            />
                                            <text x={NODE_WIDTH - 14} y={py + 4} fill="#888" fontSize="10" fontFamily="monospace" textAnchor="end" pointerEvents="none">{port.label}</text>
                                        </g>
                                    );
                                })}

                                {/* Inline Config */}
                                <foreignObject x="8" y={h - 30} width={NODE_WIDTH - 16} height="24">
                                    <NodeConfigEditor node={node} onUpdate={(cfg) => onUpdateNodeConfig(node.id, cfg)} />
                                </foreignObject>
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}

// ─── Inline Config Editor ───
function NodeConfigEditor({ node, onUpdate }: { node: GraphNode; onUpdate: (cfg: Record<string, any>) => void }) {
    switch (node.kind) {
        case 'audio-band':
            return (
                <select
                    value={node.config.band || 'bass'}
                    onChange={(e) => onUpdate({ band: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white font-mono"
                >
                    <option value="bass">Bass</option>
                    <option value="mid">Mid</option>
                    <option value="treble">Treble</option>
                    <option value="volume">Volume</option>
                </select>
            );
        case 'math-op':
            return (
                <select
                    value={node.config.op || 'add'}
                    onChange={(e) => onUpdate({ op: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white font-mono"
                >
                    {['add', 'sub', 'mul', 'div', 'mod', 'pow', 'min', 'max', 'abs', 'clamp'].map(o => (
                        <option key={o} value={o}>{o.toUpperCase()}</option>
                    ))}
                </select>
            );
        case 'constant':
            return (
                <input
                    type="number"
                    value={node.config.value ?? 0}
                    onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
                    step="0.1"
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white font-mono"
                />
            );
        case 'oscillator':
            return (
                <select
                    value={node.config.waveform || 'sine'}
                    onChange={(e) => onUpdate({ waveform: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white font-mono"
                >
                    <option value="sine">Sine</option>
                    <option value="triangle">Triangle</option>
                    <option value="square">Square</option>
                    <option value="sawtooth">Sawtooth</option>
                </select>
            );
        case 'range-map':
            return (
                <div className="flex gap-0.5 text-[8px] text-white font-mono items-center">
                    <input type="number" value={node.config.inMin ?? 0} step="0.1" onChange={(e) => onUpdate({ inMin: parseFloat(e.target.value) || 0 })} className="w-8 bg-black/60 border border-white/10 rounded px-0.5 text-center" />
                    <span className="text-zinc-500">→</span>
                    <input type="number" value={node.config.outMin ?? 0} step="0.1" onChange={(e) => onUpdate({ outMin: parseFloat(e.target.value) || 0 })} className="w-8 bg-black/60 border border-white/10 rounded px-0.5 text-center" />
                    <span className="text-zinc-500">|</span>
                    <input type="number" value={node.config.inMax ?? 1} step="0.1" onChange={(e) => onUpdate({ inMax: parseFloat(e.target.value) || 1 })} className="w-8 bg-black/60 border border-white/10 rounded px-0.5 text-center" />
                    <span className="text-zinc-500">→</span>
                    <input type="number" value={node.config.outMax ?? 1} step="0.1" onChange={(e) => onUpdate({ outMax: parseFloat(e.target.value) || 1 })} className="w-8 bg-black/60 border border-white/10 rounded px-0.5 text-center" />
                </div>
            );
        case 'smooth':
            return (
                <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-mono">
                    <span>Factor</span>
                    <input type="range" min="0.5" max="0.99" step="0.01" value={node.config.factor ?? 0.9} onChange={(e) => onUpdate({ factor: parseFloat(e.target.value) })} className="flex-1 h-1 accent-teal-400" />
                    <span className="text-white w-6 text-right">{(node.config.factor ?? 0.9).toFixed(2)}</span>
                </div>
            );
        case 'layer-property':
            return (
                <select
                    value={node.config.property || 'transform.scale'}
                    onChange={(e) => onUpdate({ property: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-amber-300 font-mono font-bold"
                >
                    <option value="transform.scale">Scale</option>
                    <option value="transform.rotation">Rotation</option>
                    <option value="transform.opacity">Opacity</option>
                    <option value="transform.x">X Position</option>
                    <option value="transform.y">Y Position</option>
                    <option value="options.fontSize">Font Size</option>
                </select>
            );
        default:
            return null;
    }
}
