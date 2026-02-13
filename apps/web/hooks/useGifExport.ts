import { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
// @ts-ignore
import GIF from 'gif.js';

interface UseGifExportProps {
    compositionRef: React.RefObject<HTMLDivElement>;
    fps?: number;
}

export function useGifExport({ compositionRef, fps = 10 }: UseGifExportProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0); // 0-100
    const abortControllerRef = useRef<AbortController | null>(null);

    const exportGif = useCallback(async (durationSeconds: number = 3, filename = 'ascii-art.gif') => {
        if (!compositionRef.current) return;

        setIsExporting(true);
        setProgress(0);
        abortControllerRef.current = new AbortController();

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: compositionRef.current.clientWidth,
            height: compositionRef.current.clientHeight,
            workerScript: '/gif.worker.js', // Loaded from public folder
            background: '#000000'
        });

        const totalFrames = Math.ceil(durationSeconds * fps);
        const frameInterval = 1000 / fps; // ms per frame

        try {
            // Capture Loop
            for (let i = 0; i < totalFrames; i++) {
                if (abortControllerRef.current.signal.aborted) throw new Error('Cancelled');

                // Wait for next frame timing
                await new Promise(resolve => setTimeout(resolve, frameInterval));

                // Capture Frame
                const canvas = await html2canvas(compositionRef.current, {
                    useCORS: true,
                    // @ts-ignore
                    backgroundColor: null, // Keep transparency if any
                    scale: 1, // Keep original size or higher for quality? Since it's huge, 1 is fine.
                    logging: false
                });

                gif.addFrame(canvas, { delay: frameInterval, copy: true });

                setProgress(Math.round((i / totalFrames) * 50)); // First 50% is capturing
            }

            // Rendering
            gif.on('progress', (p: number) => {
                setProgress(50 + Math.round(p * 50)); // Last 50% is rendering
            });

            gif.on('finished', (blob: Blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setIsExporting(false);
                setProgress(100);
            });

            gif.render();

        } catch (err) {
            console.error('GIF Export Failed:', err);
            setIsExporting(false);
            setProgress(0);
        }

    }, [compositionRef, fps]);

    const cancelExport = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsExporting(false);
        setProgress(0);
    }, []);

    return {
        isExporting,
        progress,
        exportGif,
        cancelExport
    };
}
