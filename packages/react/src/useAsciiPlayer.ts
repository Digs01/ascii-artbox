import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseAsciiPlayerProps {
    frames: string[];
    fps?: number;
    loop?: boolean;
    autoPlay?: boolean;
    onFrame?: (index: number) => void;
    onEnd?: () => void;
}

export function useAsciiPlayer({
    frames = [],
    fps = 12,
    loop = true,
    autoPlay = true,
    onFrame,
    onEnd
}: UseAsciiPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const start = useCallback(() => setIsPlaying(true), []);
    const stop = useCallback(() => setIsPlaying(false), []);
    const toggle = useCallback(() => setIsPlaying(p => !p), []);

    useEffect(() => {
        if (!isPlaying) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        const interval = 1000 / fps;
        timerRef.current = setInterval(() => {
            setCurrentIndex(prev => {
                const next = prev + 1;
                if (next >= frames.length) {
                    if (!loop) {
                        setIsPlaying(false);
                        if (onEnd) onEnd();
                        return prev;
                    }
                    if (onFrame) onFrame(0);
                    return 0;
                }
                if (onFrame) onFrame(next);
                return next;
            });
        }, interval);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isPlaying, fps, frames.length, loop, onFrame, onEnd]);

    return {
        currentFrame: frames[currentIndex] || '',
        currentIndex,
        isPlaying,
        start,
        stop,
        toggle
    };
}
