import { Layer } from '../../types/layer';
import { Button } from '../../components/ui/Button';
import { GripVertical, Eye, EyeOff, Trash2, Copy, Lock, Unlock } from 'lucide-react';

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

    // Simple drag and drop implementation could be added here, 
    // but for now we'll just list them.
    // Ideally use dnd-kit or similar if available, but let's stick to simple reordering 
    // or just a list for the MVP of this task.
    // Actually, let's add Move Up / Move Down buttons if DND is too complex without deps.
    // Or just rely on the user adding them in order for now, 
    // but let's at least allow selecting.

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (sourceIndex === targetIndex) return;

        const newLayers = [...layers];
        const [movedLayer] = newLayers.splice(sourceIndex, 1);
        newLayers.splice(targetIndex, 0, movedLayer);
        onReorderLayers(newLayers);
    };

    return (
        <div className="flex flex-col gap-2 bg-zinc-900/40 rounded-lg p-2 border border-zinc-800">
            <div className="flex justify-between items-center mb-1 px-1">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Layers</h3>
                <Button size="xs" onClick={onAddLayer} variant="secondary" className="h-6 text-[10px]">
                    + New Layer
                </Button>
            </div>

            <div className="space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                {layers.map((layer, index) => (
                    <div
                        key={layer.id}
                        draggable={!layer.locked}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        onClick={() => onSelectLayer(layer.id)}
                        className={`
              flex items-center gap-2 p-2 rounded cursor-pointer border select-none group
              ${activeLayerId === layer.id
                                ? 'bg-zinc-800 border-zinc-600'
                                : 'bg-zinc-900/50 border-transparent hover:bg-zinc-800/50 hover:border-zinc-800'}
            `}
                    >
                        <div className="cursor-grab text-zinc-600 hover:text-zinc-400">
                            <GripVertical size={12} />
                        </div>

                        <div className="w-8 h-8 bg-black rounded border border-zinc-800 flex items-center justify-center overflow-hidden">
                            {layer.previewUrl ? (
                                layer.type === 'video' ? (
                                    <video src={layer.previewUrl} className="w-full h-full object-cover" />
                                ) : (
                                    <img src={layer.previewUrl} alt="preview" className="w-full h-full object-cover" />
                                )
                            ) : (
                                <span className="text-[8px] text-zinc-700">TXT</span>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="text-[11px] font-medium truncate text-zinc-300">{layer.name}</div>
                            <div className="text-[9px] text-zinc-600 uppercase">{layer.type}</div>
                        </div>

                        {/* Actions visible on hover or active */}
                        <div className={`flex gap-1 ${activeLayerId === layer.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <button onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }} className="text-zinc-500 hover:text-zinc-300">
                                {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }} className="text-zinc-500 hover:text-zinc-300">
                                {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }} className="text-zinc-500 hover:text-zinc-300">
                                <Copy size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onRemoveLayer(layer.id); }} className="text-zinc-500 hover:text-red-400">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}

                {layers.length === 0 && (
                    <div className="text-center py-4 text-xs text-zinc-600 border border-dashed border-zinc-800 rounded">
                        No layers
                    </div>
                )}
            </div>
        </div>
    );
}
