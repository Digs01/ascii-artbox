'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

// ─── Playback Animation Hook ──────────────────────────────────────────────────
function usePlayAscii(frames: string[], { fps = 12 } = {}) {
    const [text, setText] = useState(frames[0] || '');
    const frameIndex = useRef(0);

    useEffect(() => {
        if (!frames || frames.length === 0) return;

        // Loop through frames
        const interval = setInterval(() => {
            frameIndex.current = (frameIndex.current + 1) % frames.length;
            setText(frames[frameIndex.current]);
        }, 1000 / fps);

        return () => clearInterval(interval);
    }, [frames, fps]);

    return { text, isMorphing: false };
}

// ─── 3D Parallax Glitch Hero Component ─────────────────────────────────────────
function HeroAscii({ frames }: { frames: string[] }) {
    const { text, isMorphing } = usePlayAscii(frames, {
        fps: 12
    });

    // Parallax logic
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 120, mass: 0.5 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    const rotateX = useTransform(y, [-400, 400], [12, -12]);
    const rotateY = useTransform(x, [-400, 400], [-12, 12]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX.set(e.clientX - centerX);
        mouseY.set(e.clientY - centerY);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    return (
        <motion.div
            className="relative z-10 select-none my-4 flex justify-center items-center w-full max-w-7xl h-[500px] md:h-[650px]"
            style={{ perspective: 1200 }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <motion.div
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                className="relative flex justify-center w-full cursor-crosshair scale-75 md:scale-90"
            >
                {/* Main Text */}
                <pre className={`font-mono text-[4px] md:text-[5px] leading-[5px] md:leading-[6px] whitespace-pre transition-colors duration-500 ${isMorphing ? 'text-amber-400/90' : 'text-amber-500/60'}`}
                    style={{ transform: 'translateZ(0)' }}>
                    {text}
                </pre>

                {/* Red Channel (Chromatic Aberration) */}
                <pre aria-hidden="true"
                    className="absolute top-0 font-mono text-[4px] md:text-[5px] leading-[5px] md:leading-[6px] text-red-500/60 whitespace-pre mix-blend-screen transition-all duration-150"
                    style={{
                        transform: `translateZ(-20px) translateX(${isMorphing ? '-6px' : '-1px'})`,
                        opacity: isMorphing ? 0.9 : 0.4
                    }}
                >
                    {text}
                </pre>

                {/* Cyan Channel (Chromatic Aberration) */}
                <pre aria-hidden="true"
                    className="absolute top-0 font-mono text-[4px] md:text-[5px] leading-[5px] md:leading-[6px] text-cyan-500/60 whitespace-pre mix-blend-screen transition-all duration-150"
                    style={{
                        transform: `translateZ(20px) translateX(${isMorphing ? '6px' : '1px'})`,
                        opacity: isMorphing ? 0.9 : 0.4
                    }}
                >
                    {text}
                </pre>

                {/* Fade Out Edges (Foreground Element) */}
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none" style={{ transform: 'translateZ(30px)' }} />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" style={{ transform: 'translateZ(30px)' }} />
            </motion.div>
        </motion.div>
    );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, description, accent }: {
    icon: string; title: string; description: string; accent: string;
}) {
    return (
        <div className="group p-6 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-zinc-600 transition-all duration-300 hover:-translate-y-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4 ${accent}`}>
                {icon}
            </div>
            <h3 className="font-bold text-white mb-2 text-lg">{title}</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">{description}</p>
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ value, label }: { value: string; label: string }) {
    return (
        <div className="text-center">
            <div className="text-4xl font-black text-white mb-1">{value}</div>
            <div className="text-zinc-500 text-sm">{label}</div>
        </div>
    );
}

// ─── Preset Demo ──────────────────────────────────────────────────────────────
const PRESET_DEMOS = [
    { name: 'Matrix', chars: '01', color: '#00ff41', bg: '#000000', label: 'Binary Rain' },
    { name: 'Braille', chars: '⠿⠾⠼⠸⠰⠠⠀', color: '#ffffff', bg: '#111111', label: 'Braille Dots' },
    { name: 'Blueprint', chars: '─│╱╲┼', color: '#4488ff', bg: '#001133', label: 'Edge Detection' },
    { name: 'Cyberpunk', chars: '▓▒░█', color: '#ff00ff', bg: '#050510', label: 'Half-Block' },
];

function PresetDemo({ preset }: { preset: typeof PRESET_DEMOS[0] }) {
    const tRef = useRef(0);
    const [frame, setFrame] = useState('');
    const COLS = 28, ROWS = 8;

    useEffect(() => {
        let raf: number;
        const chars = preset.chars;
        const render = () => {
            tRef.current += 0.05;
            const t = tRef.current;
            let out = '';
            for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    const v = (Math.sin(x * 0.4 + t) + Math.cos(y * 0.6 - t * 0.7) + 2) / 4;
                    out += chars[Math.floor(v * (chars.length - 1))];
                }
                out += '\n';
            }
            setFrame(out);
            raf = requestAnimationFrame(render);
        };
        raf = requestAnimationFrame(render);
        return () => cancelAnimationFrame(raf);
    }, [preset.chars]);

    return (
        <div className="rounded-xl border border-zinc-800 overflow-hidden hover:border-zinc-600 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
            <div className="px-4 py-3 overflow-hidden" style={{ background: preset.bg }}>
                <pre className="font-mono text-[7px] leading-[9px] select-none" style={{ color: preset.color }}>
                    {frame}
                </pre>
            </div>
            <div className="px-4 py-3 bg-zinc-950 flex items-center justify-between">
                <span className="text-white text-sm font-semibold">{preset.name}</span>
                <span className="text-zinc-500 text-xs">{preset.label}</span>
            </div>
        </div>
    );
}

