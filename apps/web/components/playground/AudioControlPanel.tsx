import { useState, useRef, useEffect } from 'react';
import { useAudioAnalyzer, AudioMetrics } from '../../hooks/useAudioAnalyzer';
import { Card } from '../ui/Card';

interface AudioControlPanelProps {
    analyzer: ReturnType<typeof useAudioAnalyzer>;
}

export function AudioControlPanel({ analyzer }: AudioControlPanelProps) {
    const { isListening, sourceType, startMic, startFile, stopAudio, getAudioMetrics } = analyzer;
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Visualizer Loop
    useEffect(() => {
        if (!isListening) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationId: number;

        const render = () => {
            const metrics = getAudioMetrics();
            const w = canvas.width;
            const h = canvas.height;

            ctx.clearRect(0, 0, w, h);

            // Bars
            const bars = [
                { val: metrics.bass, color: '#ef4444', label: 'BASS' },
                { val: metrics.mid, color: '#eab308', label: 'MID' },
                { val: metrics.treble, color: '#3b82f6', label: 'TREB' },
                { val: metrics.volume, color: '#fff', label: 'VOL' }
            ];

            const barWidth = w / 4;

            bars.forEach((bar, i) => {
                const height = bar.val * h;
                const x = i * barWidth;
                const y = h - height;

                ctx.fillStyle = bar.color;
                ctx.fillRect(x + 2, y, barWidth - 4, height);

                // Cap
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = 0.5;
                ctx.fillRect(x + 2, y, barWidth - 4, 2);
                ctx.globalAlpha = 1;

                // Label
                ctx.fillStyle = '#666';
                ctx.font = '10px monospace';
                ctx.fillText(bar.label, x + 5, h - 5);
            });

            animationId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationId);
    }, [isListening, getAudioMetrics]);

    return (
        <Card className="p-0 overflow-hidden card-hover-animation border-accent-success/40">
            <div className="bg-surface/50 px-4 py-2 border-b border-border flex justify-between items-center">
                <h3 className="text-xs font-bold text-accent-success uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-success animate-pulse" />
                    Audio Reactive
                </h3>
                {isListening && (
                    <button onClick={stopAudio} className="text-[10px] text-accent-danger hover:text-red-300">STOP</button>
                )}
            </div>

            <div className="p-4 space-y-4">
                {!isListening ? (
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={startMic}
                            className="flex flex-col items-center justify-center p-3 rounded bg-surface hover:bg-surface-hover border border-border transition-colors group"
                        >
                            <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🎤</span>
                            <span className="text-[10px] font-bold text-text-primary">MICROPHONE</span>
                        </button>

                        <div className="relative overflow-hidden group">
                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) startFile(e.target.files[0]);
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                            />
                            <button className="w-full h-full flex flex-col items-center justify-center p-3 rounded bg-surface group-hover:bg-surface-hover border border-border transition-colors">
                                <span className="text-xl mb-1 group-hover:scale-110 transition-transform">🎵</span>
                                <span className="text-[10px] font-bold text-text-primary">UPLOAD FILE</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <canvas ref={canvasRef} width={200} height={60} className="w-full h-[60px] bg-black/50 rounded border border-border" />
                        <div className="text-[10px] text-text-muted text-center mt-2 font-mono">
                            LISTENING: {sourceType.toUpperCase()}
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}
