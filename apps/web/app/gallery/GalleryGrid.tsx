
'use client';

import { useState, useMemo } from 'react';
import { GalleryCard } from './GalleryCard';
import { AnimationModal } from './AnimationModal';
import { useToast } from '@/components/ui/ToastContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface Animation {
    id: string;
    name: string;
    frames: string[];
    fps: number;
    tags?: string[];
}

interface GalleryGridProps {
    animations: Animation[];
}

export function GalleryGrid({ animations: initialAnimations }: GalleryGridProps) {
    const { toast } = useToast();
    const [animations, setAnimations] = useState<Animation[]>(initialAnimations);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedAnim, setSelectedAnim] = useState<Animation | null>(null);

    // Deletion State
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Handle Delete Request
    const requestDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDeleteId(id);
    };

    // Confirm Delete Action
    const confirmDelete = async () => {
        if (!deleteId) return;

        setIsDeleting(true);
        try {
            const res = await fetch('/api/gallery/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: deleteId })
            });

            if (res.ok) {
                setAnimations(prev => prev.filter(a => a.id !== deleteId));
                toast('Animation deleted permanently', 'success');
            } else {
                toast('Failed to delete animation', 'error');
            }
        } catch (err) {
            console.error(err);
            toast('Error deleting animation', 'error');
        } finally {
            setIsDeleting(false);
            setDeleteId(null);
        }
    };

    // Extract unique tags
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        animations.forEach(anim => {
            anim.tags?.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [animations]);

    // Unique categories (first tag of each)
    const categoryCount = useMemo(() => {
        const cats = new Set<string>();
        animations.forEach(anim => {
            if (anim.tags?.[0]) cats.add(anim.tags[0]);
        });
        return cats.size;
    }, [animations]);

    // Filter logic
    const filteredAnimations = useMemo(() => {
        return animations.filter(anim => {
            const matchesSearch = anim.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                anim.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesTag = selectedTag ? anim.tags?.includes(selectedTag) : true;
            return matchesSearch && matchesTag;
        });
    }, [animations, searchQuery, selectedTag]);

    // Featured items (first 3 with most frames)
    const featured = useMemo(() => {
        if (searchQuery || selectedTag) return [];
        return [...animations].sort((a, b) => b.frames.length - a.frames.length).slice(0, 3);
    }, [animations, searchQuery, selectedTag]);

    // Regular items are just the filtered list excluding featured if we were doing that split,
    // but we unified the grid, so this logic might be redundant if we just map filteredAnimations.
    // The previous code seemed to map filteredAnimations directly in the main grid, so I will stick to that.

    return (
        <div className="space-y-8">
            {/* Stats Bar */}
            <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-zinc-400">
                        <span className="text-white font-bold">{animations.length}</span> animations
                    </span>
                </div>
                <span className="text-zinc-800">·</span>
                <span className="text-zinc-400">
                    <span className="text-white font-bold">{categoryCount}</span> categories
                </span>
                <span className="text-zinc-800">·</span>
                <span className="text-zinc-400">
                    <span className="text-white font-bold">{allTags.length}</span> tags
                </span>
            </div>

            {/* Filters Toolbar */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search animations by name or tag..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all font-mono text-sm"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                    </div>
                </div>

                {/* Tag Cloud */}
                {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                        <button
                            onClick={() => setSelectedTag(null)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${selectedTag === null
                                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300'
                                }`}
                        >
                            All
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                                className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 uppercase tracking-wider ${selectedTag === tag
                                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                                    : 'bg-transparent text-zinc-600 border-zinc-800/50 hover:border-zinc-600 hover:text-zinc-300'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Results count when filtered */}
            {(searchQuery || selectedTag) && (
                <p className="text-sm text-zinc-500">
                    Showing <span className="text-white">{filteredAnimations.length}</span> result{filteredAnimations.length !== 1 ? 's' : ''}
                    {selectedTag && <> tagged <span className="text-green-500">#{selectedTag}</span></>}
                    {searchQuery && <> matching "<span className="text-white">{searchQuery}</span>"</>}
                </p>
            )}

            {/* Main Grid */}
            {filteredAnimations.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-zinc-800 rounded-xl">
                    <div className="text-4xl mb-4 opacity-20">∅</div>
                    <p className="text-zinc-500 mb-4">No animations match your filter.</p>
                    <button
                        onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
                        className="text-sm text-green-500 hover:text-green-400 transition-colors"
                    >
                        Clear filters →
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredAnimations.map((anim) => (
                        <GalleryCard
                            key={anim.id}
                            anim={anim}
                            onClick={() => setSelectedAnim(anim)}
                            onDelete={(e) => requestDelete(e, anim.id)}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimationModal
                anim={selectedAnim}
                onClose={() => setSelectedAnim(null)}
            />

            <ConfirmDialog
                isOpen={!!deleteId}
                title="Delete Animation?"
                description="This action cannot be undone. The animation will be permanently removed from your library."
                confirmText="Delete"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
