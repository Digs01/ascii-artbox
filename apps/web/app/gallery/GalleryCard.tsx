
'use client';

import { AsciiAnimation } from '@asciiweb/react';

interface GalleryCardProps {
    anim: {
        id: string;
        name: string;
        frames: string[];
        fps: number;
        tags?: string[];
    };
    featured?: boolean;
    onClick: () => void;
    onDelete?: (e: React.MouseEvent) => void;
}

export function GalleryCard({ anim, featured = false, onClick, onDelete }: GalleryCardProps) {
    return (
        <button
            onClick={onClick}
            className={`group text-left w-full overflow-hidden flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-950 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-700 ${featured ? 'md:col-span-2 md:row-span-2' : ''}`}
        >
            {/* Preview */}
            <div className={`relative bg-black flex items-center justify-center border-b border-zinc-800/60 overflow-hidden ${featured ? 'aspect-[2/1]' : 'aspect-square'}`}>

                <div className={`transition-all duration-300 group-hover:scale-105 opacity-80 group-hover:opacity-100`}>
                    <AsciiAnimation
                        frames={anim.frames}
                        fps={anim.fps}
                        color="white"
                        style={{
                            fontSize: featured ? '10px' : '6px', // Smaller font for square generic cards to fit more
                            lineHeight: featured ? '12px' : '6px',
                        }}
                    />
                </div>

                {/* Expand icon on hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-y-0 translate-y-1">
                    <div className="bg-black/70 backdrop-blur-sm border border-zinc-700 rounded-lg p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                    </div>
                </div>

                {/* Delete Button */}
                {onDelete && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(e);
                        }}
                        className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-y-0 translate-y-1 z-10"
                    >
                        <div className="bg-black/70 backdrop-blur-sm border border-zinc-700 hover:border-red-500/50 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg p-2 transition-colors cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-4 flex items-center justify-between w-full border-t border-zinc-900">
                <div className="min-w-0 flex-1 pr-2">
                    <h3 className="font-medium text-sm text-zinc-300 capitalize truncate group-hover:text-white transition-colors">{anim.name}</h3>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                        {anim.tags?.slice(0, featured ? 5 : 2).map((tag: string) => (
                            <span key={tag} className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="text-zinc-600 text-[10px] font-mono shrink-0">
                    {anim.frames.length}f
                </div>
            </div>
        </button>
    );
}
