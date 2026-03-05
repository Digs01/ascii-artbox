import { useState, useCallback, useRef } from 'react';
// @ts-ignore
import GIF from 'gif.js';
import { Layer } from '../types/layer';
import { renderLayersToCanvas } from './useAsciiCanvasRenderer';

interface UseGifExportProps {
    layers: Layer[];
    width?: number;
    height?: number;
    fps?: number;
    audioMetrics?: { bass: number; mid: number; treble: number; volume: number };
    backgroundColor?: string;
}

export function useGifExport({
    layers,
    width = 800,
    height = 600,
    fps = 12,
    audioMetrics,
    backgroundColor = '#000000'
}: UseGifExportProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0); // 0-100
    const abortControllerRef = useRef<AbortController | null>(null);

    const exportGif = useCallback(async (durationSeconds: number = 3, filename = 'ascii-art.gif') => {
        setIsExporting(true);
        setProgress(0);
        abortControllerRef.current = new AbortController();

        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: width,
            height: height,
            workerScript: '/gif.worker.js', // Loaded from public folder
            background: backgroundColor
        });

        const totalFrames = Math.ceil(durationSeconds * fps);
        const frameInterval = 1000 / fps; // ms per frame

        // Create Offscreen Canvas for Rendering
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
        const ctx = offscreenCanvas.getContext('2d', { alpha: false });

        if (!ctx) {
            console.error('Failed to get 2D context for GIF export');
            setIsExporting(false);
            return;
        }

        try {
            // Capture Loop
            for (let i = 0; i < totalFrames; i++) {
                if (abortControllerRef.current.signal.aborted) throw new Error('Cancelled');

                // Render specific frame to offscreen canvas
                // We use 'i' as the globalFrameCount for the export, ensuring a clean sequence from start
                const currentTime = i / fps;
                renderLayersToCanvas(
                    ctx,
                    layers,
                    width,
                    height,
                    i, // globalFrameCount logic
                    currentTime,
                    audioMetrics,
                    backgroundColor
                );

                // Add frame to GIF
                gif.addFrame(offscreenCanvas, { delay: frameInterval, copy: true });

                setProgress(Math.round((i / totalFrames) * 50)); // First 50% is capturing

                // Allow UI to breathe
                if (i % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
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

    }, [layers, width, height, fps, audioMetrics, backgroundColor]);

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
