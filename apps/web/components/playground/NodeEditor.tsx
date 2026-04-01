'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { GraphNode, Connection, NodeKind, NodeGraph, Port, createNodePorts, createNodeDefaults } from '../../types/nodeGraph';
import { NODE_PRESETS } from '../../config/nodePresets';

// ─── Constants ───
const NODE_WIDTH = 180;
const PORT_RADIUS = 6;
const PORT_SPACING = 28;
const HEADER_HEIGHT = 30;

const NODE_COLORS: Record<NodeKind, { bg: string; header: string; accent: string }> = {
    'audio-band':    { bg: '#1a1a2e', header: '#e94560', accent: '#e94560' },
    'math-op':       { bg: '#1a2a1a', header: '#53d769', accent: '#53d769' },
    'constant':      { bg: '#2a2a1a', header: '#f5a623', accent: '#f5a623' },
    'time':          { bg: '#1a2a2a', header: '#4fc3f7', accent: '#4fc3f7' },
    'oscillator':    { bg: '#2a1a2a', header: '#ce93d8', accent: '#ce93d8' },
    'range-map':     { bg: '#1a1a1a', header: '#90a4ae', accent: '#90a4ae' },
    'smooth':        { bg: '#1a2020', header: '#80cbc4', accent: '#80cbc4' },
    'layer-property':{ bg: '#0d1b2a', header: '#ffd700', accent: '#ffd700' },
    // ─── New ───
    'noise':         { bg: '#201520', header: '#f06292', accent: '#f06292' },
    'delay':         { bg: '#1a1a2a', header: '#7986cb', accent: '#7986cb' },
    'compare':       { bg: '#201a10', header: '#ffb74d', accent: '#ffb74d' },
    'select':        { bg: '#101a20', header: '#4db6ac', accent: '#4db6ac' },
    'color-lerp':    { bg: '#1a1020', header: '#ba68c8', accent: '#ba68c8' },
};

const NODE_CATALOG: { kind: NodeKind; label: string; description: string; group: string }[] = [
    // Sources
    { kind: 'audio-band',    label: 'Audio Band',    description: 'Live audio frequency band',       group: 'Sources' },
    { kind: 'time',          label: 'Time',           description: 'Current time / frame / norm',     group: 'Sources' },
    { kind: 'oscillator',    label: 'Oscillator',     description: 'Sine / Triangle / Square / Saw',  group: 'Sources' },
    { kind: 'noise',         label: 'Noise',          description: 'Organic pseudo-random signal',    group: 'Sources' },
    { kind: 'constant',      label: 'Constant',       description: 'Fixed numeric value',             group: 'Sources' },
    // Processing
    { kind: 'math-op',       label: 'Math',           description: 'Add / Mul / Clamp / Pow…',       group: 'Process' },
    { kind: 'range-map',     label: 'Range Map',      description: 'Remap value range',               group: 'Process' },
    { kind: 'smooth',        label: 'Smooth',         description: 'Exponential smoothing filter',    group: 'Process' },
    { kind: 'delay',         label: 'Delay',          description: 'Time-delay a signal',             group: 'Process' },
    { kind: 'compare',       label: 'Compare',        description: 'A > B → 0 or 1',                 group: 'Logic' },
    { kind: 'select',        label: 'Select',         description: 'if condition → A else B',         group: 'Logic' },
    { kind: 'color-lerp',    label: 'Color Lerp',     description: 'Blend two colors by T',          group: 'Color' },
    // Sinks
    { kind: 'layer-property',label: 'Layer Property', description: 'Drive a layer parameter',        group: 'Sinks' },
];

