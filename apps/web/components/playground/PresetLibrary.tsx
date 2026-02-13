import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { PRESETS, Preset } from '../../config/presets';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

interface PresetLibraryProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPreset: (preset: Preset) => void;
}

export function PresetLibrary({ isOpen, onClose, onSelectPreset }: PresetLibraryProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-surface border border-border rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between p-6 border-b border-border bg-surface-hover">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-text-primary">Style Library</h2>
                            <p className="text-sm text-text-muted mt-1">Apply instant styles to your active layer</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {PRESETS.map((preset) => (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        onSelectPreset(preset);
                                        onClose();
                                    }}
                                    className="group relative flex flex-col items-start text-left bg-black border border-border rounded-lg overflow-hidden hover:border-accent-primary transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                                >
                                    {/* Thumbnail Placeholder */}
                                    <div className={clsx(
                                        "w-full aspect-video flex items-center justify-center text-4xl font-black text-white/20 uppercase tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity",
                                        preset.thumbnail || 'bg-zinc-800'
                                    )}>
                                        {preset.name.substring(0, 2)}
                                    </div>

                                    <div className="p-4 w-full bg-surface group-hover:bg-surface-hover transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-sm text-text-primary group-hover:text-accent-primary transition-colors">{preset.name}</h3>
                                            <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-text-muted uppercase tracking-wider">{preset.category}</span>
                                        </div>
                                        <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">{preset.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
