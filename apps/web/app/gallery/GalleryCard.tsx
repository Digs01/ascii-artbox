
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
}

export function GalleryCard({ anim, featured = false, onClick }: GalleryCardProps) {
    return (
        <button
            onClick={onClick}
            className={`group text-left w-full overflow-hidden flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-950 transition-all duration-300 hover:border-green-500/30 hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.15)] focus:outline-none focus:ring-1 focus:ring-green-500/50 ${featured ? 'md:col-span-2 md:row-span-2' : ''}`}
        >
            {/* Preview */}
            <div className={`relative bg-black flex items-center justify-center border-b border-zinc-800/60 overflow-hidden ${featured ? 'aspect-[2/1] md:aspect-[2.5/1]' : 'aspect-video'}`}>
                {/* Scanline overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(34,197,94,0.03)_2px,rgba(34,197,94,0.03)_4px)]" />

                {/* Green glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-t from-green-500/5 via-transparent to-transparent" />

                <div className={`transition-all duration-300 group-hover:scale-105 ${featured ? '' : ''}`}>
                    <AsciiAnimation
                        frames={anim.frames}
                        fps={anim.fps}
                        color="white"
                        style={{
                            fontSize: featured ? '10px' : '8px',
                            lineHeight: featured ? '12px' : '10px',
                        }}
                    />
                </div>

                {/* Expand icon on hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-y-0 translate-y-1">
                    <div className="bg-black/70 backdrop-blur-sm border border-zinc-700 rounded-lg p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                    <h3 className="font-medium text-sm text-white capitalize truncate group-hover:text-green-400 transition-colors">{anim.name}</h3>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {anim.tags?.slice(0, featured ? 5 : 3).map((tag: string) => (
                            <span key={tag} className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 bg-zinc-900 border border-zinc-800/50 rounded text-zinc-600">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="text-zinc-700 text-[10px] font-mono shrink-0 ml-3">
                    {anim.frames.length}f · {anim.fps}fps
                </div>
            </div>
        </button>
    );
}
