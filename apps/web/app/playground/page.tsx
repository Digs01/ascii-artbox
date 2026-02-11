
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AsciiAnimation } from '@asciiweb/react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Slider } from '../../components/ui/Slider';
import { Nav } from '../../components/ui/Nav';
import { ToastProvider, useToast } from '../../components/ui/ToastContext';
import { useHistory } from '../../hooks/useHistory';
import { GistManager } from '../../components/playground/GistManager';

const DEFAULT_CHARSET = " .:-=+*#%@";
const DENSE_CHARSET = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";
const MATRIX_CHARSET = "01";

// Color Presets
const COLOR_PRESETS = [
  { label: 'White', value: '#ffffff' },
  { label: 'Green', value: '#00ff00' },
  { label: 'Amber', value: '#ffb000' },
  { label: 'Cyan', value: '#00ffff' },
  { label: 'Pink', value: '#ff6ec7' },
  { label: 'Red', value: '#ff3333' },
];

// Background Themes
const BG_THEMES = [
  { label: 'Black', bg: '#000000', border: 'border-zinc-800' },
  { label: 'Dark', bg: '#111111', border: 'border-zinc-700' },
  { label: 'Terminal', bg: '#0a1a0a', border: 'border-green-900/30' },
  { label: 'Navy', bg: '#0a0a1a', border: 'border-blue-900/30' },
];