// ─── Helpers ───
function getPortPosition(node: GraphNode, portId: string): { x: number; y: number } {
    const ports = node.ports.length > 0 ? node.ports : createNodePorts(node.kind);
    const port = ports.find(p => p.id === portId);
    if (!port) return { x: node.x, y: node.y };
    const inputs  = ports.filter(p => p.direction === 'input');
    const outputs = ports.filter(p => p.direction === 'output');
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
    // Serialization
    onSaveGraph: (name: string) => void;
    onLoadGraph: (name: string) => void;
    onDeleteGraph: (name: string) => void;
    listSavedGraphs: () => string[];
    onLoadPreset: (graph: NodeGraph) => void;
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
    onSaveGraph,
    onLoadGraph,
    onDeleteGraph,
    listSavedGraphs,
    onLoadPreset,
}: NodeEditorProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    const [wire, setWire] = useState<{ fromNodeId: string; fromPortId: string; mouseX: number; mouseY: number } | null>(null);

    const [showCatalog, setShowCatalog] = useState(false);
    const [catalogPos, setCatalogPos] = useState({ x: 0, y: 0 });
    const [catalogFilter, setCatalogFilter] = useState('');

    // Save/Load UI state
    const [showSavePanel, setShowSavePanel] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [savedGraphs, setSavedGraphs] = useState<string[]>([]);

    // Refresh saved graphs list when panel opens
    useEffect(() => {
        if (showSavePanel) setSavedGraphs(listSavedGraphs());
    }, [showSavePanel, listSavedGraphs]);

    // ─── Coordinate helpers ───────────────────────────────────────────────────
    const screenToGraph = useCallback((clientX: number, clientY: number) => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return { x: clientX - rect.left - pan.x, y: clientY - rect.top - pan.y };
    }, [pan]);

    // ─── Pan ─────────────────────────────────────────────────────────────────
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
            if (rect) setWire(prev => prev ? { ...prev, mouseX: e.clientX - rect.left - pan.x, mouseY: e.clientY - rect.top - pan.y } : null);
        }
    }, [isPanning, draggingNode, wire, screenToGraph, onMoveNode, pan]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (isPanning) { setIsPanning(false); return; }
        if (draggingNode) { setDraggingNode(null); return; }
        if (wire) {
            const pos = screenToGraph(e.clientX, e.clientY);
            for (const node of nodes) {
                const inputPorts = (node.ports.length > 0 ? node.ports : createNodePorts(node.kind)).filter(p => p.direction === 'input');
                for (const port of inputPorts) {
                    const pp = getPortPosition(node, port.id);
                    if (Math.hypot(pos.x - pp.x, pos.y - pp.y) < PORT_RADIUS * 2 && node.id !== wire.fromNodeId) {
                        onAddConnection(wire.fromNodeId, wire.fromPortId, node.id, port.id);
                        break;
                    }
                }
            }
            setWire(null);
        }
    }, [isPanning, draggingNode, wire, nodes, screenToGraph, onAddConnection]);

    // ─── Context Menu ─────────────────────────────────────────────────────────
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setCatalogPos(screenToGraph(e.clientX, e.clientY));
        setCatalogFilter('');
        setShowCatalog(true);
    };

    const handleAddFromCatalog = (kind: NodeKind) => {
        onAddNode(kind, catalogPos.x, catalogPos.y);
        setShowCatalog(false);
        setCatalogFilter('');
    };

    // ─── Node Drag ────────────────────────────────────────────────────────────
    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
        e.stopPropagation();
        if (e.button !== 0) return;
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const pos = screenToGraph(e.clientX, e.clientY);
        dragOffsetRef.current = { x: pos.x - node.x, y: pos.y - node.y };
        setDraggingNode(nodeId);
    };

    const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string, direction: string) => {
        e.stopPropagation();
        if (direction === 'output') {
            const rect = svgRef.current?.getBoundingClientRect();
            if (!rect) return;
            setWire({ fromNodeId: nodeId, fromPortId: portId, mouseX: e.clientX - rect.left - pan.x, mouseY: e.clientY - rect.top - pan.y });
        }
    };

    const nodeHeight = (node: GraphNode) => {
        const ports = node.ports.length > 0 ? node.ports : createNodePorts(node.kind);
        const inputs  = ports.filter(p => p.direction === 'input').length;
        const outputs = ports.filter(p => p.direction === 'output').length;
        return HEADER_HEIGHT + 14 + Math.max(inputs, outputs) * PORT_SPACING + 10;
    };

    // ─── Mini-Map ─────────────────────────────────────────────────────────────
    const MINI_SCALE = 0.065;
    const MINI_W = 160;
    const MINI_H = 100;

    // Bounding box of all nodes for minimap centering
    const miniViewport = (() => {
        if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 800, maxY: 500 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const n of nodes) {
            const h = HEADER_HEIGHT + 14 + Math.max(
                (n.ports.length > 0 ? n.ports : createNodePorts(n.kind)).filter(p => p.direction === 'input').length,
                (n.ports.length > 0 ? n.ports : createNodePorts(n.kind)).filter(p => p.direction === 'output').length,
            ) * PORT_SPACING + 10;
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + NODE_WIDTH);
            maxY = Math.max(maxY, n.y + h);
        }
        const pad = 50;
        return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
    })();

    const miniToCanvas = (gx: number, gy: number) => ({
        x: (gx - miniViewport.minX) / (miniViewport.maxX - miniViewport.minX) * MINI_W,
        y: (gy - miniViewport.minY) / (miniViewport.maxY - miniViewport.minY) * MINI_H,
    });

    // ─── Connection color (accent of from-node) ───────────────────────────────
    const connColor = (conn: Connection) => {
        const fromNode = nodes.find(n => n.id === conn.fromNodeId);
        return fromNode ? NODE_COLORS[fromNode.kind].accent : '#555';
    };

    // Catalog groups
    const catalogGroups = ['Sources', 'Process', 'Logic', 'Color', 'Sinks'];
    const filteredCatalog = NODE_CATALOG.filter(n =>
        !catalogFilter || n.label.toLowerCase().includes(catalogFilter.toLowerCase()) || n.description.toLowerCase().includes(catalogFilter.toLowerCase())
    );

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-[#080810]" style={{ cursor: isPanning ? 'grabbing' : 'default' }}>

            {/* ─── Toolbar ─────────────────────────────────────────────────── */}
            <div className="absolute top-2 left-2 z-20 flex gap-1 items-center flex-wrap">
                {/* Add Node */}
                <button
                    onClick={() => { setCatalogPos({ x: 100 - pan.x, y: 50 - pan.y }); setCatalogFilter(''); setShowCatalog(!showCatalog); }}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors font-bold uppercase tracking-wider flex items-center gap-1"
                >
                    <span className="text-accent-primary">+</span> Node
                </button>

                {/* Templates */}
                <div className="relative">
                    <button
                        onClick={() => setShowCatalog(false)}
                        className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-purple-400 hover:bg-zinc-800 hover:text-purple-200 transition-colors font-bold uppercase tracking-wider peer"
                    >
                        Templates
                    </button>
                    <div className="absolute left-0 top-full mt-1 z-40 hidden peer-focus:block hover:block">
                        {/* can't do hover on a button wrapper in React without state — use state below */}
                    </div>
                </div>
                <div className="relative group">
                    <button className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-purple-400 hover:bg-purple-900/30 hover:text-purple-200 transition-colors font-bold uppercase tracking-wider">
                        🎨 Templates ▾
                    </button>
                    <div className="absolute left-0 top-full mt-1 z-40 bg-[#111] border border-zinc-700 rounded-lg shadow-2xl p-1 w-56 hidden group-hover:block">
                        <div className="px-2 py-1 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Starter Templates</div>
                        {NODE_PRESETS.map(preset => (
                            <button
                                key={preset.name}
                                onClick={() => { onClearGraph(); onLoadPreset(preset.build()); }}
                                className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-zinc-800 transition-colors flex items-center gap-2"
                            >
                                <span className="text-lg leading-none">{preset.icon}</span>
                                <div>
                                    <div className="text-zinc-200 font-bold text-[11px]">{preset.name}</div>
                                    <div className="text-zinc-500 text-[9px]">{preset.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Save / Load */}
                <button
                    onClick={() => setShowSavePanel(p => !p)}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-teal-400 hover:bg-zinc-800 hover:text-teal-200 transition-colors font-bold uppercase tracking-wider"
                >
                    💾 Save / Load
                </button>

                {/* Clear */}
                <button
                    onClick={onClearGraph}
                    className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-zinc-400 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800 transition-colors font-bold uppercase tracking-wider"
                >
                    Clear
                </button>

                <div className="px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded text-[9px] text-zinc-600 font-mono">
                    Alt+Drag = Pan · Right Click = Add
                </div>
            </div>

            {/* ─── Save / Load Panel ────────────────────────────────────────── */}
            {showSavePanel && (
                <div className="absolute top-12 left-2 z-40 bg-[#111] border border-zinc-700 rounded-xl shadow-2xl p-3 w-64">
                    <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-2">💾 Save / Load Graph</div>
                    {/* Save */}
                    <div className="flex gap-1 mb-3">
                        <input
                            value={saveName}
                            onChange={e => setSaveName(e.target.value)}
                            placeholder="Graph name..."
                            className="flex-1 bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white font-mono focus:outline-none focus:border-teal-500"
                        />
                        <button
                            onClick={() => {
                                if (!saveName.trim()) return;
                                onSaveGraph(saveName.trim());
                                setSavedGraphs(listSavedGraphs());
                                setSaveName('');
                            }}
                            className="px-2 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold transition-colors"
                        >Save</button>
                    </div>
                    {/* Saved list */}
                    {savedGraphs.length === 0 ? (
                        <div className="text-[9px] text-zinc-600 text-center py-2">No saved graphs yet</div>
                    ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                            {savedGraphs.map(name => (
                                <div key={name} className="flex items-center gap-1">
                                    <button
                                        onClick={() => { onLoadGraph(name); setShowSavePanel(false); }}
                                        className="flex-1 text-left px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-300 hover:text-white transition-colors truncate font-mono"
                                    >{name}</button>
                                    <button
                                        onClick={() => { onDeleteGraph(name); setSavedGraphs(listSavedGraphs()); }}
                                        className="text-[11px] text-zinc-600 hover:text-red-400 w-5 h-5 flex items-center justify-center rounded hover:bg-red-900/20 transition-colors"
                                        title="Delete"
                                    >×</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={() => setShowSavePanel(false)} className="mt-2 w-full text-center text-[9px] text-zinc-600 hover:text-zinc-400">Close</button>
                </div>
            )}

            {/* ─── Evaluated Values Display ─────────────────────────────────── */}
            {evaluatedValues && Object.keys(evaluatedValues).length > 0 && (
                <div className="absolute top-2 right-2 z-20 bg-zinc-900/90 border border-zinc-700 rounded-lg p-2 text-[9px] font-mono text-zinc-400 space-y-0.5 max-w-[200px]">
                    <div className="text-accent-primary font-bold text-[10px] mb-1 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                        LIVE OUTPUT
                    </div>
                    {Object.entries(evaluatedValues).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                            <span className="text-zinc-500 truncate">{k}</span>
                            <span className="text-zinc-200 font-bold">
                                {typeof v === 'number' ? v.toFixed(3) : typeof v === 'string' && v.startsWith('#') ? (
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-sm inline-block border border-white/20" style={{ background: v }} />
                                        {v}
                                    </span>
                                ) : String(v)}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Catalog Dropdown ─────────────────────────────────────────── */}
            {showCatalog && (() => {
                const groups = catalogGroups.filter(g => filteredCatalog.some(n => n.group === g));
                return (
                    <div
                        className="absolute z-30 bg-[#111] border border-zinc-700 rounded-xl shadow-2xl p-1.5 w-60"
                        style={{ left: catalogPos.x + pan.x + 4, top: catalogPos.y + pan.y + 4 }}
                    >
                        <input
                            autoFocus
                            value={catalogFilter}
                            onChange={e => setCatalogFilter(e.target.value)}
                            placeholder="Search nodes…"
                            className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-[10px] text-white font-mono mb-1.5 focus:outline-none focus:border-accent-primary"
                        />
                        {groups.map(group => (
                            <div key={group}>
                                <div className="px-2 py-0.5 text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{group}</div>
                                {filteredCatalog.filter(n => n.group === group).map(item => (
                                    <button
                                        key={item.kind}
                                        onClick={() => handleAddFromCatalog(item.kind)}
                                        className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-zinc-800 transition-colors flex items-center gap-2 group"
                                    >
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: NODE_COLORS[item.kind].accent }} />
                                        <div>
                                            <div className="text-zinc-200 font-bold text-[11px] group-hover:text-white">{item.label}</div>
                                            <div className="text-zinc-500 text-[9px]">{item.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))}
                        <button onClick={() => { setShowCatalog(false); setCatalogFilter(''); }} className="w-full text-center text-[9px] text-zinc-600 hover:text-zinc-400 py-1 mt-1 border-t border-zinc-800">Cancel</button>
                    </div>
                );
            })()}

            {/* ─── SVG Canvas ───────────────────────────────────────────────── */}
            <svg
                ref={svgRef}
                className="w-full h-full"
                onMouseDown={handlePanStart}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onContextMenu={handleContextMenu}
                onClick={() => { setShowCatalog(false); setCatalogFilter(''); }}
            >
                {/* Grid */}
                <defs>
                    <pattern id="grid-small" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % 20},${pan.y % 20})`}>
                        <circle cx="10" cy="10" r="0.5" fill="#151520" />
                    </pattern>
                    <pattern id="grid-large" width="100" height="100" patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x % 100},${pan.y % 100})`}>
                        <rect width="100" height="100" fill="url(#grid-small)" />
                        <circle cx="50" cy="50" r="1" fill="#1a1a2a" />
                    </pattern>
                    {/* Animated wire gradient */}
                    <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
                        <circle cx="3" cy="3" r="2" fill="#555" />
                    </marker>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid-large)" />

                <g transform={`translate(${pan.x},${pan.y})`}>
                    {/* ─── Connections ─────────────────────────────────────── */}
                    {connections.map(conn => {
                        const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                        const toNode   = nodes.find(n => n.id === conn.toNodeId);
                        if (!fromNode || !toNode) return null;
                        const from = getPortPosition(fromNode, conn.fromPortId);
                        const to   = getPortPosition(toNode, conn.toPortId);
                        const dx = Math.abs(to.x - from.x) * 0.5;
                        const color = connColor(conn);
                        return (
                            <g key={conn.id}>
                                {/* Click-area (wider) */}
                                <path
                                    d={`M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`}
                                    fill="none" stroke="transparent" strokeWidth="12"
                                    className="cursor-pointer" onClick={() => onRemoveConnection(conn.id)}
                                />
                                {/* Visual wire */}
                                <path
                                    d={`M${from.x},${from.y} C${from.x + dx},${from.y} ${to.x - dx},${to.y} ${to.x},${to.y}`}
                                    fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.7"
                                    className="cursor-pointer hover:stroke-red-400 hover:stroke-[2.5] transition-all"
                                    onClick={() => onRemoveConnection(conn.id)}
                                />
                                {/* Dot at midpoint to indicate data flow direction */}
                                <circle
                                    cx={(from.x + to.x) / 2} cy={(from.y + to.y) / 2}
                                    r="2.5" fill={color} fillOpacity="0.7" pointerEvents="none"
                                />
                            </g>
                        );
                    })}

                    {/* ─── Active wire ─────────────────────────────────────── */}
                    {wire && (() => {
                        const fromNode = nodes.find(n => n.id === wire.fromNodeId);
                        if (!fromNode) return null;
                        const from = getPortPosition(fromNode, wire.fromPortId);
                        const dx = Math.abs(wire.mouseX - from.x) * 0.5;
                        return (
                            <path
                                d={`M${from.x},${from.y} C${from.x + dx},${from.y} ${wire.mouseX - dx},${wire.mouseY} ${wire.mouseX},${wire.mouseY}`}
                                fill="none" stroke="#aaa" strokeWidth="1.5" strokeDasharray="4 4" pointerEvents="none"
                            />
                        );
                    })()}

                    {/* ─── Nodes ───────────────────────────────────────────── */}
                    {nodes.map(node => {
                        const h = nodeHeight(node);
                        const colors = NODE_COLORS[node.kind] || NODE_COLORS['constant'];
                        const ports = node.ports.length > 0 ? node.ports : createNodePorts(node.kind);
                        const inputs  = ports.filter(p => p.direction === 'input');
                        const outputs = ports.filter(p => p.direction === 'output');

                        return (
                            <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                                {/* Body */}
                                <rect
                                    width={NODE_WIDTH} height={h} rx="7" ry="7"
                                    fill={colors.bg} stroke={colors.accent} strokeWidth="1" strokeOpacity="0.35"
                                    className="cursor-grab" onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                                />
                                {/* Header */}
                                <rect width={NODE_WIDTH} height={HEADER_HEIGHT} rx="7" ry="7" fill={colors.header} fillOpacity="0.18" className="cursor-grab" onMouseDown={(e) => handleNodeMouseDown(e, node.id)} />
                                <rect y={HEADER_HEIGHT - 1} width={NODE_WIDTH} height="2" fill={colors.header} fillOpacity="0.25" />
                                {/* Kind dot */}
                                <circle cx="10" cy="15" r="3.5" fill={colors.accent} fillOpacity="0.9" />
                                {/* Label */}
                                <text x="20" y="20" fill={colors.accent} fontSize="10.5" fontWeight="bold" fontFamily="monospace" pointerEvents="none">{node.label}</text>
                                {/* Delete */}
                                <text x={NODE_WIDTH - 16} y="19" fill="#444" fontSize="14" className="cursor-pointer hover:fill-red-400 transition-colors" onClick={() => onRemoveNode(node.id)}>×</text>

                                {/* Input ports */}
                                {inputs.map((port, i) => {
                                    const py = HEADER_HEIGHT + 14 + i * PORT_SPACING;
                                    const connected = connections.some(c => c.toNodeId === node.id && c.toPortId === port.id);
                                    return (
                                        <g key={port.id}>
                                            <circle cx={0} cy={py} r={PORT_RADIUS}
                                                fill={connected ? colors.accent : '#1a1a1a'} stroke={colors.accent} strokeWidth="1.5"
                                                className="cursor-crosshair"
                                                onMouseUp={(e) => {
                                                    if (wire && wire.fromNodeId !== node.id) {
                                                        e.stopPropagation();
                                                        onAddConnection(wire.fromNodeId, wire.fromPortId, node.id, port.id);
                                                        setWire(null);
                                                    }
                                                }}
                                            />
                                            <text x="14" y={py + 4} fill="#777" fontSize="9.5" fontFamily="monospace" pointerEvents="none">{port.label}</text>
                                        </g>
                                    );
                                })}

                                {/* Output ports */}
                                {outputs.map((port, i) => {
                                    const py = HEADER_HEIGHT + 14 + i * PORT_SPACING;
                                    const connected = connections.some(c => c.fromNodeId === node.id && c.fromPortId === port.id);
                                    return (
                                        <g key={port.id}>
                                            <circle cx={NODE_WIDTH} cy={py} r={PORT_RADIUS}
                                                fill={connected ? colors.accent : '#1a1a1a'} stroke={colors.accent} strokeWidth="1.5"
                                                className="cursor-crosshair"
                                                onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id, 'output')}
                                            />
                                            <text x={NODE_WIDTH - 14} y={py + 4} fill="#777" fontSize="9.5" fontFamily="monospace" textAnchor="end" pointerEvents="none">{port.label}</text>
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

            {/* ─── Mini-Map ────────────────────────────────────────────────── */}
            {nodes.length > 0 && (
                <div
                    className="absolute bottom-3 right-3 z-30 rounded-lg overflow-hidden border border-zinc-700/60 bg-black/80 shadow-xl"
                    style={{ width: MINI_W, height: MINI_H }}
                    title="Mini-map — click to focus"
                    onClick={(e) => {
                        // Click on minimap pans to that region
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        const mx = (e.clientX - rect.left) / MINI_W;
                        const my = (e.clientY - rect.top) / MINI_H;
                        const gx = miniViewport.minX + mx * (miniViewport.maxX - miniViewport.minX);
                        const gy = miniViewport.minY + my * (miniViewport.maxY - miniViewport.minY);
                        setPan({ x: -gx + 300, y: -gy + 100 });
                    }}
                >
                    <svg width={MINI_W} height={MINI_H}>
                        {/* Connections */}
                        {connections.map(conn => {
                            const fn = nodes.find(n => n.id === conn.fromNodeId);
                            const tn = nodes.find(n => n.id === conn.toNodeId);
                            if (!fn || !tn) return null;
                            const from = miniToCanvas(fn.x + NODE_WIDTH, fn.y + HEADER_HEIGHT / 2);
                            const to   = miniToCanvas(tn.x, tn.y + HEADER_HEIGHT / 2);
                            return <line key={conn.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={connColor(conn)} strokeWidth="0.8" strokeOpacity="0.6" />;
                        })}
                        {/* Nodes */}
                        {nodes.map(node => {
                            const pos = miniToCanvas(node.x, node.y);
                            const colors = NODE_COLORS[node.kind] || NODE_COLORS['constant'];
                            const nw = NODE_WIDTH / (miniViewport.maxX - miniViewport.minX) * MINI_W;
                            const nh = 8;
                            return (
                                <rect key={node.id} x={pos.x} y={pos.y} width={Math.max(4, nw)} height={nh}
                                    rx="1" fill={colors.header} fillOpacity="0.8"
                                />
                            );
                        })}
                        {/* Viewport indicator */}
                        {(() => {
                            const svgW = containerRef.current?.clientWidth || 600;
                            const svgH = containerRef.current?.clientHeight || 200;
                            const vTopLeft = miniToCanvas(-pan.x, -pan.y);
                            const vBottomRight = miniToCanvas(-pan.x + svgW, -pan.y + svgH);
                            return <rect
                                x={vTopLeft.x} y={vTopLeft.y}
                                width={vBottomRight.x - vTopLeft.x} height={vBottomRight.y - vTopLeft.y}
                                fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.4"
                            />;
                        })()}
                    </svg>
                    <div className="absolute top-0 left-0 px-1 text-[7px] text-zinc-600 font-mono pointer-events-none">map</div>
                </div>
            )}
        </div>
    );
}

// ─── Inline Config Editor ────────────────────────────────────────────────────
function NodeConfigEditor({ node, onUpdate }: { node: GraphNode; onUpdate: (cfg: Record<string, any>) => void }) {
    switch (node.kind) {
        case 'audio-band':
            return (
                <select value={node.config.band || 'bass'} onChange={(e) => onUpdate({ band: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white font-mono">
                    {['bass', 'mid', 'treble', 'volume'].map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                </select>
            );
        case 'math-op':
            return (
                <select value={node.config.op || 'add'} onChange={(e) => onUpdate({ op: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white font-mono">
                    {['add', 'sub', 'mul', 'div', 'mod', 'pow', 'min', 'max', 'abs', 'clamp'].map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                </select>
            );
        case 'constant':
            return (
                <input type="number" value={node.config.value ?? 0} step="0.1"
                    onChange={(e) => onUpdate({ value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white font-mono" />
            );
        case 'oscillator':
            return (
                <select value={node.config.waveform || 'sine'} onChange={(e) => onUpdate({ waveform: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-white font-mono">
                    {['sine', 'triangle', 'square', 'sawtooth'].map(w => <option key={w} value={w}>{w.charAt(0).toUpperCase() + w.slice(1)}</option>)}
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
                    <input type="range" min="0.5" max="0.99" step="0.01" value={node.config.factor ?? 0.9}
                        onChange={(e) => onUpdate({ factor: parseFloat(e.target.value) })} className="flex-1 h-1 accent-teal-400" />
                    <span className="text-white w-6 text-right">{(node.config.factor ?? 0.9).toFixed(2)}</span>
                </div>
            );
        case 'layer-property':
            return (
                <select value={node.config.property || 'transform.scale'} onChange={(e) => onUpdate({ property: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-amber-300 font-mono font-bold">
                    <optgroup label="Transform">
                        {['transform.scale', 'transform.rotation', 'transform.opacity', 'transform.x', 'transform.y'].map(p => (
                            <option key={p} value={p}>{p.split('.')[1].charAt(0).toUpperCase() + p.split('.')[1].slice(1)}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Options">
                        {['options.fontSize', 'options.color', 'options.blur', 'options.noise', 'options.posterize'].map(p => (
                            <option key={p} value={p}>{p.split('.')[1]}</option>
                        ))}
                    </optgroup>
                </select>
            );
        // ─── New Node Configs ─────────────────────────────────────────────────
        case 'noise':
            return (
                <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-mono">
                    <span>Seed</span>
                    <input type="number" value={node.config.seed ?? 42} step="1" onChange={(e) => onUpdate({ seed: parseInt(e.target.value) || 0 })}
                        className="w-12 bg-black/60 border border-white/10 rounded px-1 text-white font-mono text-[9px]" />
                </div>
            );
        case 'delay':
            return (
                <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-mono">
                    <span>Delay</span>
                    <input type="number" value={node.config.delaySeconds ?? 0.5} step="0.1" min="0" max="10"
                        onChange={(e) => onUpdate({ delaySeconds: parseFloat(e.target.value) || 0.1 })}
                        className="w-12 bg-black/60 border border-white/10 rounded px-1 text-white font-mono text-[9px]" />
                    <span>s</span>
                </div>
            );
        case 'compare':
            return (
                <select value={node.config.op || '>'} onChange={(e) => onUpdate({ op: e.target.value })}
                    className="w-full bg-black/60 border border-white/10 rounded px-1 py-0.5 text-[9px] text-orange-300 font-mono font-bold">
                    {['>', '<', '>=', '<=', '==='].map(op => <option key={op} value={op}>A {op} B</option>)}
                </select>
            );
        case 'select':
            return <div className="text-[8px] text-zinc-600 font-mono text-center">cond &gt; 0.5 → A</div>;
        case 'color-lerp':
            return (
                <div className="flex items-center gap-1">
                    <input type="color" value={node.config.colorA || '#00ff88'}
                        onChange={(e) => onUpdate({ colorA: e.target.value })}
                        className="w-6 h-5 rounded cursor-pointer border-0 bg-transparent" />
                    <span className="text-zinc-600 text-[8px] font-mono">→</span>
                    <input type="color" value={node.config.colorB || '#ff00cc'}
                        onChange={(e) => onUpdate({ colorB: e.target.value })}
                        className="w-6 h-5 rounded cursor-pointer border-0 bg-transparent" />
                </div>
            );
        default:
            return null;
    }
}