// ─── Code Snippet ─────────────────────────────────────────────────────────────
const CODE_SNIPPET = `import { imageToAscii } from '@asciiweb/core';

const ascii = await imageToAscii('./photo.jpg', {
  width: 120,
  renderMode: 'braille',
  colorMode: true,
  palette: 'matrix',
});

console.log(ascii);`;

// ─── Header Animation ─────────────────────────────────────────────────────────

// Normalize frames to ensure consistent width for smooth playback
const FRAME_WIDTH = 190; // MONKEY WIDTH
const normalizeFrame = (frame: string) =>
    frame.split('\n')
        .map(line => line.padEnd(FRAME_WIDTH, ' ').slice(0, FRAME_WIDTH))
        .join('\n');

export default function Home() {
    const [copied, setCopied] = useState(false);
    const [asciiFrames, setAsciiFrames] = useState<string[]>(['...']);

    useEffect(() => {
        // Fetch raw monkey animation bundle from public directory
        fetch('/monkey.json')
            .then(res => res.json())
            .then(frames => {
                setAsciiFrames(frames.map(normalizeFrame));
            })
            .catch(console.error);
    }, []);

    const copySnippet = () => {
        navigator.clipboard.writeText(CODE_SNIPPET);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <main className="min-h-screen bg-black text-white overflow-x-hidden">

            {/* ── HERO ─────────────────────────────────────────────────────── */}
            <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20">


                {/* "ASCII Art" — above the animation */}
                <div className="relative z-10 text-center mb-4">
                    <span className="text-6xl md:text-8xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-500">
                        ASCII Art
                    </span>
                </div>

                {/* 3D Hero Ascii Element */}
                <HeroAscii frames={asciiFrames} />

                {/* "Reimagined." — below the animation */}
                <div className="relative z-10 text-center mb-6">
                    <span className="text-6xl md:text-8xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-r from-green-400 via-emerald-300 to-green-500">
                        Reimagined.
                    </span>
                </div>

                {/* Subtext + CTAs */}
                <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
                    <h1 className="sr-only">ASCII Art Reimagined.</h1>

                    <p className="text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        Convert images and videos to stunning ASCII art with{' '}
                        <span className="text-white font-medium">5 render modes</span>,{' '}
                        <span className="text-white font-medium">audio reactivity</span>, and{' '}
                        <span className="text-white font-medium">cinematic effects</span>.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/playground"
                            className="group px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-zinc-100 transition-all duration-200 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.15)] text-base"
                        >
                            Open Workstation
                            <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
                        </Link>
                        <Link
                            href="/docs"
                            className="px-8 py-4 border border-zinc-700 rounded-full hover:border-zinc-500 hover:bg-zinc-900 transition-all duration-200 text-zinc-300 text-base"
                        >
                            Read the Docs
                        </Link>
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-2 text-zinc-600 text-xs animate-bounce">
                        <span>Scroll to explore</span>
                        <span>↓</span>
                    </div>
                </div>
            </section>

            {/* ── STATS ────────────────────────────────────────────────────── */}
            <section className="border-y border-zinc-900 py-12">
                <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
                    <StatCard value="5" label="Render Modes" />
                    <StatCard value="7+" label="Style Presets" />
                    <StatCard value="16" label="Blend Modes" />
                    <StatCard value="∞" label="Possibilities" />
                </div>
            </section>

            {/* ── LIVE PRESET DEMOS ────────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Every Style, Live.</h2>
                        <p className="text-zinc-500 text-lg max-w-xl mx-auto">
                            These aren't screenshots — they're rendering right now in your browser.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {PRESET_DEMOS.map(p => <PresetDemo key={p.name} preset={p} />)}
                    </div>
                    <div className="text-center mt-8">
                        <Link href="/gallery" className="text-zinc-500 hover:text-white text-sm transition-colors">
                            Browse the full animation library →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── FEATURES ─────────────────────────────────────────────────── */}
            <section className="py-24 px-6 bg-zinc-950/50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Professional-Grade Tools.</h2>
                        <p className="text-zinc-500 text-lg max-w-xl mx-auto">
                            Built for creators who want more than a basic converter.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FeatureCard icon="🎨" title="Multi-Layer Compositor" accent="bg-blue-500/10 text-blue-400"
                            description="Stack multiple images and videos as layers with independent blend modes, transforms, and effects — like Photoshop for ASCII." />
                        <FeatureCard icon="🎵" title="Audio Reactivity" accent="bg-purple-500/10 text-purple-400"
                            description="Connect your microphone and watch ASCII art pulse, scale, distort, and shift hue in real-time to the beat." />
                        <FeatureCard icon="🔲" title="5 Render Modes" accent="bg-green-500/10 text-green-400"
                            description="Standard luminance, Braille dot-matrix, Sobel edge detection, Half-block pixel art, and Silhouette — each with unique character." />
                        <FeatureCard icon="📽️" title="Video to ASCII" accent="bg-red-500/10 text-red-400"
                            description="Upload any video and convert it frame-by-frame to animated ASCII art. Export as GIF or record the live playback." />
                        <FeatureCard icon="✨" title="Cinematic Post-FX" accent="bg-amber-500/10 text-amber-400"
                            description="Apply global effects: CRT scanlines, bloom glow, vignette darkening, and chromatic aberration for that retro-cinematic look." />
                        <FeatureCard icon="⚡" title="CLI & Core API" accent="bg-cyan-500/10 text-cyan-400"
                            description="Integrate ASCII conversion into your build pipeline. Use the CLI tool or import the core library directly into your Node.js app." />
                    </div>
                </div>
            </section>

            {/* ── CODE SNIPPET ─────────────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-xs font-mono mb-6">
                                Core API
                            </div>
                            <h2 className="text-4xl font-black tracking-tight mb-4">Drop it into your project.</h2>
                            <p className="text-zinc-500 leading-relaxed mb-6">
                                The <code className="text-zinc-300 bg-zinc-900 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-800">@asciiweb/core</code> package
                                works in any Node.js environment. Convert images, videos, and streams with a single function call.
                            </p>
                            <Link href="/docs/installation" className="inline-flex items-center gap-2 text-white font-medium hover:text-zinc-300 transition-colors">
                                View installation guide →
                            </Link>
                        </div>
                        <div className="relative">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
                                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                    <span className="ml-2 text-zinc-500 text-xs font-mono">convert.ts</span>
                                </div>
                                <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                                    <code>{CODE_SNIPPET}</code>
                                </pre>
                            </div>
                            <button
                                onClick={copySnippet}
                                className="absolute top-12 right-3 px-2 py-1 rounded text-xs text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors font-mono"
                            >
                                {copied ? '✓ copied' : 'copy'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ──────────────────────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="relative rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black p-16 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
                        <div className="relative">
                            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Start creating now.</h2>
                            <p className="text-zinc-500 text-lg mb-8 max-w-md mx-auto">
                                No account required. Open the Workstation and start converting in seconds.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/playground" className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-zinc-100 transition-all duration-200 hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.1)] text-base">
                                    Open Workstation →
                                </Link>
                                <Link href="/gallery" className="px-8 py-4 border border-zinc-700 rounded-full hover:border-zinc-500 hover:bg-zinc-900 transition-all duration-200 text-zinc-300 text-base">
                                    Browse Gallery
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────────────── */}
            <footer className="border-t border-zinc-900 py-12 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <div className="font-bold text-white text-lg tracking-tighter mb-1">AsciiArtbox</div>
                        <div className="text-zinc-600 text-sm">The modern toolkit for ASCII art on the web.</div>
                    </div>
                    <div className="flex items-center gap-8 text-sm text-zinc-500">
                        <Link href="/playground" className="hover:text-white transition-colors">Workstation</Link>
                        <Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link>
                        <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
                    </div>
                </div>
            </footer>

        </main>
    );
}
