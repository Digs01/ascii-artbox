import { useState, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';

// We dynamically import muxers to avoid SSR issues
let MuxerModule: any;

interface UseVideoExportProps {
    targetRef: React.RefObject<HTMLElement>;
    fps?: number;
    width?: number;
    height?: number;
    onSeekFrame: (time: number) => Promise<void>; // Function to scrub the timeline and wait for React to render
}

export function useVideoExport({
    targetRef,
    fps = 60,
    width = 1920,
    height = 1080,
    onSeekFrame
}: UseVideoExportProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [progress, setProgress] = useState(0); // 0-100
    const [status, setStatus] = useState<string>('');
    const abortControllerRef = useRef<AbortController | null>(null);

    const exportVideo = useCallback(async (durationSeconds: number = 5, format: 'mp4' | 'webm' = 'mp4', filename = 'ascii-export') => {
        setIsExporting(true);
        setProgress(0);
        setStatus('Initializing encoder...');
        abortControllerRef.current = new AbortController();

        try {
            // Dynamically load muxer based on format (these only work in browser)
            if (format === 'mp4') {
                MuxerModule = await import('mp4-muxer');
            } else {
                MuxerModule = await import('webm-muxer');
            }

            const totalFrames = Math.ceil(durationSeconds * fps);

            // 1. Setup Muxer
            const MuxerClass = format === 'mp4' ? MuxerModule.Muxer : MuxerModule.WebMMuxer;
            const muxer = new MuxerClass({
                target: new MuxerModule.ArrayBufferTarget(),
                video: {
                    codec: format === 'mp4' ? 'avc' : 'V_VP9',
                    width,
                    height
                },
                fastStart: format === 'mp4' ? 'in-memory' : false, // FastStart helps MP4s play before fully downloaded
            });

            const initOptions: VideoEncoderInit = {
                output: (chunk, meta) => muxer.addVideoChunk(chunk, meta as any),
                error: (e) => console.error("VideoEncoder error:", e)
            };

            const encoderConfig: VideoEncoderConfig = {
                codec: format === 'mp4' ? 'avc1.640028' : 'vp09.00.10.08', // High profile AVC or VP9
                width,
                height,
                bitrate: 15_000_000, // 15 Mbps for high quality
                framerate: fps,
            };

            const encoder = new VideoEncoder(initOptions);
            encoder.configure(encoderConfig);

            // 2. Rendering Loop
            for (let i = 0; i < totalFrames; i++) {
                if (abortControllerRef.current.signal.aborted) throw new Error('Export Cancelled');

                const currentTime = i / fps;

                // Step A: Scrub Timeline & Wait for DOM
                setStatus(`Rendering frame ${i + 1} of ${totalFrames}...`);
                await onSeekFrame(currentTime);

                // Step B: Ensure ref is available
                if (!targetRef.current) throw new Error("Target missing");

                // Step C: Capture DOM using HTML2Canvas
                // We use html2canvas instead of direct canvas readback because we MUST capture pure CSS filters (Halftone, Matrix, drop-shadows)
                const canvas = await html2canvas(targetRef.current, {
                    background: null as any, // Bypass strict TS type check to keep transparent rendering
                    useCORS: true,
                    logging: false, // Turn off to save console noise
                    width,
                    height,
                });

                // Step D: Encode Frame via WebCodecs
                // Timestamp in microseconds
                const timestamp = (i / fps) * 1_000_000;
                // Create VideoFrame from Canvas
                const frame = new VideoFrame(canvas, { timestamp });

                // keyFrame every 2 seconds
                const keyFrame = i % (fps * 2) === 0;
                encoder.encode(frame, { keyFrame });
                frame.close();

                // Step E: Progress Update & Event Loop Release
                setProgress(Math.round(((i + 1) / totalFrames) * 95)); // Encode gets us to 95%
            }

            // 3. Finalize Encoding
            setStatus('Finalizing video file...');
            await encoder.flush();
            muxer.finalize();
            encoder.close();

            // 4. Download Result
            const { buffer } = muxer.target;
            const blob = new Blob([buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${filename}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setStatus('Complete!');
            setProgress(100);

        } catch (err: any) {
            console.error('Video Export Failed:', err);
            setStatus(`Error: ${err.message}`);
        } finally {
            setTimeout(() => {
                setIsExporting(false);
                setStatus('');
                setProgress(0);
            }, 2000);
        }

    }, [fps, height, width, targetRef, onSeekFrame]);

    const cancelExport = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsExporting(false);
        setProgress(0);
        setStatus('Cancelled');
    }, []);

    return {
        isExporting,
        progress,
        status,
        exportVideo,
        cancelExport
    };
}
