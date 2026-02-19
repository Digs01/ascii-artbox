import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat } from 'lucide-react';
import { Layer } from '../../types/layer';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

interface TimelineProps {
    currentFrame: number;
    totalFrames: number; // e.g., 120 for 10s @ 12fps
    fps: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onSeek: (frame: number) => void;
    layers: Layer[];
    canPlay?: boolean;
}

export function Timeline({
    currentFrame,
    totalFrames,
    fps,
    isPlaying,
    onTogglePlay,
    onSeek,
    layers,
    canPlay = true
}: TimelineProps) {
    const scrubberRef = useRef<HTMLDivElement>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);

    // Format frames to MM:SS:FF
    const formatTime = (frame: number) => {
        const totalSeconds = Math.floor(frame / fps);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const frames = frame % fps;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
    };

    const handleScrub = (e: React.MouseEvent | MouseEvent) => {
        if (!scrubberRef.current) return;
        const rect = scrubberRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const percentage = x / rect.width;
        const frame = Math.floor(percentage * totalFrames);
        onSeek(Math.min(frame, totalFrames - 1));
    };

    const onMouseDown = (e: React.MouseEvent) => {
        setIsScrubbing(true);
        handleScrub(e);
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (isScrubbing) handleScrub(e);
        };
        const onMouseUp = () => {
            setIsScrubbing(false);
        };

        if (isScrubbing) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [isScrubbing, totalFrames]); // Add dependencies

    const progress = (currentFrame / totalFrames) * 100;

    return (
        <div className="flex flex-col h-full bg-surface border-t border-border select-none">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface-hover/30">
                <div className="flex items-center gap-2">
                    <button onClick={() => onSeek(0)} className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded hover:bg-white/5">
                        <SkipBack size={14} />
                    </button>
                    <button
                        onClick={onTogglePlay}
                        disabled={!canPlay && !isPlaying}
                        className={clsx(
                            "p-1.5 transition-colors rounded-full border",
                            !canPlay && !isPlaying
                                ? "text-text-muted bg-surface-active/50 border-border cursor-not-allowed opacity-50"
                                : "text-text-primary bg-accent-primary/10 hover:bg-accent-primary/20 hover:text-accent-primary border-accent-primary/20"
                        )}
                    >
                        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                    </button>
                    <button onClick={() => onSeek(totalFrames - 1)} className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded hover:bg-white/5">
                        <SkipForward size={14} />
                    </button>
                    <div className="h-4 w-[1px] bg-border mx-2" />
                    <div className="font-mono text-xs text-accent-primary">
                        {formatTime(currentFrame)} <span className="text-text-muted">/ {formatTime(totalFrames)}</span>
                    </div>
                </div>
                <div className="text-[10px] text-text-muted font-mono">
                    {fps} FPS
                </div>
            </div>

            {/* Scrubber Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {/* Time Ruler (simplified) */}
                <div
                    ref={scrubberRef}
                    className="h-6 relative bg-surface-active/10 cursor-pointer group border-b border-white/5"
                    onMouseDown={onMouseDown}
                >
                    {/* Playhead */}
                    <div
                        className="absolute top-0 bottom-0 w-[1px] bg-accent-danger z-20 pointer-events-none"
                        style={{ left: `${progress}%` }}
                    >
                        <div className="absolute -top-[1px] -translate-x-1/2 w-2.5 h-2.5 bg-accent-danger rotate-45 transform origin-center shadow-[0_0_5px_rgba(255,0,0,0.5)]" />
                    </div>

                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="absolute bottom-0 h-1.5 w-[1px] bg-text-muted/20" style={{ left: `${i * 10}%` }} />
                    ))}
                </div>

                {/* Layer Tracks */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-1">
                    {[...layers].reverse().map(layer => (
                        <div key={layer.id} className="relative h-6 bg-surface-active/20 rounded-sm w-full overflow-hidden flex items-center px-2">
                            <div className="absolute left-0 top-0 bottom-0 bg-accent-primary/10 w-full" />
                            {/* Visual representation of frames - simplified */}
                            <span className="relative z-10 text-[9px] text-text-muted uppercase font-bold truncate pr-2 max-w-[100px]">{layer.name}</span>

                            {/* Keyframes dots (simulated for now) */}
                            {/* In future, we can map layer.frames length to this track */}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
