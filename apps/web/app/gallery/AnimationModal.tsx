
'use client';

import { useEffect, useState, useCallback } from 'react';
import { AsciiAnimation } from '@asciiweb/react';

interface AnimationModalProps {
    anim: {
        id: string;
        name: string;
        frames: string[];
        fps: number;
        tags?: string[];
    } | null;
    onClose: () => void;
}

export function AnimationModal({ anim, onClose }: AnimationModalProps) {
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

    const handleEscape = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        if (anim) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [anim, handleEscape]);

    if (!anim) return null;

    const codeSnippet = `import { AsciiAnimation } from '@asciiweb/react';

const frames = ${JSON.stringify(anim.frames, null, 2)};

export const MyAnimation = () => (
  <AsciiAnimation
    frames={frames}
    fps={${anim.fps}}
    loop
    color="#00ff00"
  />
);`;

    const handleCopy = () => {
        navigator.clipboard.writeText(codeSnippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div>
                        <h2 className="text-2xl font-bold text-white capitalize">{anim.name}</h2>
                        <div className="flex gap-2 mt-2">
                            {anim.tags?.map((tag: string) => (
                                <span key={tag} className="text-[10px] uppercase tracking-wider px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-zinc-500">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800">
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'preview' ? 'text-green-500 border-b-2 border-green-500' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Preview
                    </button>
                    <button
                        onClick={() => setActiveTab('code')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'code' ? 'text-green-500 border-b-2 border-green-500' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Code
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6">
                    {activeTab === 'preview' ? (
                        <div className="flex items-center justify-center min-h-[400px] bg-black rounded-lg border border-zinc-900 p-8">
                            <AsciiAnimation
                                frames={anim.frames}
                                fps={anim.fps}
                                color="#00ff00"
                                style={{ fontSize: '12px', lineHeight: '14px' }}
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                <pre className="bg-black p-6 rounded-lg text-sm text-green-400 font-mono overflow-x-auto border border-zinc-900">
                                    {codeSnippet}
                                </pre>
                                <button
                                    onClick={handleCopy}
                                    className="absolute top-4 right-4 bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
                                >
                                    {copied ? '✓ Copied!' : 'Copy'}
                                </button>
                            </div>

                            <div className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800">
                                <h4 className="text-sm font-medium text-zinc-300 mb-2">Details</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-zinc-500">Frames</span>
                                        <p className="text-white font-mono">{anim.frames.length}</p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">FPS</span>
                                        <p className="text-white font-mono">{anim.fps}</p>
                                    </div>
                                    <div>
                                        <span className="text-zinc-500">Duration</span>
                                        <p className="text-white font-mono">{(anim.frames.length / anim.fps).toFixed(1)}s</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
