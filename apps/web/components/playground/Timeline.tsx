import React, { useRef, useState, useEffect, useCallback, MouseEvent } from 'react';
import { Layer, Keyframe } from '../../types/layer';
import { motion, AnimatePresence } from 'framer-motion';

interface TimelineProps {
    layers: Layer[];
    activeLayerId: string | null;
    currentTime: number;
    maxDuration: number;
    isPlaying: boolean;
    autoKeyframe?: boolean;
    onToggleAutoKeyframe?: () => void;
    onSeek: (time: number) => void;
    onAddKeyframe: (layerId: string, property: string, time: number, value: any) => void;
    onRemoveKeyframe: (layerId: string, property: string, keyframeId: string) => void;
    onUpdateKeyframe?: (layerId: string, property: string, keyframeId: string, updates: Partial<Keyframe>) => void;
}

const TRACK_GROUPS = [
    {
        label: 'Position',
        icon: '⊹',
        color: '#3b82f6',
        tracks: [
            { id: 'transform.x', label: 'X', unit: 'px' },
            { id: 'transform.y', label: 'Y', unit: 'px' },
        ]
    },
    {
        label: 'Transform',
        icon: '◇',
        color: '#a855f7',
        tracks: [
            { id: 'transform.scale', label: 'Scale', unit: 'x' },
            { id: 'transform.rotation', label: 'Rotation', unit: '°' },
        ]
    },
    {
        label: 'Appearance',
        icon: '◉',
        color: '#f59e0b',
        tracks: [
            { id: 'transform.opacity', label: 'Opacity', unit: '%' },
            { id: 'options.fontSize', label: 'Font Size', unit: 'px' },
            { id: 'options.color', label: 'Color', unit: '' },
        ]
    }
];

const ALL_TRACKS = TRACK_GROUPS.flatMap(g => g.tracks.map(t => ({ ...t, groupColor: g.color })));

const EASING_OPTIONS: { value: Keyframe['easing']; label: string }[] = [
    { value: 'linear', label: 'Linear' },
    { value: 'ease-in', label: 'Ease In' },
    { value: 'ease-out', label: 'Ease Out' },
    { value: 'ease-in-out', label: 'Ease In-Out' },
    { value: 'step', label: 'Step' },
];

interface EditingKeyframe {
    layerId: string;
    property: string;
    keyframe: Keyframe;
    trackColor: string;
    rect: { x: number; y: number };
}