// Sample images (inline SVG data URIs — tiny samples)
const SAMPLE_IMAGES = [
  { name: 'Circle', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><circle cx="100" cy="100" r="80" fill="white"/></svg>') },
  { name: 'Star', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><polygon points="100,10 40,198 190,78 10,78 160,198" fill="white"/></svg>') },
  { name: 'Gradient', url: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><defs><linearGradient id="g"><stop offset="0%" stop-color="white"/><stop offset="100%" stop-color="black"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/></svg>') },
];

const DEFAULT_OPTIONS = {
  width: 100,
  inverted: false,
  videoFps: 12,
  charset: DEFAULT_CHARSET,
  color: '#ffffff',
  customColor: '#ffffff',
  fontSize: 8,
  bgTheme: BG_THEMES[0],
  removeBackground: false,
  transparentColor: '#000000',
  colorTolerance: 30,
  colorMode: false,
  renderMode: 'standard' as 'standard' | 'braille' | 'edge' | 'halfblock' | 'silhouette',
  posterize: 0,
  clahe: false,
  frameDiff: false,
  dither: false,
  palette: undefined as string | undefined,
  sharpen: false,
  blur: 0,
  noise: 0,
};

export default function Playground() {
  return (
    <ToastProvider>
      <PlaygroundContent />
    </ToastProvider>
  );
}

function PlaygroundContent() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [fps, setFps] = useState(12);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { state: options, set: setOptions, undo, redo, canUndo, canRedo, reset } = useHistory(DEFAULT_OPTIONS);

  // Destructure for easier access
  const {
    width, inverted, videoFps, charset, color, customColor, fontSize, bgTheme,
    removeBackground, transparentColor, colorTolerance, colorMode, renderMode,
    posterize, clahe, frameDiff, dither, palette, sharpen, blur, noise
  } = options;

  const [showEffects, setShowEffects] = useState(false);
  const [showSamples, setShowSamples] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback control
  useEffect(() => {
    if (frames.length <= 1) return;
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame(f => (f + 1) % frames.length);
      }, 1000 / fps);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, fps, frames.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setFrames([]);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      setFile(f);
      setFrames([]);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const loadSample = async (sample: typeof SAMPLE_IMAGES[0]) => {
    const res = await fetch(sample.url);
    const blob = await res.blob();
    const f = new File([blob], `${sample.name}.svg`, { type: 'image/svg+xml' });
    setFile(f);
    setFrames([]);
    setPreviewUrl(sample.url);
  };

  const generate = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 300);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('width', width.toString());
    formData.append('inverted', inverted.toString());
    formData.append('charset', charset);

    if (removeBackground) {
      formData.append('transparentColor', transparentColor);
      formData.append('colorTolerance', colorTolerance.toString());
    }

    if (colorMode) {
      formData.append('colorMode', 'true');
    }

    formData.append('renderMode', renderMode);

    if (posterize >= 2) {
      formData.append('posterize', posterize.toString());
    }

    if (clahe) {
      formData.append('clahe', 'true');
    }

    if (dither) {
      formData.append('dither', 'true');
    }

    if (palette) {
      formData.append('palette', palette);
    }

    if (sharpen) {
      formData.append('sharpen', 'true');
    }

    if (blur > 0) {
      formData.append('blur', blur.toString());
    }

    if (noise > 0) {
      formData.append('noise', noise.toString());
    }

    // Check for video or gif
    const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
    const isVideo = file.type.startsWith('video/') || isGif;
    if (isVideo) {
      formData.append('fps', videoFps.toString());
      if (frameDiff) formData.append('frameDiff', 'true');
    }

    try {
      const endpoint = isVideo ? '/api/ascii/video' : '/api/ascii';
      const res = await fetch(endpoint, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      clearInterval(progressInterval);
      setProgress(100);
      if (data.frames) {
        setFrames(data.frames);
        if (data.fps) setFps(data.fps);
      } else if (data.ascii) {
        setFrames([data.ascii]);
      }
      setCurrentFrame(0);
    } catch (err: any) {
      console.error(err);
      console.error(err);
      toast(err.message || 'Failed to generate ASCII', 'error');
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  const downloadMp4 = async () => {
    try {
      if (frames.length === 0) return;

      // Calculate effective width/height roughly if needed or let server handle
      // But we have fontSize and font metrics.
      // Server renderer uses similar logic.

      const isGif = file?.type === 'image/gif' || file?.name.toLowerCase().endsWith('.gif');
      const isVideo = file?.type.startsWith('video/') || isGif;

      const response = await fetch('/api/ascii/download-mp4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          fps: isVideo ? videoFps : (frames.length > 1 ? 5 : 1), // Default 5 fps for non-video animations?
          fontSize,
          lineHeight: fontSize + 2,
          color,
          backgroundColor: bgTheme.bg === 'transparent' ? '#000000' : bgTheme.bg // Default to black if transparent for video
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ascii-animation-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      toast('Failed to download MP4: ' + e.message, 'error');
    }
  };

  const handleSaveToLibrary = async (name: string) => {
    try {
      const isGif = file?.type === 'image/gif' || file?.name.toLowerCase().endsWith('.gif');
      const isVideo = file?.type.startsWith('video/') || isGif;

      const res = await fetch('/api/gallery/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          frames,
          fps: isVideo ? videoFps : 1, // Default fps for images? Wait, images are 1 frame.
          // For single images fps doesn't matter much.
          // Let's check `frames`.
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast('Saved to library!', 'success');
      setShowSaveModal(false);
    } catch (e: any) {
      toast('Failed to save: ' + e.message, 'error');
    }
  };

  const copyToClipboard = () => {
    const text = frames.join('\n\n--- FRAME BREAK ---\n\n');
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard!', 'success');
  };

  const downloadTxt = () => {
    const text = frames.join('\n\n--- FRAME BREAK ---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ascii-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadHtml = () => {
    const content = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>body{background:${bgTheme.bg};color:${color};font-family:monospace;line-height:${fontSize}px;font-size:${fontSize}px;white-space:pre;}#art{display:inline-block;}</style>
</head><body><div id="art">${frames[0]}</div>
<script>const frames=${JSON.stringify(frames)};let f=0;const art=document.getElementById('art');if(frames.length>1){setInterval(()=>{f=(f+1)%frames.length;art.textContent=frames[f];},${1000 / fps});}</script>
</body></html>`;
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ascii-${Date.now()}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  // Export to PNG
  const downloadPng = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const frame = frames[currentFrame] || frames[0];
    const lines = frame.split('\n');
    const charW = fontSize * 0.6;
    const charH = fontSize;
    const maxCols = Math.max(...lines.map(l => l.length));

    canvas.width = Math.ceil(maxCols * charW) + 20;
    canvas.height = lines.length * charH + 20;

    ctx.fillStyle = bgTheme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      ctx.fillText(line, 10, 10 + i * charH);
    });

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `ascii-${Date.now()}.png`; a.click();
      URL.revokeObjectURL(url);
    });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      else if (cmd && (e.key === 'y' && !e.shiftKey)) {
        e.preventDefault();
        redo();
      }
      else if (cmd && (e.key === 'Enter' || e.key === 'g')) {
        e.preventDefault();
        generate();
      }
      else if (cmd && e.key === 's') {
        e.preventDefault();
        if (frames.length > 0) setShowSaveModal(true);
      }
      else if (e.key === ' ' && frames.length > 1) {
        e.preventDefault();
        setIsPlaying(p => !p);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, frames.length, generate]);

  const activeFrame = frames.length > 1 ? frames[currentFrame % frames.length] : frames[0];

  return (
    <div className="min-h-screen bg-black text-white">
      <Nav />
      <main className="pt-24 px-6 max-w-[1400px] mx-auto pb-20">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Workstation</h1>
          <p className="text-zinc-500">Convert images and videos to ASCII art in real-time.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── Controls Panel ─── */}
          <div className="lg:col-span-4 space-y-4 flex flex-col h-[calc(100vh-160px)] sticky top-24">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {/* History Controls */}
              <div className="flex items-center justify-between bg-zinc-900/40 p-2 rounded-lg border border-zinc-800 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex gap-1">
                  <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                  </button>
                  <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></svg>
                  </button>
                  <div className="w-px h-4 bg-zinc-800 mx-1 self-center" />
                  <button onClick={() => setOptions(p => ({ ...p, width: 100, inverted: false, contrast: 1 }))} title="Reset Defaults"
                    className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" /><path d="M3 3v9h9" /></svg>
                  </button>
                </div>
                <div className="text-[9px] font-mono text-zinc-600">
                  HISTORY
                </div>
              </div>
              <Card className="space-y-4 card-hover-animation">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">1. Source</h3>
                  <button onClick={() => setShowSamples(!showSamples)} className="text-[10px] text-zinc-600 hover:text-zinc-400 font-mono">
                    {showSamples ? '[HIDE SAMPLES]' : '[SHOW SAMPLES]'}
                  </button>
                </div>

                <div
                  className={`relative group transition-all duration-200 ${isDragging ? 'scale-[1.01]' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input type="file" accept="image/*,video/*" onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className={`border border-dashed rounded-lg p-5 text-center transition-all ${isDragging
                    ? 'border-green-500 bg-green-500/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                    : 'border-zinc-800 group-hover:border-zinc-700'}`}>
                    {file ? (
                      <div className="text-white text-xs font-mono truncate">
                        {file.name}
                        <span className="block text-[10px] text-zinc-600 mt-1">{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ) : (
                      <div className={`text-xs ${isDragging ? 'text-green-400' : 'text-zinc-600'}`}>
                        {isDragging ? 'DROP FILE' : 'DROP IMAGE/VIDEO'}
                      </div>
                    )}
                  </div>
                </div>

                {showSamples && (
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900">
                    {SAMPLE_IMAGES.map(s => (
                      <button key={s.name} onClick={() => loadSample(s)}
                        className="text-[9px] py-1 bg-zinc-900/50 rounded border border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider">
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {/* SECTION 2: ENGINE */}
              <Card className="space-y-5 card-hover-animation">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">2. Engine</h3>

                <div>
                  <label className="block text-[10px] text-zinc-600 mb-2 uppercase tracking-wider font-bold">Render Algorithm</label>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { value: 'standard' as const, label: 'Mode', icon: 'Aa' },
                      { value: 'braille' as const, label: 'Dots', icon: '⣿' },
                      { value: 'halfblock' as const, label: 'Pixel', icon: '▄▀' },
                      { value: 'edge' as const, label: 'Edge', icon: '╱╲' },
                      { value: 'silhouette' as const, label: 'Cutout', icon: '◐' },
                    ].map(mode => (
                      <button key={mode.value} onClick={() => setOptions(p => ({ ...p, renderMode: mode.value }))}
                        className={`flex-1 min-w-[55px] flex flex-col items-center py-1.5 rounded border-2 transition-all ${renderMode === mode.value
                          ? 'border-green-500 bg-green-500/5 text-white shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                          : 'border-zinc-900 bg-zinc-900/20 hover:border-zinc-800 text-zinc-600 hover:text-zinc-500'
                          }`}>
                        <div className="text-sm">{mode.icon}</div>
                        <div className="text-[8px] font-bold uppercase tracking-tight leading-none mt-0.5">{mode.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-zinc-900">
                  <Slider label="Output Width" value={width} min={20} max={240} onChange={(v) => setOptions(p => ({ ...p, width: v }))} valueDisplay={`${width} ch`} />
                  {(file?.type.startsWith('video/') || file?.type === 'image/gif' || file?.name.toLowerCase().endsWith('.gif')) && (
                    <Slider label="Motion FPS" value={videoFps} min={1} max={30} onChange={(v) => setOptions(p => ({ ...p, videoFps: v }))} valueDisplay={`${videoFps} FPS`} />
                  )}
                </div>
              </Card>

              {/* SECTION 3: STYLE */}
              <Card className="space-y-5 card-hover-animation">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">3. Style</h3>

                {/* Palette & Color Group */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-[10px] text-zinc-600 uppercase tracking-wider font-bold">Color Theme</label>
                      <input type="checkbox" checked={colorMode} onChange={(e) => setOptions(p => ({ ...p, colorMode: e.target.checked }))}
                        className="rounded-sm bg-black border-zinc-700 text-green-500 focus:ring-0" />
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => setOptions(p => ({ ...p, palette: undefined, colorMode: false }))}
                        className={`px-2 py-1 rounded border transition-all text-[9px] uppercase tracking-wider ${!palette && !colorMode ? 'border-white bg-zinc-800 text-white' : 'border-zinc-900 text-zinc-600 hover:border-zinc-700'}`}>
                        Raw
                      </button>
                      {[
                        { key: 'synthwave', label: 'Synth', colors: ['#500078', '#FF0096'] },
                        { key: 'cyberpunk', label: 'Cyber', colors: ['#FF0064', '#00FFC8'] },
                        { key: 'matrix', label: 'Matrix', colors: ['#006400', '#00FF00'] },
                        { key: 'magma', label: 'Magma', colors: ['#780000', '#FF5000'] },
                      ].map(paletteItem => (
                        <button key={paletteItem.key} onClick={() => setOptions(prev => ({ ...prev, palette: paletteItem.key, colorMode: true }))}
                          className={`px-2 py-1 rounded border transition-all text-[9px] uppercase tracking-wider flex items-center gap-1.5 ${palette === paletteItem.key ? 'border-white bg-zinc-800 text-white' : 'border-zinc-900 text-zinc-600 hover:border-zinc-700'}`}>
                          <div className="flex -space-x-1">
                            {paletteItem.colors.map((c, i) => (
                              <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
                            ))}
                          </div>
                          {paletteItem.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-1.5 flex-wrap mt-3">
                      {COLOR_PRESETS.map(c => (
                        <button key={c.value} onClick={() => setOptions(p => ({ ...p, color: c.value, customColor: c.value, palette: undefined }))}
                          className={`w-5 h-5 rounded-sm border transition-all ${color === c.value ? 'border-white ring-1 ring-white/50' : 'border-transparent hover:border-zinc-600'}`}
                          style={{ background: c.value }}
                        />
                      ))}
                      <div className="relative">
                        <input type="color" value={customColor}
                          onChange={(e) => setOptions(p => ({ ...p, customColor: e.target.value, color: e.target.value, palette: undefined }))}
                          className="absolute inset-0 w-5 h-5 opacity-0 cursor-pointer" />
                        <div className="w-5 h-5 rounded-sm border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 text-[10px] hover:border-zinc-500">
                          +
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
                    <Slider label="Font Size" value={fontSize} min={4} max={20} onChange={(v) => setOptions(p => ({ ...p, fontSize: v }))} valueDisplay={`${fontSize}px`} />
                    <div>
                      <label className="block text-[10px] text-zinc-600 mb-2 uppercase tracking-wider font-bold">Terminal Background</label>
                      <div className="flex gap-1">
                        {BG_THEMES.map(t => (
                          <button key={t.label} onClick={() => setOptions(p => ({ ...p, bgTheme: t }))}
                            className={`flex-1 h-6 rounded-sm border transition-all ${bgTheme.label === t.label ? 'border-white ring-1 ring-white/20' : 'border-zinc-900'}`}
                            style={{ background: t.bg }}
                            title={t.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* SECTION 4: EFFECTS */}
              <Card className="p-0 overflow-hidden card-hover-animation">
                <button onClick={() => setShowEffects(!showEffects)}
                  className="w-full px-5 py-4 flex items-center justify-between text-zinc-500 hover:text-white transition-colors bg-zinc-900/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest">4. Effects & Filters</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 text-[8px] font-mono">ADVANCED</span>
                  </div>
                  <span className="text-xs">{showEffects ? '▲' : '▼'}</span>
                </button>

                {showEffects && (
                  <div className="p-5 space-y-5 border-t border-zinc-900">
                    <div>
                      <label className="block text-[10px] text-zinc-600 mb-2 font-mono uppercase font-bold">Custom Character Set</label>
                      <input type="text" value={charset} onChange={(e) => setOptions(p => ({ ...p, charset: e.target.value }))}
                        className="w-full bg-black border border-zinc-900 rounded px-3 py-2 text-[10px] font-mono text-white focus:border-green-500/50 focus:outline-none transition-all" />
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        <button onClick={() => setOptions(p => ({ ...p, charset: DEFAULT_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-zinc-900 rounded hover:border-zinc-700 text-zinc-600">STD</button>
                        <button onClick={() => setOptions(p => ({ ...p, charset: DENSE_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-zinc-900 rounded hover:border-zinc-700 text-zinc-600">DENSE</button>
                        <button onClick={() => setOptions(p => ({ ...p, charset: MATRIX_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-zinc-900 rounded hover:border-zinc-700 text-zinc-600">BINARY</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 border-t border-zinc-900 pt-5">
                      {[
                        { label: 'Invert Lighting', value: inverted, key: 'inverted' as const },
                        { label: 'Sharpen Detail', value: sharpen, key: 'sharpen' as const },
                        { label: 'Adaptive Contrast', value: clahe, key: 'clahe' as const },
                        { label: 'Luminance Dither', value: dither, key: 'dither' as const },
                        { label: 'Isolate Motion', value: frameDiff, key: 'frameDiff' as const, hidden: !((file?.type.startsWith('video/') || file?.type === 'image/gif' || file?.name.toLowerCase().endsWith('.gif'))) },
                        { label: 'Remove BG', value: removeBackground, key: 'removeBackground' as const },
                      ].map(f => !f.hidden && (
                        <div key={f.label} className="flex items-center justify-between">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-tight">{f.label}</label>
                          <input type="checkbox" checked={f.value} onChange={(e) => setOptions(p => ({ ...p, [f.key]: e.target.checked }))}
                            className="rounded-sm bg-black border-zinc-800 text-green-500 focus:ring-0" />
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4 border-t border-zinc-900 pt-5">
                      <Slider label="Film Grain" value={noise} min={0} max={100} step={5} onChange={(v) => setOptions(p => ({ ...p, noise: v }))} valueDisplay={noise > 0 ? noise.toString() : 'Off'} />
                      <Slider label="Blur Radius" value={blur} min={0} max={5} step={0.5} onChange={(v) => setOptions(p => ({ ...p, blur: v }))} valueDisplay={blur > 0 ? blur.toFixed(1) : 'Off'} />
                      <Slider label="Posterize" value={posterize} min={0} max={8} step={1} onChange={(v) => setOptions(p => ({ ...p, posterize: v }))} valueDisplay={posterize < 2 ? 'Off' : `${posterize} levels`} />
                    </div>

                    {removeBackground && (
                      <div className="space-y-3 p-3 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                        <label className="block text-[10px] text-zinc-600 uppercase font-bold tracking-widest">BG Threshold</label>
                        <div className="flex gap-3">
                          <input type="color" value={transparentColor} onChange={(e) => setOptions(p => ({ ...p, transparentColor: e.target.value }))}
                            className="w-8 h-8 bg-zinc-900 border border-zinc-700 rounded-lg cursor-pointer" />
                          <div className="flex-1">
                            <Slider label="Sensitivity" value={colorTolerance} min={1} max={200} onChange={(v) => setOptions(p => ({ ...p, colorTolerance: v }))} valueDisplay={colorTolerance.toString()} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            {/* STICKY GENERATE ACTION */}
            <div className="pt-4 border-t border-zinc-900 bg-black/50 backdrop-blur-md space-y-3">
              {loading && (
                <div className="space-y-1 px-1">
                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-zinc-600">
                    <span>PROCESSING PIPELINE</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}
              <Button onClick={generate} disabled={!file || loading} className="w-full h-12 text-sm font-bold tracking-[0.2em] shadow-[0_0_30px_rgba(34,197,94,0.15)]" isLoading={loading} variant="primary">
                {loading ? 'PROCESSING...' : 'GENERATE ASCII'}
              </Button>
            </div>
          </div>

          {/* ─── Preview Panel ─── */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Card className="flex-1 flex flex-col p-0 overflow-hidden bg-black/50 min-h-[500px] card-hover-animation">
              {/* Title Bar */}
              <div className="flex justify-between items-center px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                </div>
                <div className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
                  {loading ? 'Processing...' : frames.length > 0 ? 'Output' : 'Preview'}
                </div>
                <div className="text-[10px] text-zinc-700 font-mono">
                  {frames.length > 0 && `${frames.length}f · ${fps}fps`}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 overflow-auto relative" style={{ background: bgTheme.bg }}>
                {frames.length > 0 ? (
                  <div className="h-full flex items-center justify-center">
                    {/* ASCII Output */}
                    <div className="flex items-center justify-center p-6 w-full">
                      {(colorMode || renderMode === 'halfblock') ? (
                        <pre
                          className="whitespace-pre select-text font-mono"
                          style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize + 2}px` }}
                          dangerouslySetInnerHTML={{ __html: activeFrame }}
                        />
                      ) : (
                        <pre className="whitespace-pre select-text font-mono" style={{ fontSize: `${fontSize}px`, lineHeight: `${fontSize + 2}px`, color }}>
                          {activeFrame}
                        </pre>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <div className="text-3xl mb-3 opacity-20">⚡</div>
                      <div className="text-xs text-zinc-700 uppercase tracking-widest">Waiting for Input</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              {frames.length > 1 && (
                <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-2 flex items-center gap-4">
                  <button onClick={() => setIsPlaying(!isPlaying)}
                    className="text-zinc-400 hover:text-white transition-colors">
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                    )}
                  </button>

                  {/* Scrubber */}
                  <input type="range" min={0} max={frames.length - 1} value={currentFrame}
                    onChange={(e) => { setCurrentFrame(parseInt(e.target.value)); setIsPlaying(false); }}
                    className="flex-1 h-1 accent-green-500 cursor-pointer" />

                  <span className="text-[10px] font-mono text-zinc-600 w-16 text-right">
                    {currentFrame + 1}/{frames.length}
                  </span>
                </div>
              )}

              {/* Status Bar */}
              <div className="h-7 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between px-4 text-[10px] font-mono text-zinc-600">
                <div className="flex items-center gap-2">
                  {loading ? (
                    <><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /><span className="text-green-500">PROCESSING</span></>
                  ) : frames.length > 0 ? (
                    <><div className="w-1.5 h-1.5 rounded-full bg-green-500" /><span>READY</span></>
                  ) : (
                    <><div className="w-1.5 h-1.5 rounded-full bg-zinc-700" /><span>IDLE</span></>
                  )}
                </div>
                <div style={{ color }}>{fontSize}px · {color.toUpperCase()}</div>
              </div>
            </Card>

            {/* Export Buttons */}
            {frames.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                <button onClick={copyToClipboard}
                  className="h-8 rounded-md border-2 border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-500 hover:text-white transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                  Copy
                </button>
                <button onClick={() => setShowSaveModal(true)}
                  className="h-8 rounded-md border-2 border-green-900/30 hover:border-green-500/50 bg-green-500/5 text-green-600 hover:text-green-400 transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  Save
                </button>
                <button onClick={downloadTxt}
                  className="h-8 rounded-md border-2 border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-500 hover:text-white transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  .TXT
                </button>
                <button onClick={downloadHtml}
                  className="h-8 rounded-md border-2 border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-500 hover:text-white transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  .HTML
                </button>
                <button onClick={downloadPng}
                  className="h-8 rounded-md border-2 border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-500 hover:text-white transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  .PNG
                </button>
                <button onClick={downloadMp4}
                  className="h-8 rounded-md border-2 border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-500 hover:text-white transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  .MP4
                </button>
                <div className="h-8">
                  <GistManager content={activeFrame} />
                </div>
                <button onClick={() => setFrames([])}
                  className="h-8 rounded-md border-2 border-red-900/30 hover:border-red-500/50 bg-red-500/5 text-red-600 hover:text-red-400 transition-all text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5">
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Save Modal */}
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 w-full max-w-sm space-y-4">
              <h3 className="text-xl font-bold text-white">Save to Library</h3>
              <input
                type="text"
                placeholder="Animation Name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveToLibrary(saveName)}
                  disabled={!saveName.trim()}
                  className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
