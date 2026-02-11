export interface UseAsciiPlayerProps {
    frames: string[];
    fps?: number;
    loop?: boolean;
    autoPlay?: boolean;
    onFrame?: (index: number) => void;
    onEnd?: () => void;
}
export declare function useAsciiPlayer({ frames, fps, loop, autoPlay, onFrame, onEnd }: UseAsciiPlayerProps): {
    currentFrame: string;
    currentIndex: number;
    isPlaying: boolean;
    start: () => void;
    stop: () => void;
    toggle: () => void;
};
