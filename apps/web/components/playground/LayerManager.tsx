'use client';

import { useState } from 'react';

import { Layer } from '../../types/layer';
import { Button } from '../../components/ui/Button';
import { GripVertical, Eye, EyeOff, Trash2, Copy, Lock, Unlock } from 'lucide-react';
import { clsx } from 'clsx';
import { Reorder, AnimatePresence, motion } from 'framer-motion';

interface LayerManagerProps {
    layers: Layer[];
    activeLayerId: string | null;
    onSelectLayer: (id: string) => void;
    onToggleVisibility: (id: string) => void;
    onToggleLock: (id: string) => void;
    onRemoveLayer: (id: string) => void;
    onDuplicateLayer: (id: string) => void;
    onReorderLayers: (layers: Layer[]) => void;
    onAddLayer: () => void;
    onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
}

export function LayerManager({
    layers,
    activeLayerId,
    onSelectLayer,
    onToggleVisibility,
    onToggleLock,
    onRemoveLayer,
    onDuplicateLayer,
    onReorderLayers,
    onAddLayer,
    onUpdateLayer
}: LayerManagerProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [tempName, setTempName] = useState("");

    const handleStartRename = (e: React.MouseEvent, layer: Layer) => {
        e.stopPropagation();
        setEditingId(layer.id);
        setTempName(layer.name);
    };

    const handleCommitRename = () => {
        if (editingId && tempName.trim()) {
            onUpdateLayer(editingId, { name: tempName.trim() });
        }
        setEditingId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleCommitRename();
        if (e.key === 'Escape') setEditingId(null);
    };

    return (
        <div className="flex flex-col gap-2 bg-surface/40 rounded-lg p-2 border border-border">
            <div className="flex justify-between items-center mb-1 px-1">
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Layers</h3>
                <Button size="xs" onClick={onAddLayer} variant="secondary" className="h-6 text-[10px]">
                    + New Layer
                </Button>
            </div>

            <Reorder.Group
                axis="y"
                values={layers}
                onReorder={onReorderLayers}
                className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar"
            >
                <AnimatePresence initial={false}>
                    {layers.map((layer) => (
                        <Reorder.Item
                            key={layer.id}
                            value={layer}
                            dragListener={!layer.locked && editingId !== layer.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => !editingId && onSelectLayer(layer.id)}
                            className={clsx(
                                "flex items-center gap-3 p-3 rounded cursor-pointer border select-none group relative overflow-hidden transition-all",
                                activeLayerId === layer.id
                                    ? 'bg-surface-active border-border shadow-md'
                                    : 'bg-surface/50 border-transparent hover:bg-surface-hover/80 hover:border-border'
                            )}
                            whileDrag={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.15)", zIndex: 50 }}
                        >
                            {activeLayerId === layer.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent-primary" />
                            )}
                            <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary py-2 -ml-2">
                                <GripVertical size={14} />
                            </div>

                            <div className="w-10 h-10 bg-black rounded border border-border flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                {layer.previewUrl ? (
                                    layer.type === 'video' ? (
                                        <video src={layer.previewUrl} className="w-full h-full object-cover" />
                                    ) : layer.type === 'model' ? (
                                        <div className="w-full h-full flex items-center justify-center bg-surface text-text-muted">
                                            <span className="text-[10px] font-bold">3D</span>
                                        </div>
                                    ) : (
                                        <img src={layer.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                    )
                                ) : (
                                    <span className="text-[9px] font-bold text-text-muted">TXT</span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                {editingId === layer.id ? (
                                    <input
                                        autoFocus
                                        value={tempName}
                                        onChange={(e) => setTempName(e.target.value)}
                                        onBlur={handleCommitRename}
                                        onKeyDown={handleKeyDown}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs font-bold bg-black/50 border border-accent-primary rounded px-1 py-0.5 text-text-primary focus:outline-none w-full"
                                    />
                                ) : (
                                    <div
                                        className="text-xs font-bold truncate text-text-primary leading-tight hover:text-accent-primary transition-colors"
                                        onDoubleClick={(e) => handleStartRename(e, layer)}
                                        title="Double click to rename"
                                    >
                                        {layer.name}
                                    </div>
                                )}
                                <div className="text-[10px] text-text-muted uppercase font-bold tracking-wider leading-tight mt-1">{layer.type}</div>
                            </div>

                            {/* Actions visible on hover or active */}
                            <div className={clsx(
                                "flex gap-1 transition-opacity",
                                activeLayerId === layer.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            )}>
                                <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                                    className="p-1.5 rounded-md bg-surface border border-transparent hover:border-border text-text-muted hover:text-text-primary transition-colors"
                                    title={layer.locked ? "Unlock Layer" : "Lock Layer"}
                                >
                                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                                    className="p-1.5 rounded-md bg-surface border border-transparent hover:border-border text-text-muted hover:text-text-primary transition-colors"
                                    title={layer.visible ? "Hide Layer" : "Show Layer"}
                                >
                                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}
                                    className="p-1.5 rounded-md bg-surface border border-transparent hover:border-border text-text-muted hover:text-text-primary transition-colors"
                                    title="Duplicate Layer"
                                >
                                    <Copy size={14} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.15, color: '#ef4444' }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                                    className="p-1.5 rounded-md bg-surface border border-transparent hover:border-accent-danger/50 text-text-muted hover:text-accent-danger transition-colors"
                                    title="Delete Layer"
                                >
                                    <Trash2 size={14} />
                                </motion.button>
                            </div>
                        </Reorder.Item>
                    ))}
                </AnimatePresence>

                {layers.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 text-xs text-text-muted border border-dashed border-border rounded flex flex-col items-center gap-2"
                    >
                        <span>No layers yet</span>
                        <Button size="xs" onClick={onAddLayer} variant="secondary">Create One</Button>
                    </motion.div>
                )}
            </Reorder.Group>
        </div>
    );
}