export const Timeline: React.FC<TimelineProps> = ({
    layers,
    activeLayerId,
    currentTime,
    maxDuration,
    isPlaying,
    autoKeyframe = false,
    onToggleAutoKeyframe,
    onSeek,
    onAddKeyframe,
    onRemoveKeyframe,
    onUpdateKeyframe
}) => {
    const trackAreaRef = useRef<HTMLDivElement>(null);
    const headerRulerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [hoveredTime, setHoveredTime] = useState<number | null>(null);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        'Position': false,
        'Transform': false,
        'Appearance': false,
    });
    const [editingKf, setEditingKf] = useState<EditingKeyframe | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editEasing, setEditEasing] = useState<Keyframe['easing']>('linear');

    // Dragging keyframes
    const [draggingKf, setDraggingKf] = useState<{ layerId: string; property: string; kfId: string } | null>(null);

    const LABEL_WIDTH = 180;
    const PX_PER_SEC = 80;
    const TRACK_HEIGHT = 28;
    const GROUP_HEADER_HEIGHT = 30;
    const RULER_HEIGHT = 32;
    const totalTimelineWidth = maxDuration * PX_PER_SEC;

    const activeLayer = layers.find(l => l.id === activeLayerId);

    // --- Scrub Logic ---
    const getTimeFromEvent = useCallback((e: { clientX: number }) => {
        const ref = headerRulerRef.current || trackAreaRef.current;
        if (!ref) return 0;
        const rect = ref.getBoundingClientRect();
        const x = e.clientX - rect.left;
        return Math.max(0, Math.min(x / PX_PER_SEC, maxDuration));
    }, [maxDuration]);

    const handleScrubStart = (e: MouseEvent<HTMLDivElement>) => {
        if (draggingKf) return; // Don't scrub while dragging a keyframe
        setIsScrubbing(true);
        onSeek(getTimeFromEvent(e));
    };

    const handleGlobalMouseMove = useCallback((e: globalThis.MouseEvent) => {
        if (draggingKf && onUpdateKeyframe) {
            const newTime = getTimeFromEvent(e);
            onUpdateKeyframe(draggingKf.layerId, draggingKf.property, draggingKf.kfId, { time: newTime });
        } else if (isScrubbing) {
            onSeek(getTimeFromEvent(e));
        }
    }, [isScrubbing, draggingKf, getTimeFromEvent, onSeek, onUpdateKeyframe]);

    const handleGlobalMouseUp = useCallback(() => {
        setIsScrubbing(false);
        setDraggingKf(null);
    }, []);

    useEffect(() => {
        if (isScrubbing || draggingKf) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleGlobalMouseMove);
                window.removeEventListener('mouseup', handleGlobalMouseUp);
            };
        }
    }, [isScrubbing, draggingKf, handleGlobalMouseMove, handleGlobalMouseUp]);

    // Hover time for ghost playhead
    const handleTrackMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!isScrubbing && !draggingKf) {
            setHoveredTime(getTimeFromEvent(e));
        }
    };
    const handleTrackMouseLeave = () => setHoveredTime(null);

    const toggleGroup = (label: string) => {
        setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
    };

    const getLiveValue = (propId: string): any => {
        if (!activeLayer) return null;
        const path = propId.split('.');
        if (path[0] === 'transform') return (activeLayer.transform as any)[path[1]];
        if (path[0] === 'options') return (activeLayer.options as any)[path[1]];
        return null;
    };

    const formatTime = (t: number) => {
        const mins = Math.floor(t / 60);
        const secs = Math.floor(t % 60);
        const frames = Math.floor((t % 1) * 24);
        return `${mins}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
    };

    // --- Edit Popover ---
    const openEditPopover = (layerId: string, property: string, kf: Keyframe, trackColor: string, buttonEl: HTMLElement) => {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const btnRect = buttonEl.getBoundingClientRect();
        if (!containerRect) return;

        setEditingKf({
            layerId,
            property,
            keyframe: kf,
            trackColor,
            rect: {
                x: btnRect.left - containerRect.left + btnRect.width / 2,
                y: btnRect.top - containerRect.top,
            }
        });
        setEditValue(typeof kf.value === 'number' ? kf.value.toFixed(2) : String(kf.value));
        setEditTime(kf.time.toFixed(3));
        setEditEasing(kf.easing || 'linear');
    };

    const applyEdit = () => {
        if (!editingKf || !onUpdateKeyframe) return;
        const parsedValue = isNaN(Number(editValue)) ? editValue : Number(editValue);
        onUpdateKeyframe(editingKf.layerId, editingKf.property, editingKf.keyframe.id, {
            value: parsedValue,
            time: Math.max(0, Math.min(parseFloat(editTime) || 0, maxDuration)),
            easing: editEasing,
        });
        setEditingKf(null);
    };

    const deleteFromPopover = () => {
        if (!editingKf) return;
        onRemoveKeyframe(editingKf.layerId, editingKf.property, editingKf.keyframe.id);
        setEditingKf(null);
    };

    const playheadLeft = currentTime * PX_PER_SEC;
    const totalKeyframes = activeLayer?.animationTracks?.reduce((sum, t) => sum + t.keyframes.length, 0) || 0;

    return (
        <div ref={containerRef} className="relative flex flex-col bg-[#060608] text-[10px] font-mono select-none overflow-hidden timeline-container" style={{ height: '220px' }}>
            {/* ─── Top Status Bar ─── */}
            <div className="flex items-center h-7 bg-[#0c0c10] border-b border-white/[0.04] px-3 gap-3 shrink-0">
                <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-emerald-400 timeline-pulse-dot' : 'bg-zinc-600'}`} />
                    <span className="text-[11px] font-bold tracking-wider text-white/90 tabular-nums">
                        {formatTime(currentTime)}
                    </span>
                </div>
                <div className="w-px h-3 bg-white/[0.06]" />
                <span className="text-zinc-500 text-[9px] uppercase tracking-widest">/ {formatTime(maxDuration)}</span>
                <div className="flex-1" />
                {activeLayer && (
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-blue-400 transform rotate-45" />
                        <span className="text-zinc-500 text-[9px]">{totalKeyframes} keys</span>
                    </div>
                )}
                {/* Auto-Keyframe REC Toggle */}
                {onToggleAutoKeyframe && (
                    <button
                        onClick={onToggleAutoKeyframe}
                        title={autoKeyframe ? 'Auto-Keyframe ON: slider changes are recorded as keyframes' : 'Auto-Keyframe OFF: click to enable'}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border transition-all duration-200 ${autoKeyframe
                                ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
                                : 'bg-white/[0.03] border-white/[0.06] text-zinc-600 hover:text-zinc-400'
                            }`}
                    >
                        <div className={`w-1.5 h-1.5 rounded-full ${autoKeyframe ? 'bg-red-400 timeline-pulse-dot' : 'bg-zinc-700'
                            }`} />
                        REC
                    </button>
                )}
                {activeLayer && (
                    <div className="flex items-center gap-1.5 bg-white/[0.04] rounded px-2 py-0.5 border border-white/[0.06]">
                        <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
                        <span className="text-zinc-400 text-[9px] truncate max-w-[100px]">{activeLayer.name}</span>
                    </div>
                )}
            </div>

            {/* ─── Ruler + Tracks ─── */}
            <div className="flex flex-1 overflow-hidden">
                {/* ─── LEFT LABELS ─── */}
                <div className="flex flex-col shrink-0" style={{ width: `${LABEL_WIDTH}px` }}>
                    <div className="flex items-end px-3 border-b border-white/[0.04] bg-[#0a0a0e]" style={{ height: `${RULER_HEIGHT}px` }}>
                        <span className="text-[8px] text-zinc-600 uppercase tracking-[0.2em] pb-1.5">Tracks</span>
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#08080c]">
                        {!activeLayer ? (
                            <div className="flex items-center justify-center h-full text-zinc-700 text-[9px] italic px-4 text-center">
                                No layer selected
                            </div>
                        ) : (
                            TRACK_GROUPS.map(group => (
                                <div key={group.label}>
                                    <button
                                        onClick={() => toggleGroup(group.label)}
                                        className="flex items-center w-full px-3 gap-2 border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                                        style={{ height: `${GROUP_HEADER_HEIGHT}px` }}
                                    >
                                        <span className="text-[9px] transition-transform" style={{
                                            transform: expandedGroups[group.label] ? 'rotate(90deg)' : 'rotate(0deg)',
                                            color: group.color
                                        }}>▸</span>
                                        <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: group.color }}>
                                            {group.icon} {group.label}
                                        </span>
                                    </button>
                                    <AnimatePresence>
                                        {expandedGroups[group.label] && group.tracks.map(track => {
                                            const kfTrack = activeLayer.animationTracks?.find(t => t.property === track.id);
                                            const kfCount = kfTrack?.keyframes.length || 0;
                                            return (
                                                <motion.div
                                                    key={track.id}
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: TRACK_HEIGHT, opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="flex items-center px-3 border-b border-white/[0.02] overflow-hidden"
                                                >
                                                    <div className="flex items-center justify-between w-full gap-1">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <div className="w-0.5 h-3 rounded-full opacity-30" style={{ backgroundColor: group.color }} />
                                                            <span className="text-zinc-500 truncate text-[9px]">{track.label}</span>
                                                            {kfCount > 0 && (
                                                                <span className="text-[7px] px-1 py-px rounded bg-white/[0.04] text-zinc-600 tabular-nums">{kfCount}</span>
                                                            )}
                                                        </div>
                                                        <button
                                                            className="timeline-add-key-btn flex items-center justify-center w-4 h-4 rounded hover:bg-white/[0.08] transition-all"
                                                            style={{ color: group.color }}
                                                            title={`Add keyframe at ${formatTime(currentTime)}`}
                                                            onClick={() => onAddKeyframe(activeLayer.id, track.id, currentTime, getLiveValue(track.id))}
                                                        >
                                                            <svg width="7" height="7" viewBox="0 0 7 7" fill="currentColor">
                                                                <rect x="2.5" y="0" width="2" height="7" rx="0.5" />
                                                                <rect x="0" y="2.5" width="7" height="2" rx="0.5" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ─── RIGHT: RULER + TRACK AREA ─── */}
                <div className="flex flex-col flex-1 overflow-hidden border-l border-white/[0.04]">
                    {/* Ruler */}
                    <div
                        ref={headerRulerRef}
                        className="relative shrink-0 border-b border-white/[0.04] bg-[#0a0a0e] cursor-col-resize overflow-hidden"
                        style={{ height: `${RULER_HEIGHT}px` }}
                        onMouseDown={handleScrubStart}
                    >
                        <div className="relative h-full" style={{ width: `${totalTimelineWidth}px` }}>
                            {Array.from({ length: Math.ceil(maxDuration) + 1 }).map((_, i) => (
                                <React.Fragment key={i}>
                                    <div className="absolute bottom-0" style={{ left: `${i * PX_PER_SEC}px` }}>
                                        <div className="w-px h-3 bg-white/10" />
                                        <span className="absolute bottom-3 left-1 text-[8px] text-zinc-600 tabular-nums whitespace-nowrap">{i}s</span>
                                    </div>
                                    {i < Math.ceil(maxDuration) && (
                                        <div className="absolute bottom-0 w-px h-1.5 bg-white/[0.05]" style={{ left: `${i * PX_PER_SEC + PX_PER_SEC / 2}px` }} />
                                    )}
                                    {i < Math.ceil(maxDuration) && [0.25, 0.75].map(frac => (
                                        <div key={frac} className="absolute bottom-0 w-px h-1 bg-white/[0.03]" style={{ left: `${(i + frac) * PX_PER_SEC}px` }} />
                                    ))}
                                </React.Fragment>
                            ))}
                            {/* Playhead on Ruler */}
                            <div className="absolute top-0 bottom-0 z-30 pointer-events-none" style={{ left: `${playheadLeft}px` }}>
                                <div className="absolute top-0 bottom-0 w-px bg-blue-500 opacity-80" />
                                <div className="absolute -top-px -translate-x-1/2 left-px">
                                    <svg width="11" height="14" viewBox="0 0 11 14" fill="none">
                                        <path d="M0.5 0H10.5V8L5.5 13L0.5 8V0Z" fill="#3b82f6" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Track Area */}
                    <div
                        ref={trackAreaRef}
                        className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative bg-[#08080c]"
                        onMouseDown={handleScrubStart}
                        onMouseMove={handleTrackMouseMove}
                        onMouseLeave={handleTrackMouseLeave}
                        style={{ cursor: draggingKf ? 'grabbing' : isScrubbing ? 'col-resize' : 'crosshair' }}
                    >
                        <div className="relative" style={{ width: `${totalTimelineWidth}px`, minHeight: '100%' }}>
                            {/* Grid Lines */}
                            {Array.from({ length: Math.ceil(maxDuration) + 1 }).map((_, i) => (
                                <div key={i} className="absolute top-0 bottom-0 w-px bg-white/[0.03]" style={{ left: `${i * PX_PER_SEC}px` }} />
                            ))}

                            {/* Hover Ghost Line */}
                            {hoveredTime !== null && !isScrubbing && (
                                <div className="absolute top-0 bottom-0 w-px bg-white/[0.08] pointer-events-none z-10" style={{ left: `${hoveredTime * PX_PER_SEC}px` }} />
                            )}

                            {/* Playhead through tracks */}
                            <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${playheadLeft}px` }}>
                                <div className="w-px h-full bg-blue-500/40" />
                            </div>

                            {/* Track Rows */}
                            {activeLayer && TRACK_GROUPS.map(group => (
                                <React.Fragment key={group.label}>
                                    <div style={{ height: `${GROUP_HEADER_HEIGHT}px` }} className="border-b border-white/[0.03]" />
                                    <AnimatePresence>
                                        {expandedGroups[group.label] && group.tracks.map(track => {
                                            const kfTrack = activeLayer.animationTracks?.find(t => t.property === track.id);
                                            const keyframes = kfTrack?.keyframes || [];
                                            return (
                                                <motion.div
                                                    key={track.id}
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: TRACK_HEIGHT, opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="relative border-b border-white/[0.02] overflow-visible"
                                                >
                                                    {/* Interpolation Lines */}
                                                    {keyframes.length >= 2 && (() => {
                                                        const sorted = [...keyframes].sort((a, b) => a.time - b.time);
                                                        return sorted.slice(0, -1).map((kf, idx) => {
                                                            const next = sorted[idx + 1];
                                                            return (
                                                                <div
                                                                    key={`interp-${kf.id}`}
                                                                    className="absolute top-1/2 h-px opacity-30"
                                                                    style={{
                                                                        left: `${kf.time * PX_PER_SEC}px`,
                                                                        width: `${(next.time - kf.time) * PX_PER_SEC}px`,
                                                                        backgroundColor: group.color,
                                                                    }}
                                                                />
                                                            );
                                                        });
                                                    })()}

                                                    {/* Active Range */}
                                                    {keyframes.length >= 2 && (() => {
                                                        const sorted = [...keyframes].sort((a, b) => a.time - b.time);
                                                        return (
                                                            <div
                                                                className="absolute top-0 bottom-0 opacity-[0.03]"
                                                                style={{
                                                                    left: `${sorted[0].time * PX_PER_SEC}px`,
                                                                    width: `${(sorted[sorted.length - 1].time - sorted[0].time) * PX_PER_SEC}px`,
                                                                    backgroundColor: group.color,
                                                                }}
                                                            />
                                                        );
                                                    })()}

                                                    {/* Keyframe Diamonds */}
                                                    {keyframes.map(kf => {
                                                        const isEditing = editingKf?.keyframe.id === kf.id;
                                                        const isDragging = draggingKf?.kfId === kf.id;
                                                        return (
                                                            <button
                                                                key={kf.id}
                                                                className={`absolute top-1/2 z-10 group/kf timeline-keyframe ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                                                style={{ left: `${kf.time * PX_PER_SEC}px`, transform: 'translateX(-50%) translateY(-50%)' }}
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                    setDraggingKf({ layerId: activeLayer.id, property: track.id, kfId: kf.id });
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (isDragging) return;
                                                                    openEditPopover(activeLayer.id, track.id, kf, group.color, e.currentTarget);
                                                                }}
                                                                title={`${track.label}: ${typeof kf.value === 'number' ? kf.value.toFixed(2) : kf.value}${track.unit}\nDrag to move · Click to edit`}
                                                            >
                                                                <div
                                                                    className="absolute inset-0 rounded-sm blur-[6px] opacity-0 group-hover/kf:opacity-40 transition-opacity"
                                                                    style={{ backgroundColor: group.color }}
                                                                />
                                                                <div
                                                                    className={`w-2.5 h-2.5 transform rotate-45 rounded-[1px] transition-all duration-150 ${isEditing ? 'scale-150 ring-1 ring-white/60' : isDragging ? 'scale-125' : 'group-hover/kf:scale-110'}`}
                                                                    style={{
                                                                        backgroundColor: isEditing ? '#fff' : group.color,
                                                                        boxShadow: `0 0 8px ${group.color}50`
                                                                    }}
                                                                />
                                                            </button>
                                                        );
                                                    })}
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </React.Fragment>
                            ))}

                            {/* Empty State */}
                            {!activeLayer && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center space-y-2">
                                        <div className="text-zinc-700 text-[10px]">Select a layer to animate</div>
                                        <div className="text-zinc-800 text-[8px] uppercase tracking-widest">No properties to display</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Keyframe Edit Popover ─── */}
            <AnimatePresence>
                {editingKf && (
                    <>
                        {/* Backdrop */}
                        <div className="absolute inset-0 z-40" onClick={() => setEditingKf(null)} />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 4 }}
                            transition={{ duration: 0.12 }}
                            className="absolute z-50 bg-[#111116] border border-white/[0.08] rounded-lg shadow-2xl overflow-hidden"
                            style={{
                                left: `${Math.min(editingKf.rect.x, (containerRef.current?.offsetWidth || 400) - 220)}px`,
                                bottom: '6px',
                                width: '200px',
                            }}
                        >
                            {/* Popover Header */}
                            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]" style={{ backgroundColor: `${editingKf.trackColor}10` }}>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 transform rotate-45 rounded-[1px]" style={{ backgroundColor: editingKf.trackColor }} />
                                    <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Edit Keyframe</span>
                                </div>
                                <button
                                    onClick={() => setEditingKf(null)}
                                    className="text-zinc-600 hover:text-white transition-colors text-[10px]"
                                >✕</button>
                            </div>

                            <div className="p-3 space-y-2.5">
                                {/* Value */}
                                <div>
                                    <label className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1 block">Value</label>
                                    <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-full bg-black/50 border border-white/[0.06] rounded px-2 py-1 text-[10px] text-white focus:border-white/20 focus:outline-none transition-colors"
                                        onKeyDown={(e) => e.key === 'Enter' && applyEdit()}
                                    />
                                </div>

                                {/* Time */}
                                <div>
                                    <label className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1 block">Time (s)</label>
                                    <input
                                        type="number"
                                        value={editTime}
                                        onChange={(e) => setEditTime(e.target.value)}
                                        min={0}
                                        max={maxDuration}
                                        step={0.01}
                                        className="w-full bg-black/50 border border-white/[0.06] rounded px-2 py-1 text-[10px] text-white focus:border-white/20 focus:outline-none transition-colors tabular-nums"
                                        onKeyDown={(e) => e.key === 'Enter' && applyEdit()}
                                    />
                                </div>

                                {/* Easing */}
                                <div>
                                    <label className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1 block">Easing</label>
                                    <select
                                        value={editEasing}
                                        onChange={(e) => setEditEasing(e.target.value as Keyframe['easing'])}
                                        className="w-full bg-black/50 border border-white/[0.06] rounded px-2 py-1 text-[10px] text-white focus:border-white/20 focus:outline-none transition-colors"
                                    >
                                        {EASING_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1.5 pt-1">
                                    <button
                                        onClick={applyEdit}
                                        className="flex-1 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors"
                                        style={{
                                            backgroundColor: `${editingKf.trackColor}20`,
                                            color: editingKf.trackColor,
                                            border: `1px solid ${editingKf.trackColor}30`
                                        }}
                                    >
                                        Apply
                                    </button>
                                    <button
                                        onClick={deleteFromPopover}
                                        className="px-3 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
