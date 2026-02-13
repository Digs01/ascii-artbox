'use client';

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
    onAddLayer
}: LayerManagerProps) {

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
                            dragListener={!layer.locked}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => onSelectLayer(layer.id)}
                            className={clsx(
                                "flex items-center gap-2 p-2 rounded cursor-pointer border select-none group relative overflow-hidden",
                                activeLayerId === layer.id
                                    ? 'bg-surface-active border-border-hover shadow-sm'
                                    : 'bg-surface/50 border-transparent hover:bg-surface-hover/50 hover:border-border'
                            )}
                            whileDrag={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)", zIndex: 50 }}
                        >
                            <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary px-1 py-2 -ml-1">
                                <GripVertical size={12} />
                            </div>

                            <div className="w-8 h-8 bg-black rounded border border-border flex items-center justify-center overflow-hidden shrink-0">
                                {layer.previewUrl ? (
                                    layer.type === 'video' ? (
                                        <video src={layer.previewUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={layer.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                    )
                                ) : (
                                    <span className="text-[8px] text-text-muted">TXT</span>
                                )}
                            </div>

                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="text-[11px] font-medium truncate text-text-primary leading-tight">{layer.name}</div>
                                <div className="text-[9px] text-text-muted uppercase leading-tight mt-0.5">{layer.type}</div>
                            </div>

                            {/* Actions visible on hover or active */}
                            <div className={clsx(
                                "flex gap-1 transition-opacity bg-gradient-to-l from-surface-active pl-2",
                                activeLayerId === layer.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            )}>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                                    className="p-1 text-text-muted hover:text-text-primary"
                                >
                                    {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                                    className="p-1 text-text-muted hover:text-text-primary"
                                >
                                    {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}
                                    className="p-1 text-text-muted hover:text-text-primary"
                                >
                                    <Copy size={12} />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1, color: '#ef4444' }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }}
                                    className="p-1 text-text-muted hover:text-accent-danger"
                                >
                                    <Trash2 size={12} />
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
