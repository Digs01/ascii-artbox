'use client';

import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback, useEffect } from 'react';
import { AsciiAnimation } from '@asciiweb/react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Slider } from '../../components/ui/Slider';
import { Nav } from '../../components/ui/Nav';
import { ToastProvider, useToast } from '../../components/ui/ToastContext';
import { useLayers } from '../../hooks/useLayers';
import { LayerManager } from '../../components/playground/LayerManager';
import { PresetLibrary } from '../../components/playground/PresetLibrary';
import { GistManager } from '../../components/playground/GistManager';
import { PRESETS, Preset } from '../../config/presets';

import { Layer, LayerOptions } from '../../types/layer';
import { useAudioAnalyzer, AudioMetrics } from '../../hooks/useAudioAnalyzer';
import { AudioControlPanel } from '../../components/playground/AudioControlPanel';
import { useScreenRecorder } from '../../hooks/useScreenRecorder';
import { useAsciiCanvasRenderer } from '../../hooks/useAsciiCanvasRenderer';
import { CompositionCanvas } from '../../components/playground/CompositionCanvas';
import html2canvas from 'html2canvas';
import { useGifExport } from '../../hooks/useGifExport';

const DEFAULT_CHARSET = " .:-=+*#%@";
const DENSE_CHARSET = "@%#*+=-:. ";
import { Undo2, Redo2 } from 'lucide-react';
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
  { label: 'Black', bg: '#000000', border: 'border-border' },
  { label: 'Dark', bg: '#121212', border: 'border-border-hover' },
  { label: 'Terminal', bg: '#0a1a0a', border: 'border-green-900/30' },
  { label: 'Navy', bg: '#0a0a1a', border: 'border-blue-900/30' },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
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

  // Layer State Hook
  const {
    layers,
    activeLayer,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    updateLayer,
    updateLayerOptions,
    updateLayerTransform,
    removeLayer,
    duplicateLayer,
    reorderLayers,
    setLayerAscii,
    commitLayerTransform,
    replaceLayerOptions,
    undo, redo, canUndo, canRedo
  } = useLayers();

  // Animation State
  const [isPlaying, setIsPlaying] = useState(true);
  const [globalFrameCount, setGlobalFrameCount] = useState(0);
  const animationRef = useRef<number>();
  // Audio State
  const audioAnalyzer = useAudioAnalyzer();
  const canvasRef = useRef<HTMLDivElement>(null);
  const compositionRef = useRef<HTMLDivElement>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Animation Loop (approx 12fps global or higher?)
  // Let's run at 12fps for retro feel, or 30/60 for smoothness but update frame index based on time?
  // Simple interval for now: 12fps default.
  // UPDATE: We need to pull audio metrics more often for smooth UI updates (60fps) but keep ASCII frames at 12fps?
  // Actually, standard ASCII animations look best at lower frame rates, but audio reactivity should be smooth.
  // We can use a ref for audio metrics to pass down without re-rendering the whole page component?
  // CompositionCanvas uses props. If we pass metrics as prop, it re-renders.
  // Since we are in React, let's try passing metrics as state for now, updated in a loop.
  const [audioMetrics, setAudioMetrics] = useState<AudioMetrics | undefined>(undefined);

  // --- SEAMLESS RECORDER (Canvas) ---
  const { stream: canvasStream } = useAsciiCanvasRenderer({
    layers,
    width: 800,
    height: 600,
    globalFrameCount,
    audioMetrics,
    backgroundColor: activeLayer?.options.bgTheme?.bg || '#111111'
  });

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          canRedo && redo();
        } else {
          canUndo && undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        canRedo && redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // Audio Analysis
  // Audio Analysis
  const { isListening, sourceType: audioSourceType, startMic, startFile: startAudioFile, stopAudio: stopAudioAnalysis, getAudioMetrics, outputStream } = useAudioAnalyzer();

  // Screen Recorder
  const { isRecording, startRecording, stopRecording, recordingTime, recordingError } = useScreenRecorder({
    cropTargetRef: compositionRef,
    audioStream: outputStream
  });

  // GIF Export
  const { isExporting: isGifExporting, progress: gifProgress, exportGif } = useGifExport({
    compositionRef,
    fps: 12
  });

  const [showPresetLibrary, setShowPresetLibrary] = useState(false);

  useEffect(() => {
    if (recordingError) {
      toast(recordingError, 'error');
    }
  }, [recordingError, toast]);

  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();
    let frameAccumulator = 0;
    const asciiFps = 12;
    const interval = 1000 / asciiFps;

    const loop = () => {
      const now = performance.now();
      const delta = now - lastTime;

      // Update ASCII Frame Count
      if (delta >= interval) {
        setGlobalFrameCount(c => c + 1);
        lastTime = now;
      }

      // Update Audio Metrics (High FPS)
      if (audioAnalyzer.isListening) {
        // We set state here, triggering re-render of page -> canvas.
        // This might be heavy. Let's see. 
        setAudioMetrics(audioAnalyzer.getAudioMetrics());
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current!);
  }, [isPlaying, audioAnalyzer.isListening]); // Re-bind if listening changes to ensure loop catches it

  // Initialize with one layer if empty
  // Initialize with one layer if empty
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && layers.length === 0) {
      addLayer(null);
      initialized.current = true;
    }
  }, [addLayer, layers.length]);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [showEffects, setShowEffects] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Access options from active layer or default to empty object to prevent crashes
  // We use a helper to get safe options
  const options = activeLayer?.options || {} as any; // Safe fallback?

  // Helper to safely update options
  const setOptions = (updater: (prev: LayerOptions) => LayerOptions) => {
    if (!activeLayerId || !activeLayer) return;
    const newOptions = updater(activeLayer.options);
    updateLayerOptions(activeLayerId, newOptions);
  };

  // Helper destructuring for active layer options
  const {
    width, inverted, videoFps, charset, color, customColor, fontSize, bgTheme,
    removeBackground, transparentColor, colorTolerance, colorMode, renderMode,
    posterize, clahe, frameDiff, dither, palette, sharpen, blur, noise, overlayText, depthMode
  } = options as LayerOptions || {}; // Fallback to empty

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(false); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      // Add as new layer or update current?
      // UX Decision: If current layer is empty (no file), update it. Else add new.
      if (activeLayer && !activeLayer.file) {
        updateLayer(activeLayer.id, {
          file: f,
          name: f.name,
          previewUrl: URL.createObjectURL(f),
          type: f.type.startsWith('video/') ? 'video' : 'image'
        });
      } else {
        addLayer(f);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (activeLayer) {
        // Update current layer
        updateLayer(activeLayer.id, {
          file: f,
          name: f.name,
          previewUrl: URL.createObjectURL(f),
          type: f.type.startsWith('video/') ? 'video' : 'image',
          frames: [] // Reset frames
        });
      } else {
        addLayer(f);
      }
    }
  };

  const generate = async () => {
    if (!activeLayer || !activeLayer.file) return;

    setLoading(true);
    setProgress(0);

    // Simulate progress for UX
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 15, 90));
    }, 300);

    const formData = new FormData();
    formData.append('file', activeLayer.file);
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
    const isGif = activeLayer.file.type === 'image/gif' || activeLayer.file.name.toLowerCase().endsWith('.gif');
    const isVideo = activeLayer.file.type.startsWith('video/') || isGif;
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

      let newFrames: string[] = [];
      let newFps = activeLayer.fps;

      if (data.frames) {
        newFrames = data.frames;
        if (data.fps) newFps = data.fps;
      } else if (data.ascii) {
        newFrames = [data.ascii];
      }

      setLayerAscii(activeLayer.id, newFrames, newFps);

    } catch (err: any) {
      console.error(err);
      toast(err.message || 'Failed to generate ASCII', 'error');
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  const downloadMp4 = async (activeLayerOnly = false) => {
    try {
      if (activeLayerOnly) {
        if (!activeLayer || activeLayer.frames.length === 0) return;
        const isGif = activeLayer.file?.type === 'image/gif' || activeLayer.file?.name.toLowerCase().endsWith('.gif');
        const isVideo = activeLayer.file?.type.startsWith('video/') || isGif;

        toast('Preparing MP4 for active layer...', 'info');

        const response = await fetch('/api/ascii/download-mp4', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            frames: activeLayer.frames,
            fps: isVideo ? videoFps : (activeLayer.frames.length > 1 ? 5 : 1),
            fontSize,
            lineHeight: fontSize + 2,
            color,
            backgroundColor: bgTheme.bg === 'transparent' ? '#000000' : bgTheme.bg
          })
        });
        if (!response.ok) throw new Error((await response.json()).error);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `ascii-${activeLayer.name}.mp4`; a.click();
        return;
      }

      // Composite Export
      toast('Rendering composite video... This may take a moment.', 'info');

      const payload = {
        layers: layers.map(l => ({
          id: l.id,
          frames: l.frames,
          fps: l.fps,
          // We pass rendered options or just styling options? 
          // Renderer needs options to render text to buffer.
          options: {
            fontSize: l.options.fontSize,
            color: l.options.colorMode ? 'white' : l.options.color, // if colorMode, html usually handles it, but renderer uses sharp/svg.
            // Wait, if colorMode is true, we have HTML spans. `renderAsciiFrameToBuffer` in renderer.ts needs to handle HTML parsing?
            // `renderer.ts` uses `text.split` and `tspan`. It does simple rendering.
            // It does NOT support full HTML coloring yet in `renderAsciiFrameToBuffer`.
            // It treats text as plain text in the SVG generally unless we improved it?
            // The current `renderer.ts` escapes XML. It does not parse spans.
            // WE NEED TO FIX RENDERER FOR COLOR MODE OR DISABLE IT FOR VIDEO?
            // For now, let's assume plain text or implement simple parsing if needed.
            // If the user wants color, they need basic color.
            backgroundColor: 'transparent', // Always transparent for compositing
            fontFamily: 'monospace',
            lineHeight: l.options.fontSize, // tight
            width: l.options.width * l.options.fontSize * 0.6 // approx? No let renderer auto-calc from content
          },
          transform: l.transform
        })),
        options: {
          width: 800, // TODO: Make dynamic based on canvas size
          height: 600,
          backgroundColor: '#000000', // Canvas background
          fps: 12, // Global FPS
          duration: 5 // Default 5s or calculcated
        }
      };

      const response = await fetch('/api/ascii/download-mp4', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ascii-composite-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast('Composite MP4 downloaded!', 'success');
    } catch (e: any) {
      toast('Failed to download MP4: ' + e.message, 'error');
    }
  };

  const copyToClipboard = () => {
    if (!activeLayer || activeLayer.frames.length === 0) return;
    const text = activeLayer.frames.join('\n\n--- FRAME BREAK ---\n\n');
    navigator.clipboard.writeText(text);
    toast('Active layer copied to clipboard!', 'success');
  };

  const downloadTxt = () => {
    if (!activeLayer || activeLayer.frames.length === 0) return;
    const text = activeLayer.frames.join('\n\n--- FRAME BREAK ---\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ascii-${activeLayer.name}-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadHtml = () => {
    if (!activeLayer || activeLayer.frames.length === 0) return;
    const content = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>body{background:${bgTheme.bg};color:${color};font-family:monospace;line-height:${fontSize}px;font-size:${fontSize}px;white-space:pre;}#art{display:inline-block;}</style>
</head><body><div id="art">${activeLayer.frames[0]}</div>
<script>const frames=${JSON.stringify(activeLayer.frames)};let f=0;const art=document.getElementById('art');if(frames.length>1){setInterval(()=>{f=(f+1)%frames.length;art.textContent=frames[f];},${1000 / (activeLayer.fps || 12)});}</script>
</body></html>`;
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ascii-${activeLayer.name}-${Date.now()}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleApplyPreset = (preset: Preset) => {
    if (!activeLayer) return;

    // Apply Options
    if (preset.options) {
      updateLayerOptions(activeLayer.id, preset.options as any);
    }

    // Apply Transform
    if (preset.transform) {
      updateLayerTransform(activeLayer.id, preset.transform);
    }

    toast(`Applied preset: ${preset.name}`, 'success');
  };

  const handleSaveToLibrary = async (name: string) => {
    try {
      if (!activeLayer || activeLayer.frames.length === 0) return;
      const isGif = activeLayer.file?.type === 'image/gif' || activeLayer.file?.name.toLowerCase().endsWith('.gif');
      const isVideo = activeLayer.file?.type.startsWith('video/') || isGif;

      const res = await fetch('/api/gallery/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          frames: activeLayer.frames,
          fps: isVideo ? videoFps : 1,
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

  // Export Share Card
  // We need to capture the CompositionCanvas specifically
  // But html2canvas might have trouble with some CSS.
  // Actually, we can just wrap the CompositionCanvas in a div and ref that.

  const downloadShareCard = async () => {
    if (!compositionRef.current) return;
    try {
      toast('Generating generic capture...', 'info');
      const canvas = await html2canvas(compositionRef.current, {
        background: undefined,
        useCORS: true
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ascii-composite-${Date.now()}.png`; a.click();
        URL.revokeObjectURL(url);
        toast('Image downloaded!', 'success');
      });
    } catch (e: any) {
      toast('Failed to capture: ' + e.message, 'error');
    }
  };

  const handleFitToCanvas = (cover = false) => {
    if (!activeLayer || !activeLayer.frames[0]) return;

    // Calculate ASCII dimensions accurately
    const lines = activeLayer.frames[0].split('\n');
    const textHeight = lines.length * activeLayer.options.fontSize;

    // Measure width using a temporary canvas for accuracy instead of estimating
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match Tailwind 'font-mono' stack as closely as possible to ensure accurate measurement
    // Default Tailwind mono stack: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace
    ctx.font = `${activeLayer.options.fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;

    // Find longest line to measure
    let maxLineWidth = 0;
    lines.forEach(line => {
      const w = ctx.measureText(line).width;
      if (w > maxLineWidth) maxLineWidth = w;
    });

    const textWidth = maxLineWidth;

    const canvasWidth = 800;
    const canvasHeight = 600;

    // Prevent division by zero
    if (textWidth === 0 || textHeight === 0) return;

    const scaleX = canvasWidth / textWidth;
    const scaleY = canvasHeight / textHeight;

    // For Cover: Max of scales. Increase buffer to 1.1 (10% overshoot) to guarantee coverage even with font rendering differences.
    // For Fit: Min of scales.
    const newScale = cover ? Math.max(scaleX, scaleY) * 1.1 : Math.min(scaleX, scaleY) * 0.95;

    updateLayerTransform(activeLayer.id, {
      scale: newScale,
      x: 0,
      y: 0
    });
    toast(cover ? 'Covered Canvas' : 'Fitted to Canvas', 'success');
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && (e.key === 'Enter' || e.key === 'g')) {
        e.preventDefault();
        generate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generate]);

  if (!activeLayer) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 text-center">Loading layers...</div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Nav />
      {/* Composition wrapper for capturing */}

      <main className="pt-24 px-6 max-w-[1400px] mx-auto pb-20">
        <header className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Workstation</h1>
          <p className="text-text-muted">Compositing Mode</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ─── Controls Panel ─── */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="lg:col-span-4 space-y-4 flex flex-col h-[calc(100vh-160px)] sticky top-24"
          >

            {/* TOP ACTIONS */}
            <motion.div variants={item} className="space-y-3 pb-2">
              <Button onClick={generate} disabled={!activeLayer.file || loading} className="w-full h-12 text-sm font-bold tracking-[0.2em] shadow-[0_0_30px_rgba(34,197,94,0.15)]" isLoading={loading} variant="primary">
                {loading ? 'PROCESSING...' : 'GENERATE ASCII'}
              </Button>
              {loading && (
                <div className="space-y-1 px-1">
                  <div className="h-1 bg-surface-active rounded-full overflow-hidden">
                    <div className="h-full bg-accent-success transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-mono text-text-muted">
                    <span>PROCESSING PIPELINE</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div variants={container} className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">

              {/* LAYERS MANAGER */}
              <motion.div variants={item}>
                <LayerManager
                  layers={layers}
                  activeLayerId={activeLayerId}
                  onSelectLayer={setActiveLayerId}
                  onToggleVisibility={(id) => {
                    const l = layers.find(x => x.id === id);
                    if (l) updateLayer(id, { visible: !l.visible });
                  }}
                  onToggleLock={(id) => {
                    const l = layers.find(x => x.id === id);
                    if (l) updateLayer(id, { locked: !l.locked });
                  }}
                  onRemoveLayer={removeLayer}
                  onDuplicateLayer={duplicateLayer}
                  onReorderLayers={reorderLayers}
                  onAddLayer={() => addLayer(null)}
                />
              </motion.div>

              {/* SECTION 1: Source */}
              <motion.div variants={item}>
                <Card className="space-y-4 card-hover-animation">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Source</h3>
                    <span className="text-[9px] text-text-secondary">{activeLayer.name}</span>
                  </div>

                  <div
                    className={`relative group transition-all duration-200 ${isDraggingFile ? 'scale-[1.01]' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input type="file" accept="image/*,video/*" onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className={clsx(
                      "border border-dashed rounded-lg p-5 text-center transition-all",
                      isDraggingFile
                        ? 'border-accent-success bg-accent-success/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]'
                        : 'border-border group-hover:border-border-hover'
                    )}>
                      {activeLayer.file ? (
                        <div className="text-text-primary text-xs font-mono truncate">
                          {activeLayer.file.name}
                          <span className="block text-[10px] text-text-muted mt-1">{(activeLayer.file.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ) : (
                        <div className={clsx("text-xs", isDraggingFile ? 'text-accent-success' : 'text-text-muted')}>
                          {isDraggingFile ? 'DROP FILE' : 'DROP IMAGE/VIDEO (Updates Active Layer)'}
                        </div>
                      )}
                    </div>
                  </div>

                  {activeLayer.previewUrl && activeLayer.file && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-border bg-black">
                      {activeLayer.type === 'video' ? (
                        <video src={activeLayer.previewUrl} className="w-full max-h-48 object-contain" autoPlay loop muted playsInline />
                      ) : (
                        <img src={activeLayer.previewUrl} alt="Source preview" className="w-full max-h-48 object-contain" />
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>




              {/* SECTION 2: ENGINE */}
              <motion.div variants={item}>
                <Card className="space-y-5 card-hover-animation">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Generative Engine</h3>

                  <div>
                    <label className="block text-[10px] text-text-muted mb-2 uppercase tracking-wider font-bold">Render Algorithm</label>
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { value: 'standard' as const, label: 'Mode', icon: 'Aa' },
                        { value: 'braille' as const, label: 'Dots', icon: '⣿' },
                        { value: 'halfblock' as const, label: 'Pixel', icon: '▄▀' },
                        { value: 'edge' as const, label: 'Edge', icon: '╱╲' },
                        { value: 'silhouette' as const, label: 'Cutout', icon: '◐' },
                      ].map(mode => (
                        <button key={mode.value} onClick={() => setOptions(p => ({ ...p, renderMode: mode.value }))}
                          className={clsx(
                            "flex-1 min-w-[55px] flex flex-col items-center py-1.5 rounded border-2 transition-all",
                            renderMode === mode.value
                              ? 'border-accent-success bg-accent-success/5 text-text-primary shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                              : 'border-surface bg-surface/50 hover:border-border text-text-muted hover:text-text-secondary'
                          )}>
                          <div className="text-sm">{mode.icon}</div>
                          <div className="text-[8px] font-bold uppercase tracking-tight leading-none mt-0.5">{mode.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-border">
                    <Slider label="Output Width" value={width || 100} min={20} max={240} onChange={(v) => setOptions(p => ({ ...p, width: v }))} valueDisplay={`${width} ch`} />
                    {(activeLayer.file?.type.startsWith('video/') || activeLayer.file?.name.toLowerCase().endsWith('.gif')) && (
                      <Slider label="Motion FPS" value={videoFps || 12} min={1} max={30} onChange={(v) => setOptions(p => ({ ...p, videoFps: v }))} valueDisplay={`${videoFps} FPS`} />
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* SECTION 3: STYLE */}
              <motion.div variants={item}>
                <Card className="space-y-5 card-hover-animation">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Style</h3>
                    <Button variant="ghost" size="sm" onClick={() => setShowPresetLibrary(true)} className="h-5 px-2 text-[9px] border border-border hover:border-accent-primary hover:text-accent-primary">
                      LIBRARY
                    </Button>
                  </div>

                  {/* Background Theme */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Canvas Background</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BG_THEMES.map(theme => (
                        <button
                          key={theme.label}
                          onClick={() => setOptions(p => ({ ...p, bgTheme: theme }))}
                          className={clsx(
                            "py-1.5 rounded border text-[9px] truncate transition-colors",
                            options.bgTheme?.label === theme.label
                              ? "border-accent-success text-text-primary bg-surface-active"
                              : "border-border text-text-muted hover:border-border-hover hover:text-text-primary"
                          )}
                        >
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Palette & Color Group */}
                  <div className="space-y-4 border-t border-border pt-4">
                    {/* Real-time Color Control */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Color Override</label>
                        <input type="checkbox" checked={options.colorMode || false} onChange={(e) => setOptions(p => ({ ...p, colorMode: e.target.checked }))}
                          className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                      </div>

                      {(options.colorMode) && (
                        <div className="flex gap-2 h-8">
                          {/* Native Picker */}
                          <div className="relative flex-1 group">
                            <input
                              type="color"
                              value={options.color || '#ffffff'}
                              onChange={(e) => replaceLayerOptions(activeLayer.id, { color: e.target.value, customColor: e.target.value, palette: undefined })}
                              onBlur={(e) => updateLayerOptions(activeLayer.id, { color: e.target.value })}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                            />
                            <div className="w-full h-full rounded border border-border group-hover:border-border-hover flex items-center justify-center transition-colors"
                              style={{ backgroundColor: options.color || '#ffffff' }}
                            >
                              <span className="text-[9px] font-mono mix-blend-difference text-white/80">{options.color || '#ffffff'}</span>
                            </div>
                          </div>

                          {/* Quick Swatches */}
                          {COLOR_PRESETS.slice(0, 4).map(c => (
                            <button
                              key={c.value}
                              onClick={() => setOptions(p => ({ ...p, color: c.value, customColor: c.value, palette: undefined }))}
                              className="w-8 h-8 rounded border border-border hover:border-white transition-all transform hover:scale-105"
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <Slider label="Font Size" value={fontSize || 8} min={4} max={20} onChange={(v) => setOptions(p => ({ ...p, fontSize: v }))} valueDisplay={`${fontSize}px`} />
                  </div>
                </Card>
              </motion.div>

              {/* TRANSFORM CONTROL (New) */}
              <motion.div variants={item}>
                <Card className="space-y-4 card-hover-animation">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Transform</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Slider label="Position X" value={activeLayer.transform.x} min={-400} max={400} step={1}
                      onChange={(v) => updateLayerTransform(activeLayer.id, { x: v })}
                      valueDisplay={`${activeLayer.transform.x}px`}
                    />
                    <Slider label="Position Y" value={activeLayer.transform.y} min={-300} max={300} step={1}
                      onChange={(v) => updateLayerTransform(activeLayer.id, { y: v })}
                      valueDisplay={`${activeLayer.transform.y}px`}
                    />
                    <div className="col-span-2 flex justify-end">
                      <button onClick={() => updateLayerTransform(activeLayer.id, { x: 0, y: 0 })} className="text-[9px] text-text-muted hover:text-text-primary uppercase tracking-wider">Reset Position</button>
                    </div>

                    <Slider label="Opacity" value={activeLayer.transform.opacity} min={0} max={1} step={0.01}
                      onChange={(v) => updateLayerTransform(activeLayer.id, { opacity: v })}
                      valueDisplay={`${Math.round(activeLayer.transform.opacity * 100)}%`}
                    />
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <Slider label="Scale" value={activeLayer.transform.scale} min={0.1} max={3} step={0.1}
                          onChange={(v) => updateLayerTransform(activeLayer.id, { scale: v })}
                          valueDisplay={`${activeLayer.transform.scale.toFixed(1)}x`}
                        />
                      </div>
                      <div className="flex gap-1 mb-1">
                        <button onClick={() => handleFitToCanvas(false)} title="Fit to Canvas" className="px-2 py-1 bg-surface border border-border rounded text-[9px] uppercase hover:bg-surface-hover text-text-muted hover:text-text-primary">Fit</button>
                        <button onClick={() => handleFitToCanvas(true)} title="Cover Canvas" className="px-2 py-1 bg-surface border border-border rounded text-[9px] uppercase hover:bg-surface-hover text-text-muted hover:text-text-primary">Cover</button>
                      </div>
                    </div>
                    <Slider label="Rotation" value={activeLayer.transform.rotation} min={0} max={360} step={1}
                      onChange={(v) => updateLayerTransform(activeLayer.id, { rotation: v })}
                      valueDisplay={`${activeLayer.transform.rotation}°`}
                    />
                    <div>
                      <label className="block text-[10px] text-text-muted mb-2 uppercase tracking-wider font-bold">Blend Mode</label>
                      <select
                        value={activeLayer.transform.blendMode}
                        onChange={(e) => updateLayerTransform(activeLayer.id, { blendMode: e.target.value as any })}
                        className="w-full bg-black border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-border-hover"
                      >
                        <option value="normal">Normal</option>
                        <option value="multiply">Multiply</option>
                        <option value="screen">Screen</option>
                        <option value="overlay">Overlay</option>
                        <option value="darken">Darken</option>
                        <option value="lighten">Lighten</option>
                        <option value="difference">Difference</option>
                        <option value="exclusion">Exclusion</option>
                      </select>

                      <div className="mt-2">
                        <label className="block text-[10px] text-text-muted mb-2 uppercase tracking-wider font-bold">Animation LUT</label>
                        <select
                          value={activeLayer.transform.lut || 'none'}
                          onChange={(e) => updateLayerTransform(activeLayer.id, { lut: e.target.value as any })}
                          className="w-full bg-black border border-border rounded px-2 py-1 text-[10px] text-text-primary focus:outline-none focus:border-border-hover"
                        >
                          <option value="none">None</option>
                          <option value="spectrum">Spectrum (RGB Cycle)</option>
                          <option value="pulse">Pulse (Brightness)</option>
                          <option value="flicker">Flicker (Opacity)</option>
                          <option value="glitch">Glitch (Red/Blue)</option>
                          <option value="thermal">Thermal (Invert+Hue)</option>
                          <option value="noir">Noir (Grayscale)</option>
                          <option value="cyber">Cyber (Neon Glow)</option>
                        </select>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => updateLayerTransform(activeLayer.id, { flipX: !activeLayer.transform.flipX })}
                          className={clsx(
                            "flex-1 py-1.5 text-[9px] uppercase font-bold rounded border transition-colors",
                            activeLayer.transform.flipX
                              ? 'bg-surface-active border-text-secondary text-text-primary'
                              : 'border-border text-text-muted hover:text-text-primary'
                          )}
                        >
                          Flip H
                        </button>
                        <button
                          onClick={() => updateLayerTransform(activeLayer.id, { flipY: !activeLayer.transform.flipY })}
                          className={clsx(
                            "flex-1 py-1.5 text-[9px] uppercase font-bold rounded border transition-colors",
                            activeLayer.transform.flipY
                              ? 'bg-surface-active border-text-secondary text-text-primary'
                              : 'border-border text-text-muted hover:text-text-primary'
                          )}
                        >
                          Flip V
                        </button>
                      </div>

                      {/* AUDIO BINDING UI - MOVED OUT */}
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* AUDIO CONTROL */}
              <motion.div variants={item}>
                <Card className="space-y-4 card-hover-animation">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Audio Source</h3>
                  <AudioControlPanel analyzer={audioAnalyzer} />

                  {/* Audio React Bindings - kept here or in transform? User put Audio before Effects, so maybe Audio Control + Reactivity belong here? */}
                  {/* Actually, user said "Transform, Audio, Effects". Binding is usually part of transform, but let's duplicate or move the binding UI here? */}
                  {/* No, the binding UI needs to be with the properties it controls OR standalone. */}
                  {/* The previous UI had binding IN Transform. I'll keep binding in Transform but move the Audio *Source* card to after Transform. */}

                  {/* Re-adding Audio Bindings here for clarity if requested? No, user just said "Audio" card. */}
                  {/* But wait, "Link Audio Data" is effectively configuring the layer's reactivity. */}
                  {/* I will keep the binding controls inside the Transform card (as they relate to scale/opacity) but ensure the Layer Reactivity Toggle is prominent. */}

                  {/* Let's actually put the Audio REACTIVITY settings (Source selection, Strength, Target) here in the AUDIO card? */}
                  {/* That makes a lot of sense. The "Audio" card handles Source (Mic) AND Reactivity Config. */}
                  {/* Moving the Audio Reactivity UI from Transform to here. */}

                  <div className="mt-4 pt-4 border-t border-zinc-900/50">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Audio Reactivity</label>
                      <input
                        type="checkbox"
                        checked={activeLayer.transform.audioReact?.enabled ?? false}
                        onChange={(e) => updateLayerTransform(activeLayer.id, {
                          audioReact: { ...activeLayer.transform.audioReact!, enabled: e.target.checked }
                        } as any)}
                        className="w-3 h-3 accent-green-500 cursor-pointer"
                      />
                    </div>

                    {activeLayer.transform.audioReact?.enabled && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] text-zinc-600 mb-1 uppercase">Source</label>
                            <select
                              value={activeLayer.transform.audioReact.source}
                              onChange={(e) => updateLayerTransform(activeLayer.id, {
                                audioReact: { ...activeLayer.transform.audioReact!, source: e.target.value as any }
                              } as any)}
                              className="w-full bg-black border border-zinc-800 rounded px-1.5 py-1 text-[9px] text-white"
                            >
                              <option value="bass">Bass</option>
                              <option value="mid">Mid</option>
                              <option value="treble">Treble</option>
                              <option value="volume">Volume</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] text-zinc-600 mb-1 uppercase">Target</label>
                            <select
                              value={activeLayer.transform.audioReact.target}
                              onChange={(e) => updateLayerTransform(activeLayer.id, {
                                audioReact: { ...activeLayer.transform.audioReact!, target: e.target.value as any }
                              } as any)}
                              className="w-full bg-black border border-zinc-800 rounded px-1.5 py-1 text-[9px] text-white"
                            >
                              <option value="scale">Scale</option>
                              <option value="opacity">Opacity</option>
                              <option value="rotation">Rotation</option>
                              <option value="distortion">Distortion (Glitch)</option>
                              <option value="hue">Hue Shift</option>
                              <option value="rgb-split">RGB Split (Chromatic)</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-zinc-600 uppercase">Strength</span>
                            <span className="text-zinc-400">{(activeLayer.transform.audioReact.strength * 100).toFixed(0)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={activeLayer.transform.audioReact.strength}
                            onChange={(e) => updateLayerTransform(activeLayer.id, {
                              audioReact: { ...activeLayer.transform.audioReact!, strength: parseFloat(e.target.value) }
                            } as any)}
                            className="w-full h-1 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-green-500"
                          />
                        </div>

                        <button
                          onClick={() => updateLayerTransform(activeLayer.id, {
                            audioReact: { ...activeLayer.transform.audioReact!, invert: !activeLayer.transform.audioReact?.invert }
                          } as any)}
                          className={`w-full py-1 text-[8px] uppercase font-bold rounded border ${activeLayer.transform.audioReact.invert ? 'bg-zinc-800 border-zinc-600 text-white' : 'border-zinc-800 text-zinc-600'}`}
                        >
                          Invert Signal
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* SECTION 4: EFFECTS */}
              <motion.div variants={item}>
                <Card className="p-0 overflow-hidden card-hover-animation">
                  <button onClick={() => setShowEffects(!showEffects)}
                    className="w-full px-5 py-4 flex items-center justify-between text-text-muted hover:text-text-primary transition-colors bg-surface-active/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-widest">4. Effects & Filters</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-surface-active text-[8px] font-mono text-text-secondary">ADVANCED</span>
                    </div>
                    <span className="text-xs">{showEffects ? '▲' : '▼'}</span>
                  </button>

                  {showEffects && (
                    <div className="p-5 space-y-5 border-t border-border">
                      <div>
                        <label className="block text-[10px] text-text-muted mb-2 font-mono uppercase font-bold">Custom Character Set</label>
                        <input type="text" value={charset} onChange={(e) => setOptions(p => ({ ...p, charset: e.target.value }))}
                          className="w-full bg-black border border-border rounded px-3 py-2 text-[10px] font-mono text-text-primary focus:border-accent-success/50 focus:outline-none transition-all" />
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          <button onClick={() => setOptions(p => ({ ...p, charset: DEFAULT_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-border rounded hover:border-border-hover text-text-muted hover:text-text-primary">STD</button>
                          <button onClick={() => setOptions(p => ({ ...p, charset: DENSE_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-border rounded hover:border-border-hover text-text-muted hover:text-text-primary">DENSE</button>
                          <button onClick={() => setOptions(p => ({ ...p, charset: MATRIX_CHARSET }))} className="text-[9px] px-1.5 py-0.5 border border-border rounded hover:border-border-hover text-text-muted hover:text-text-primary">BINARY</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 border-t border-border pt-5">
                        {[
                          { label: 'Invert Lighting', value: inverted, key: 'inverted' as const },
                          { label: 'Sharpen Detail', value: sharpen, key: 'sharpen' as const },
                          { label: 'Adaptive Contrast', value: clahe, key: 'clahe' as const },
                          { label: 'Luminance Dither', value: dither, key: 'dither' as const },
                          { label: 'Isolate Motion', value: frameDiff, key: 'frameDiff' as const, hidden: !((activeLayer.file?.type.startsWith('video/') || activeLayer.file?.type === 'image/gif' || activeLayer.file?.name.toLowerCase().endsWith('.gif'))) },
                          { label: 'Remove BG', value: removeBackground, key: 'removeBackground' as const },
                        ].map(f => !f.hidden && (
                          <div key={f.label} className="flex items-center justify-between">
                            <label className="text-[10px] text-text-muted uppercase tracking-tight">{f.label}</label>
                            <input type="checkbox" checked={!!f.value} onChange={(e) => setOptions(p => ({ ...p, [f.key]: e.target.checked }))}
                              className="rounded-sm bg-black border-border text-accent-success focus:ring-0" />
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4 border-t border-border pt-5">
                        <Slider label="Film Grain" value={noise || 0} min={0} max={100} step={5} onChange={(v) => setOptions(p => ({ ...p, noise: v }))} valueDisplay={noise > 0 ? noise.toString() : 'Off'} />
                        <Slider label="Blur Radius" value={blur || 0} min={0} max={5} step={0.5} onChange={(v) => setOptions(p => ({ ...p, blur: v }))} valueDisplay={blur > 0 ? blur.toFixed(1) : 'Off'} />
                        <Slider label="Posterize" value={posterize || 0} min={0} max={8} step={1} onChange={(v) => setOptions(p => ({ ...p, posterize: v }))} valueDisplay={posterize < 2 ? 'Off' : `${posterize} levels`} />
                      </div>

                      {removeBackground && (
                        <div className="space-y-3 p-3 bg-surface/30 rounded-lg border border-border/50">
                          <label className="block text-[10px] text-text-muted uppercase font-bold tracking-widest">BG Threshold</label>
                          <div className="flex gap-3">
                            <input type="color" value={transparentColor} onChange={(e) => setOptions(p => ({ ...p, transparentColor: e.target.value }))}
                              className="w-8 h-8 bg-surface border border-border rounded-lg cursor-pointer" />
                            <div className="flex-1">
                              <Slider label="Sensitivity" value={colorTolerance || 30} min={1} max={200} onChange={(v) => setOptions(p => ({ ...p, colorTolerance: v }))} valueDisplay={colorTolerance.toString()} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </motion.div>
            </motion.div>
          </motion.div>


          {/* ─── Preview Panel ─── */}
          <motion.div variants={item} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-8 flex flex-col gap-4">
            <Card className="relative flex-1 flex flex-col p-0 overflow-hidden bg-black/50 min-h-[500px] card-hover-animation">
              <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                  <div className="flex gap-1.5 bg-black/50 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                </div>

                <div className="flex gap-3 pointer-events-auto">
                  {/* Recording Indicator */}
                  {isRecording && (
                    <div className="flex items-center gap-2 text-accent-danger animate-pulse bg-black/50 backdrop-blur-md px-3 py-1 rounded border border-accent-danger/30">
                      <div className="w-2 h-2 rounded-full bg-accent-danger" />
                      <span className="text-[10px] uppercase font-bold tracking-widest">
                        REC {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                      </span>
                    </div>
                  )}

                  <div className="text-[10px] font-mono text-zinc-500 bg-black/50 backdrop-blur-md px-2 py-1 rounded border border-white/10">
                    COMPOSITION PREVIEW
                  </div>
                </div>

                <div className="flex gap-2 pointer-events-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={clsx(
                      "h-6 w-6 p-0 hover:bg-surface-active",
                      isRecording ? 'text-accent-danger bg-accent-danger/10 hover:bg-accent-danger/20' : 'text-text-muted'
                    )}
                    onClick={isRecording ? stopRecording : startRecording}
                    title={isRecording ? "Stop Recording" : "Record Screen (Video)"}
                  >
                    <div className={clsx("w-2.5 h-2.5 rounded-full", isRecording ? 'bg-current' : 'border-2 border-current')} />
                  </Button>
                  <div className="flex items-center gap-1 border-r border-border pr-2 mr-2">
                    <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} className="h-6 w-6 p-0 text-text-muted hover:text-text-primary" title="Undo (Ctrl+Z)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} className="h-6 w-6 p-0 text-text-muted hover:text-text-primary" title="Redo (Ctrl+Shift+Z)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7" /></svg>
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsPlaying(!isPlaying)} className="h-6 w-6 p-0 text-text-muted hover:text-text-primary" title={isPlaying ? "Pause Animation" : "Play Animation"}>
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5 3l14 9-14 9V3z" /></svg>
                    )}
                  </Button>

                  <div className="flex bg-surface-active/50 rounded-md p-0.5 border border-border/50">
                    <button onClick={downloadShareCard} className="px-2 py-0.5 text-[9px] text-text-muted hover:text-text-primary hover:bg-surface-active rounded transition-colors" title="Export Composite as PNG">PNG</button>
                    <div className="w-[1px] bg-border/50 my-0.5" />
                    <button onClick={() => downloadMp4(false)} className="px-2 py-0.5 text-[9px] text-text-muted hover:text-text-primary hover:bg-surface-active rounded transition-colors" title="Export Composite as MP4">MP4</button>
                    <div className="w-[1px] bg-border/50 my-0.5" />
                    <button onClick={() => exportGif()} disabled={isGifExporting} className="px-2 py-0.5 text-[9px] text-text-muted hover:text-text-primary hover:bg-surface-active rounded transition-colors flex items-center gap-1" title="Export Composite as GIF">
                      GIF {isGifExporting && <span className="text-accent-success animate-pulse">{Math.round(gifProgress)}%</span>}
                    </button>
                    <div className="w-[1px] bg-border/50 my-0.5" />
                    <button onClick={downloadTxt} className="px-2 py-0.5 text-[9px] text-text-muted hover:text-text-primary hover:bg-surface-active rounded transition-colors" title="Export Active Layer as TXT">TXT</button>
                    <div className="w-[1px] bg-border/50 my-0.5" />
                    <button onClick={downloadHtml} className="px-2 py-0.5 text-[9px] text-text-muted hover:text-text-primary hover:bg-surface-active rounded transition-colors" title="Export Active Layer as HTML">HTML</button>
                  </div>

                  {activeLayer && activeLayer.frames.length > 0 && (
                    <div className="flex items-center ml-1">
                      <GistManager
                        content={activeLayer.frames.join('\n\n--- FRAME BREAK ---\n\n')}
                        filename={`art-${Date.now()}.txt`}
                        className="px-2 py-0.5 text-[9px] bg-surface-active border border-border text-text-muted hover:text-text-primary hover:border-border-hover rounded transition-colors flex items-center h-6 font-mono"
                        variant="ghost"
                        size="sm"
                      />
                    </div>
                  )}

                  <Button size="sm" variant="secondary" onClick={() => setShowSaveModal(true)} className="text-[9px] h-6 px-2 ml-1">
                    Save
                  </Button>
                </div>
              </div>

              <div ref={compositionRef} className={clsx("relative flex-1 overflow-hidden", isRecording && "cursor-none")}
                style={{ background: activeLayer?.options.bgTheme?.bg || '#111111' }}
              >
                {/* Composition Canvas */}
                <CompositionCanvas
                  layers={layers}
                  activeLayerId={activeLayerId}
                  onSelectLayer={setActiveLayerId}
                  onUpdateTransform={(id, t) => updateLayerTransform(id, t)}
                  onUpdateTransformEnd={(id, t) => commitLayerTransform(id, t)}
                  width={800} height={600} scale={1}
                  globalFrameCount={globalFrameCount}
                  audioMetrics={audioMetrics}
                  isRecording={isRecording}
                />
              </div>

            </Card>
          </motion.div>
        </div>
      </main>

      {/* Modals & Overlays */}
      <PresetLibrary
        isOpen={showPresetLibrary}
        onClose={() => setShowPresetLibrary(false)}
        onSelectPreset={handleApplyPreset}
      />

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Save to Library</h3>
            <p className="text-sm text-zinc-400">Save this ASCII generation to your personal gallery.</p>
            <input
              type="text"
              placeholder="Name your creation..."
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded px-4 py-3 text-white focus:border-green-500 focus:outline-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowSaveModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => handleSaveToLibrary(saveName)} disabled={!saveName.trim()}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
