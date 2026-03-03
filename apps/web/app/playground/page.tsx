'use client';

import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Image as ImageIcon, Film, FileText, Code, Check, Video, LayoutList, Pipette, UploadCloud } from 'lucide-react';
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
import { getInterpolatedValue } from '../../utils/interpolation';

import { Layer, LayerOptions } from '../../types/layer';
import { useAudioAnalyzer, AudioMetrics } from '../../hooks/useAudioAnalyzer';
import { AudioControlPanel } from '../../components/playground/AudioControlPanel';
import { useScreenRecorder } from '../../hooks/useScreenRecorder';
import { useAsciiCanvasRenderer } from '../../hooks/useAsciiCanvasRenderer';
import { CompositionCanvas } from '../../components/playground/CompositionCanvas';
import { Timeline } from '../../components/playground/Timeline';
import { NodeEditor } from '../../components/playground/NodeEditor';
import { useNodeGraph } from '../../hooks/useNodeGraph';
import html2canvas from 'html2canvas';
import { useGifExport } from '../../hooks/useGifExport';
import { downloadReactComponent } from '../../utils/exportReactComponent';

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
    addKeyframe,
    removeKeyframe,
    updateKeyframe,
    undo, redo, canUndo, canRedo
  } = useLayers();

  // Node Graph Hook
  const nodeGraph = useNodeGraph();
  const [bottomPanel, setBottomPanel] = useState<'timeline' | 'nodes'>('timeline');
  const [nodeEvalValues, setNodeEvalValues] = useState<Record<string, any>>({});

  // Animation State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDirection, setPlayDirection] = useState<'forward' | 'backward'>('forward');
  const [loopMode, setLoopMode] = useState<'none' | 'loop' | 'ping-pong'>('loop');
  const [currentTime, setCurrentTime] = useState(0); // in seconds
  const [maxDuration, setMaxDuration] = useState(5); // in seconds
  const [autoKeyframe, setAutoKeyframe] = useState(false); // Auto-record keyframes mode
  const globalFrameCount = Math.floor(currentTime * 24); // Derived at 24fps for standard sync
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

  const [globalEffects, setGlobalEffects] = useState({
    enable3D: false,
    depthOffset: 40,
    bloom: false,
    bloomRadius: 8,
    chromaticAberration: false,
    aberrationOffset: 4,
    crtScanlines: false,
    scanlineWidth: 4,
    scanlineOpacity: 0.2,
    vignette: false,
    vignetteIntensity: 0.8,
    vignetteSize: 40,
    fluidDynamics: false,
    fluidForce: 8,
    fluidRadius: 40,
    fluidViscosity: 0.95
  });

  // --- SEAMLESS RECORDER (Canvas) ---
  const { stream: canvasStream } = useAsciiCanvasRenderer({
    layers,
    width: 800,
    height: 600,
    globalFrameCount,
    currentTime,
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
    let lastFrameTime = performance.now();
    const fps = activeLayer?.options?.videoFps || 12;
    const interval = 1000 / fps;

    const loop = () => {
      const now = performance.now();
      const delta = now - lastTime;
      const deltaSec = delta / 1000;
      const frameDelta = now - lastFrameTime;

      // Update Playhead Time (Keyframing Engine)
      setCurrentTime(prev => {
        if (playDirection === 'forward') {
          const nextTime = prev + deltaSec;
          if (nextTime > maxDuration) {
            if (loopMode === 'loop') return 0; // Loop back to start
            if (loopMode === 'ping-pong') {
              setPlayDirection('backward');
              return maxDuration;
            }
            setIsPlaying(false); // Stop at end
            return maxDuration;
          }
          return nextTime;
        } else {
          // Backward
          const nextTime = prev - deltaSec;
          if (nextTime < 0) {
            if (loopMode === 'loop') return maxDuration; // Loop back to end
            if (loopMode === 'ping-pong') {
              setPlayDirection('forward');
              return 0;
            }
            setIsPlaying(false); // Stop at start
            return 0;
          }
          return nextTime;
        }
      });

      // Update ASCII Frame Count
      if (frameDelta >= interval) {
        lastFrameTime = now;
      }

      lastTime = now;

      // Update Audio Metrics (High FPS)
      if (audioAnalyzer.isListening) {
        setAudioMetrics(audioAnalyzer.getAudioMetrics());
      }

      // Evaluate Node Graph
      if (nodeGraph.graph.nodes.length > 0) {
        const evaluated = nodeGraph.evaluate({
          currentTime: performance.now() / 1000,
          maxDuration,
          globalFrameCount,
          audioMetrics: audioAnalyzer.isListening ? audioAnalyzer.getAudioMetrics() : undefined,
        });
        setNodeEvalValues(evaluated);
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current!);
  }, [isPlaying, playDirection, loopMode, audioAnalyzer.isListening, activeLayer?.options?.videoFps]);

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
  const [showGlobalEffects, setShowGlobalEffects] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Access options from active layer or default to empty object to prevent crashes
  // We use a helper to get safe options
  const options = activeLayer?.options || {} as any; // Safe fallback?

  // Helper to safely update options
  const setOptions = useCallback((updater: (prev: LayerOptions) => LayerOptions) => {
    if (!activeLayerId || !activeLayer) return;
    const newOptions = updater(activeLayer.options);
    updateLayerOptions(activeLayerId, newOptions);
  }, [activeLayer, activeLayerId, updateLayerOptions]);

  /**
   * Smart animated property change handler.
   * When auto-keyframe mode is ON, it records a keyframe at the current time
   * instead of (or in addition to) updating the base layer property.
   * When OFF, it only auto-records if the property track already has keyframes.
   */
  const handleAnimatedPropChange = useCallback((
    propertyPath: string, // e.g. 'transform.x', 'options.color'
    value: any,
    baseUpdater: () => void // The normal updater (updateLayerTransform / updateLayerOptions)
  ) => {
    if (!activeLayerId || !activeLayer) return;
    const tracks = activeLayer.animationTracks || [];
    const trackExists = tracks.some(t => t.property === propertyPath);
    // Record keyframe if auto-mode is on OR the track already has keyframes
    if (autoKeyframe || trackExists) {
      addKeyframe(activeLayerId, propertyPath, currentTime, value);
    }
    // Always update the base property too so it's reflected immediately
    baseUpdater();
  }, [activeLayerId, activeLayer, autoKeyframe, currentTime, addKeyframe]);

  // --- DYNAMIC CHARSET GENERATOR ---
  const generateDensityCharset = useCallback((text: string) => {
    const uniqueChars = Array.from(new Set(text.split('')));
    if (uniqueChars.length < 2) {
      toast('Not enough unique characters to sort', 'error');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.font = '20px monospace';
    // Use strict letter spacing in case of proportional fonts, though we force monospace
    ctx.textBaseline = 'top';

    const measured = uniqueChars.map(char => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 20, 20);
      ctx.fillStyle = 'black';
      ctx.fillText(char, 2, 2);

      const imgData = ctx.getImageData(0, 0, 20, 20).data;
      let darkPixels = 0;
      for (let i = 0; i < imgData.length; i += 4) {
        if (imgData[i] < 128) darkPixels++;
      }
      return { char, density: darkPixels };
    });

    measured.sort((a, b) => a.density - b.density);
    const sortedCharset = measured.map(m => m.char).join('');

    // Always insert a space at the start for proper shadow/black mapping
    const finalCharset = sortedCharset.startsWith(' ') ? sortedCharset : ' ' + sortedCharset.replace(' ', '');
    setOptions(p => ({ ...p, charset: finalCharset }));
    toast(`Charset sorted by density!`, 'success');
  }, [setOptions, toast]);

  // Helper destructuring for active layer options
  const {
    width, inverted, videoFps, charset, color, customColor, fontSize, bgTheme,
    removeBackground, transparentColor, colorTolerance, colorMode, renderMode,
    posterize, clahe, frameDiff, dither, palette, sharpen, blur, noise, overlayText, depthMode, edgeThreshold
  } = options as LayerOptions || {}; // Fallback to empty

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingFile(false); };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      const isModel = f.name.toLowerCase().endsWith('.obj') || f.name.toLowerCase().endsWith('.glb') || f.name.toLowerCase().endsWith('.gltf');
      const isVideoExt = /\.(mp4|webm|avi|mov|mkv|gif)$/i.test(f.name);
      const extType = isModel ? 'model' : (f.type.startsWith('video/') || isVideoExt ? 'video' : 'image');

      // Add as new layer or update current?
      // UX Decision: If current layer is empty (no file), update it. Else add new.
      if (activeLayer && !activeLayer.file) {
        updateLayer(activeLayer.id, {
          file: f,
          name: f.name,
          previewUrl: isModel ? null : URL.createObjectURL(f),
          type: extType
        });
      } else {
        addLayer(f);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      const isModel = f.name.toLowerCase().endsWith('.obj') || f.name.toLowerCase().endsWith('.glb') || f.name.toLowerCase().endsWith('.gltf');
      const isVideoExt = /\.(mp4|webm|avi|mov|mkv|gif)$/i.test(f.name);
      const extType = isModel ? 'model' : (f.type.startsWith('video/') || isVideoExt ? 'video' : 'image');

      if (activeLayer) {
        // Update current layer
        updateLayer(activeLayer.id, {
          file: f,
          name: f.name,
          previewUrl: isModel ? null : URL.createObjectURL(f),
          type: extType,
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

    if (renderMode === 'edge' && edgeThreshold !== undefined) {
      formData.append('edgeThreshold', edgeThreshold.toString());
    }

    if (renderMode === 'kinetic' && overlayText) {
      formData.append('overlayText', overlayText);
    }

    // Check for video or gif
    const isVideoExt = /\.(mp4|webm|avi|mov|mkv|gif)$/i.test(activeLayer.file.name);
    const isVideo = activeLayer.file.type.startsWith('video/') || isVideoExt;
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
            backgroundColor: bgTheme.bg === 'transparent' ? '#000000' : bgTheme.bg,
            width: 1920,
            height: 1080
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
          width: 1920, // High fidelity 1080p export
          height: 1080,
          backgroundColor: options.bgTheme?.bg === 'transparent' ? '#000000' : (options.bgTheme?.bg || '#000000'),
          fps: Number(options.videoFps) || 12, // Use global video FPS
          // Let the backend dynamically calculate max duration based on layers
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
    <div className="h-screen w-full pt-16 bg-[#000000] text-text-primary overflow-hidden flex flex-col font-sans">

      <main className="flex-1 flex overflow-hidden">
        {/* ─── Controls Panel (Left Sidebar) ─── */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="w-96 lg:w-[400px] flex flex-col border-r border-white/[0.05] bg-[#000000] shrink-0 z-10"
        >
          {/* Header & Generate Button */}
          <div className="h-14 border-b border-white/[0.05] shrink-0 flex items-center justify-between px-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
              <LayoutList size={12} /> Workstation
            </span>
            <Button onClick={generate} disabled={!activeLayer.file || loading} isLoading={loading} className="h-7 px-4 text-[10px] font-bold tracking-[0.1em] shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all bg-white text-black hover:bg-white/90 rounded-sm">
              {loading ? '...' : 'GENERATE'}
            </Button>
          </div>
          {loading && (
            <div className="px-4 py-2 border-b border-white/[0.05] bg-black">
              <div className="h-1 bg-surface-active rounded-full overflow-hidden mb-1">
                <div className="h-full bg-white transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex justify-between items-center text-[9px] font-mono text-text-muted">
                <span>PIPELINE</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}

          <motion.div variants={container} className="flex-1 overflow-y-auto custom-scrollbar">



            {/* LAYERS MANAGER */}
            <motion.div variants={item} className="p-4 border-b border-white/[0.05]">
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
            <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Source</h3>
                  <span className="text-[9px] text-text-secondary truncate max-w-[100px]">{activeLayer.name}</span>
                </div>
                <div className="flex gap-1 bg-black rounded p-0.5 border border-border">
                  <button onClick={() => updateLayer(activeLayer.id, { type: 'image' })} className={clsx('px-2 py-1 rounded text-[9px] uppercase transition-colors', activeLayer.type !== 'text' ? 'bg-surface-active text-text-primary' : 'text-text-muted hover:text-text-primary')}>Media</button>
                  <button onClick={() => updateLayer(activeLayer.id, { type: 'text' })} className={clsx('px-2 py-1 rounded text-[9px] uppercase transition-colors', activeLayer.type === 'text' ? 'bg-surface-active text-text-primary' : 'text-text-muted hover:text-text-primary')}>Text</button>
                </div>
              </div>

              {activeLayer.type === 'text' ? (
                <div className="space-y-3">
                  <textarea
                    value={options.overlayText || ''}
                    onChange={(e) => setOptions(p => ({ ...p, overlayText: e.target.value }))}
                    placeholder="TYPE MASSIVE TEXT HERE..."
                    className="w-full h-32 bg-black border border-border rounded p-3 text-text-primary resize-none font-mono text-sm focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                  />
                  <div className="text-[10px] text-text-muted leading-tight">
                    <span className="text-accent-primary font-bold">PRO TIP:</span> Use this text layer as a <strong className="text-text-secondary">Clipping Mask</strong> over a video by setting its Blend Mode to "Multiply" in the Transform panel, and moving the text layer to the top.
                  </div>
                </div>
              ) : (
                <div
                  className={`relative group transition-all duration-200 ${isDraggingFile ? 'scale-[1.01]' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input type="file" accept="image/*,video/*,.obj,.gltf,.glb" onChange={handleFileChange}
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
                      <div className={clsx("text-[10px] flex flex-col items-center gap-2", isDraggingFile ? 'text-accent-success' : 'text-text-muted transition-colors group-hover:text-text-secondary')}>
                        <div className={clsx("p-2 rounded-full bg-white/[0.02] group-hover:bg-white/[0.05] transition-colors", isDraggingFile && "animate-bounce bg-accent-success/20 text-accent-success")}>
                          <UploadCloud size={20} />
                        </div>
                        <span className="font-bold tracking-widest uppercase">{isDraggingFile ? 'DROP IT HERE' : 'DROP MEDIA OR 3D MODEL'}</span>
                        <span className="text-[9px] font-normal opacity-70">.obj, .gltf, .glb, image, video</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeLayer.previewUrl && activeLayer.file && (
                <div className="mt-3 rounded-lg overflow-hidden border border-border bg-black">
                  {activeLayer.type === 'video' ? (
                    <video src={activeLayer.previewUrl} className="w-full max-h-48 object-contain" autoPlay loop muted playsInline />
                  ) : (
                    <img src={activeLayer.previewUrl} alt="Source preview" className="w-full max-h-48 object-contain" />
                  )}
                </div>
              )}
            </motion.div>

            {/* MODEL CONTROLS — shown only for 3D model layers */}
            {activeLayer.type === 'model' && activeLayer.file && (
              <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-accent-primary uppercase tracking-widest">3D ASCII Point Cloud</h3>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent-primary/20 text-accent-primary">NEW</span>
                </div>

                {/* Mode toggle */}
                <div className="space-y-2">
                  <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold">Render Mode</label>
                  <div className="flex gap-1 bg-black rounded p-0.5 border border-border">
                    <button
                      onClick={() => setOptions(p => ({ ...p, modelRenderMode: 'ascii-point-cloud' }))}
                      className={clsx('flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-colors',
                        (options.modelRenderMode ?? 'ascii-point-cloud') === 'ascii-point-cloud'
                          ? 'bg-accent-primary text-black'
                          : 'text-text-muted hover:text-text-primary')}
                    >
                      ASCII Point Cloud
                    </button>
                    <button
                      onClick={() => setOptions(p => ({ ...p, modelRenderMode: 'viewport' }))}
                      className={clsx('flex-1 px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-colors',
                        options.modelRenderMode === 'viewport'
                          ? 'bg-surface-active text-text-primary'
                          : 'text-text-muted hover:text-text-primary')}
                    >
                      3D Viewport
                    </button>
                  </div>
                </div>

                {(options.modelRenderMode ?? 'ascii-point-cloud') === 'ascii-point-cloud' && (
                  <>
                    {/* Auto-rotate */}
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-[10px] text-text-muted uppercase tracking-wider font-bold">Auto-Rotate</div>
                        <div className="text-[9px] text-text-secondary">Drag canvas to rotate manually</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={options.modelAutoRotate ?? true}
                        onChange={(e) => setOptions(p => ({ ...p, modelAutoRotate: e.target.checked }))}
                        className="w-4 h-4 rounded bg-black border-border accent-accent-primary cursor-pointer"
                      />
                    </div>

                    {/* Charset for point cloud */}
                    <div className="space-y-1">
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold">Character Density Map</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={options.charset || ' .:-=+*#%@'}
                          onChange={(e) => setOptions(p => ({ ...p, charset: e.target.value }))}
                          className="flex-1 bg-black border border-border rounded px-2 py-1 text-xs text-text-primary font-mono focus:border-accent-primary transition-colors"
                        />
                      </div>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {[
                          { label: 'Classic', value: ' .:-=+*#%@' },
                          { label: 'Matrix', value: ' ░▒▓█' },
                          { label: 'Binary', value: ' 01' },
                          { label: 'Braille', value: '⣀⣄⣤⣦⣶⣷⣿' },
                        ].map(p => (
                          <button key={p.label}
                            onClick={() => setOptions(opt => ({ ...opt, charset: p.value }))}
                            className="text-[9px] px-2 py-0.5 border border-border rounded hover:border-accent-primary hover:text-accent-primary text-text-muted transition-colors"
                          >{p.label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Font size */}
                    <Slider
                      label="Point Density (Font Size)"
                      value={options.fontSize || 10}
                      min={4}
                      max={24}
                      step={1}
                      onChange={(v) => setOptions(p => ({ ...p, fontSize: v }))}
                      valueDisplay={`${options.fontSize || 10}px`}
                    />

                    {/* Color */}
                    <div className="space-y-2">
                      <label className="block text-[10px] text-text-muted uppercase tracking-wider font-bold">Point Color</label>
                      <div className="flex gap-2 h-9">
                        <div className="relative flex-1 rounded border border-border overflow-hidden">
                          <input
                            type="color"
                            value={options.color || '#00ff00'}
                            onChange={(e) => setOptions(p => ({ ...p, color: e.target.value }))}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                          />
                          <div className="w-full h-full flex items-center justify-center" style={{ background: options.color || '#00ff00' }}>
                            <span className="text-xs font-mono font-bold mix-blend-difference text-white pointer-events-none">{options.color || '#00ff00'}</span>
                          </div>
                        </div>
                        {['#00ff00', '#00ffff', '#ff6ec7', '#ffb000', '#ffffff'].map(c => (
                          <button key={c}
                            onClick={() => setOptions(p => ({ ...p, color: c }))}
                            className={clsx('w-9 h-9 rounded border transition-all', options.color === c ? 'border-2 border-white scale-110' : 'border-border hover:border-white/50')}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-1 text-[10px] text-text-muted border-t border-border/50">
                  <span className="text-accent-primary font-bold">TIP:</span> Drag the canvas to rotate. Each vertex is lit by surface normals — bright faces = dense chars.
                </div>
              </motion.div>
            )}


            {/* SECTION 2: ENGINE */}
            {['image', 'video'].includes(activeLayer.type) && (
              <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Generative Engine</h3>

                <div>
                  <label className="block text-xs text-text-muted mb-3 uppercase tracking-wider font-bold">Render Algorithm</label>
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { value: 'standard' as const, label: 'Mode', icon: 'Aa' },
                      { value: 'braille' as const, label: 'Dots', icon: '⣿' },
                      { value: 'halfblock' as const, label: 'Pixel', icon: '▄▀' },
                      { value: 'edge' as const, label: 'Edge', icon: '╱╲' },
                      { value: 'silhouette' as const, label: 'Cutout', icon: '◐' },
                      { value: 'kinetic' as const, label: 'Kinetic', icon: '3D' },
                      { value: 'halftone' as const, label: 'Halftone', icon: '◉' },
                      { value: 'matrix' as const, label: 'Matrix', icon: '雨' },
                      { value: 'crosshatch' as const, label: 'Hatch', icon: '╳' },
                      { value: 'mosaic' as const, label: 'Mosaic', icon: '◆' },
                      { value: 'outline' as const, label: 'Outline', icon: '◻' },
                      { value: 'stipple' as const, label: 'Stipple', icon: '∴' },
                    ].map(mode => (
                      <button key={mode.value} onClick={() => setOptions(p => ({ ...p, renderMode: mode.value }))}
                        className={clsx(
                          "flex flex-col items-center py-2 rounded border transition-all cursor-pointer min-w-0 px-0.5",
                          renderMode === mode.value
                            ? 'border-accent-success bg-accent-success/5 text-text-primary shadow-[0_0_10px_rgba(34,197,94,0.1)]'
                            : 'border-surface bg-surface/50 hover:border-border hover:bg-surface text-text-muted hover:text-text-secondary'
                        )}>
                        <div className="text-sm">{mode.icon}</div>
                        <div className="text-[8px] font-bold uppercase tracking-tight leading-none mt-1 w-full truncate text-center">{mode.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-5 border-t border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Character Set</label>
                    <div className="flex gap-3">
                      <button onClick={() => setOptions(p => ({ ...p, charset: " .:-=+*#%@" }))} className="text-[10px] font-bold text-text-muted hover:text-accent-primary uppercase tracking-wider cursor-pointer">Standard</button>
                      <button onClick={() => setOptions(p => ({ ...p, charset: " ░▒▓█" }))} className="text-[10px] font-bold text-text-muted hover:text-accent-primary uppercase tracking-wider cursor-pointer">Blocks</button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={options.charset || ''}
                      onChange={(e) => setOptions(p => ({ ...p, charset: e.target.value }))}
                      placeholder="Type chars to use..."
                      className="flex-1 bg-black border border-border rounded px-3 py-2 text-sm text-text-primary font-mono focus:border-accent-primary transition-colors"
                    />
                    <Button variant="secondary" size="sm" onClick={() => generateDensityCharset(options.charset || '')} className="px-4" title="Auto-sort characters by visual density">
                      Sort Density
                    </Button>
                  </div>
                </div>

                <div className="space-y-5 pt-5 border-t border-border">
                  {renderMode === 'kinetic' && (
                    <div className="space-y-2">
                      <label className="text-xs text-accent-primary uppercase tracking-wider font-bold">Kinetic Input Word</label>
                      <input
                        type="text"
                        value={options.overlayText || ''}
                        onChange={(e) => setOptions(p => ({ ...p, overlayText: e.target.value.toUpperCase() }))}
                        placeholder="E.g. FUTURE"
                        className="w-full bg-black border border-border rounded px-3 py-2 text-sm text-text-primary font-mono focus:border-accent-primary transition-colors"
                      />
                      <div className="text-[11px] text-text-muted mt-1">Words map brightness to 3D Z-depth and scale.</div>
                    </div>
                  )}
                  {renderMode === 'edge' && (
                    <Slider label="Edge Sensitivity" value={options.edgeThreshold || 30} min={5} max={100} onChange={(v) => setOptions(p => ({ ...p, edgeThreshold: v }))} valueDisplay={`${options.edgeThreshold || 30}`} />
                  )}
                  {(activeLayer?.file?.type.startsWith('image/') || renderMode === 'kinetic') && (
                    <Slider label="Output Width" value={width} min={20} max={300} onChange={(v) => setOptions(p => ({ ...p, width: v }))} valueDisplay={`${width} CH`} />
                  )}
                  {(activeLayer.file?.type.startsWith('video/') || activeLayer.file?.name.toLowerCase().endsWith('.gif')) && (
                    <Slider label="Motion FPS" value={videoFps || 12} min={1} max={30} onChange={(v) => setOptions(p => ({ ...p, videoFps: v }))} valueDisplay={`${videoFps} FPS`} />
                  )}
                </div>
              </motion.div>
            )}

            {/* SECTION 3: STYLE */}
            <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Style</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowPresetLibrary(true)} className="h-6 px-3 text-[10px] font-bold border border-border hover:border-accent-primary hover:text-accent-primary">
                  LIBRARY
                </Button>
              </div>

              {/* Background Theme */}
              <div className="space-y-3">
                <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Canvas Background</label>
                <div className="grid grid-cols-2 gap-3">
                  {BG_THEMES.map(theme => (
                    <button
                      key={theme.label}
                      onClick={() => setOptions(p => ({ ...p, bgTheme: theme }))}
                      className={clsx(
                        "py-2 px-3 rounded text-xs font-bold truncate transition-colors cursor-pointer text-center",
                        options.bgTheme?.label === theme.label
                          ? "border-2 border-accent-success text-white bg-surface-active"
                          : "border border-border text-text-muted hover:border-border-hover hover:text-text-primary bg-black"
                      )}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Palette & Color Group */}
              <div className="space-y-5 border-t border-border pt-5">
                {/* Real-time Color Control */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center cursor-pointer group" onClick={() => setOptions(p => ({ ...p, colorMode: !p.colorMode }))}>
                    <div className="flex flex-col">
                      <label className="text-xs text-text-muted uppercase tracking-wider font-bold cursor-pointer group-hover:text-text-primary transition-colors">Extract Original Colors</label>
                      <span className="text-[11px] text-text-secondary mt-0.5 pointer-events-none">Use source image pixel colors</span>
                    </div>
                    <input type="checkbox" checked={options.colorMode || false} readOnly
                      className="rounded flex-shrink-0 w-4 h-4 bg-black border-border cursor-pointer text-accent-success focus:ring-0 focus:ring-offset-0" />
                  </div>

                  {(!options.colorMode) && (
                    <div className="space-y-3 pt-2">
                      <label className="text-xs text-text-muted uppercase tracking-wider font-bold">Solid Color Override</label>
                      <div className="flex gap-3 h-10">
                        {/* Color Picker & Eyedropper Group */}
                        <div className="flex flex-1 rounded border border-border group-hover:border-border-hover shadow-sm overflow-hidden transition-colors">
                          {/* Native Picker */}
                          <div className="relative flex-1 group/picker focus-within:ring-2 focus-within:ring-accent-primary">
                            <input
                              type="color"
                              value={options.color || '#ffffff'}
                              onChange={(e) => replaceLayerOptions(activeLayer.id, { color: e.target.value, customColor: e.target.value, palette: undefined })}
                              onBlur={(e) => updateLayerOptions(activeLayer.id, { color: e.target.value })}
                              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                            />
                            <div className="w-full h-full flex items-center justify-center transition-colors shadow-inner"
                              style={{ backgroundColor: getInterpolatedValue(activeLayer.animationTracks || [], 'options.color', currentTime, options.color || '#ffffff') }}
                            >
                              <span className="text-xs font-mono font-bold mix-blend-difference text-white/90 drop-shadow-md pointer-events-none">{getInterpolatedValue(activeLayer.animationTracks || [], 'options.color', currentTime, options.color || '#ffffff')}</span>
                            </div>
                          </div>
                          {/* Eyedropper Button */}
                          <button
                            onClick={async () => {
                              try {
                                if ('EyeDropper' in window) {
                                  const eyeDropper = new (window as any).EyeDropper();
                                  const result = await eyeDropper.open();
                                  replaceLayerOptions(activeLayer.id, { color: result.sRGBHex, customColor: result.sRGBHex, palette: undefined });
                                  updateLayerOptions(activeLayer.id, { color: result.sRGBHex });
                                } else {
                                  alert('Color picker not supported in this browser.');
                                }
                              } catch (e) {
                                // User canceled eyedropper
                              }
                            }}
                            className="w-10 flex items-center justify-center bg-surface hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors border-l border-border"
                            title="Pick color from screen"
                          >
                            <Pipette size={16} />
                          </button>
                        </div>

                        {/* Quick Swatches */}
                        <div className="flex gap-2 isolate">
                          {COLOR_PRESETS.slice(0, 4).map(c => (
                            <button
                              key={c.value}
                              onClick={() => setOptions(p => ({ ...p, color: c.value, customColor: c.value, palette: undefined }))}
                              className={clsx("w-10 h-10 rounded border transition-all cursor-pointer shadow-sm relative", options.color === c.value ? 'border-2 border-white scale-110 z-10' : 'border-border hover:border-white/50 hover:scale-105')}
                              style={{ backgroundColor: c.value }}
                              title={c.label}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5 pt-4 border-t border-border">
                <Slider
                  label="Font Size"
                  value={getInterpolatedValue(activeLayer.animationTracks || [], 'options.fontSize', currentTime, fontSize || (activeLayer.type === 'text' || options.renderMode === 'kinetic' ? 120 : 8))}
                  min={activeLayer.type === 'text' || options.renderMode === 'kinetic' ? 10 : 4}
                  max={activeLayer.type === 'text' || options.renderMode === 'kinetic' ? 400 : 30}
                  onChange={(v) => handleAnimatedPropChange('options.fontSize', v, () => setOptions(p => ({ ...p, fontSize: v })))}
                  valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'options.fontSize', currentTime, fontSize || (activeLayer.type === 'text' || options.renderMode === 'kinetic' ? 120 : 8)))}px`}
                />
              </div>
            </motion.div>

            {/* TRANSFORM CONTROL (New) */}
            <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-4">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Transform</h3>
              <div className="grid grid-cols-2 gap-4">
                <Slider label="Position X" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.x', currentTime, activeLayer.transform.x)} min={-400} max={400} step={1}
                  onChange={(v) => handleAnimatedPropChange('transform.x', v, () => updateLayerTransform(activeLayer.id, { x: v }))}
                  valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'transform.x', currentTime, activeLayer.transform.x))}px`}
                />
                <Slider label="Position Y" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.y', currentTime, activeLayer.transform.y)} min={-300} max={300} step={1}
                  onChange={(v) => handleAnimatedPropChange('transform.y', v, () => updateLayerTransform(activeLayer.id, { y: v }))}
                  valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'transform.y', currentTime, activeLayer.transform.y))}px`}
                />
                <div className="col-span-2 flex justify-end">
                  <button onClick={() => updateLayerTransform(activeLayer.id, { x: 0, y: 0 })} className="text-[9px] text-text-muted hover:text-text-primary uppercase tracking-wider">Reset Position</button>
                </div>

                <Slider label="Opacity" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.opacity', currentTime, activeLayer.transform.opacity)} min={0} max={1} step={0.01}
                  onChange={(v) => handleAnimatedPropChange('transform.opacity', v, () => updateLayerTransform(activeLayer.id, { opacity: v }))}
                  valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'transform.opacity', currentTime, activeLayer.transform.opacity) * 100)}%`}
                />
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Slider label="Scale" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.scale', currentTime, activeLayer.transform.scale)} min={0.1} max={3} step={0.1}
                      onChange={(v) => handleAnimatedPropChange('transform.scale', v, () => updateLayerTransform(activeLayer.id, { scale: v }))}
                      valueDisplay={`${getInterpolatedValue(activeLayer.animationTracks || [], 'transform.scale', currentTime, activeLayer.transform.scale).toFixed(1)}x`}
                    />
                  </div>
                  <div className="flex gap-1 mb-1">
                    <button onClick={() => handleFitToCanvas(false)} title="Fit to Canvas" className="px-2 py-1 bg-surface border border-border rounded text-[9px] uppercase hover:bg-surface-hover text-text-muted hover:text-text-primary">Fit</button>
                    <button onClick={() => handleFitToCanvas(true)} title="Cover Canvas" className="px-2 py-1 bg-surface border border-border rounded text-[9px] uppercase hover:bg-surface-hover text-text-muted hover:text-text-primary">Cover</button>
                  </div>
                </div>
                <Slider label="Rotation" value={getInterpolatedValue(activeLayer.animationTracks || [], 'transform.rotation', currentTime, activeLayer.transform.rotation)} min={0} max={360} step={1}
                  onChange={(v) => handleAnimatedPropChange('transform.rotation', v, () => updateLayerTransform(activeLayer.id, { rotation: v }))}
                  valueDisplay={`${Math.round(getInterpolatedValue(activeLayer.animationTracks || [], 'transform.rotation', currentTime, activeLayer.transform.rotation))}°`}
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
            </motion.div>

            {/* AUDIO CONTROL */}
            <motion.div variants={item} className="p-4 border-b border-white/[0.05] space-y-4">
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
            </motion.div>

            {/* SECTION 4: EFFECTS */}
            <motion.div variants={item} className="border-b border-white/[0.05]">
              <div className="p-0 overflow-hidden card-hover-animation">
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
              </div>
            </motion.div>

            {/* SECTION 5: GLOBAL EFFECTS */}
            <motion.div variants={item} className="border-b border-white/[0.05]">
              <div className="p-0 overflow-hidden card-hover-animation pb-2">
                <button onClick={() => setShowGlobalEffects(!showGlobalEffects)}
                  className="w-full px-5 py-4 flex items-center justify-between text-text-muted hover:text-text-primary transition-colors bg-surface-active/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest">5. Cinematic Effects</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary text-[8px] font-mono">GLOBAL</span>
                  </div>
                  <span className="text-xs">{showGlobalEffects ? '▲' : '▼'}</span>
                </button>

                {showGlobalEffects && (
                  <div className="p-5 space-y-4 border-t border-border">
                    <div className="space-y-3">
                      {[
                        {
                          id: 'enable3D', label: 'Interactive 3D Hologram', desc: 'Tilt composition with mouse depth',
                          controls: [{ id: 'depthOffset', label: 'Z-Depth Pop', min: 10, max: 150, step: 5 }]
                        },
                        {
                          id: 'chromaticAberration', label: 'RGB Aberration', desc: 'Cinematic color channel splitting',
                          controls: [{ id: 'aberrationOffset', label: 'Split Distance', min: 1, max: 20, step: 1 }]
                        },
                        {
                          id: 'bloom', label: 'Phosphor Bloom', desc: 'Glowing aura for bright characters',
                          controls: [{ id: 'bloomRadius', label: 'Glow Radius', min: 2, max: 30, step: 1 }]
                        },
                        {
                          id: 'crtScanlines', label: 'CRT Scanlines', desc: 'Vintage monitor interference',
                          controls: [
                            { id: 'scanlineWidth', label: 'Line Width', min: 1, max: 10, step: 1 },
                            { id: 'scanlineOpacity', label: 'Opacity', min: 0.05, max: 0.8, step: 0.05 }
                          ]
                        },
                        {
                          id: 'vignette', label: 'Lens Vignette', desc: 'Darkened screen edges',
                          controls: [
                            { id: 'vignetteSize', label: 'Clear Center Size', min: 10, max: 100, step: 5 },
                            { id: 'vignetteIntensity', label: 'Darkness', min: 0.1, max: 1, step: 0.1 }
                          ]
                        },
                        {
                          id: 'fluidDynamics', label: 'Interactive Fluid Dynamics', desc: 'Liquid displacement mapped to mouse',
                          controls: [
                            { id: 'fluidForce', label: 'Push Force', min: 1, max: 20, step: 1 },
                            { id: 'fluidRadius', label: 'Ripple Radius', min: 10, max: 100, step: 5 },
                            { id: 'fluidViscosity', label: 'Viscosity (Settle Time)', min: 0.7, max: 0.99, step: 0.01 }
                          ]
                        },
                      ].map(effect => (
                        <div key={effect.id} className="flex flex-col rounded-lg bg-surface/30 border border-border/50 hover:border-border transition-colors overflow-hidden">
                          <div className="flex items-center justify-between p-3">
                            <div>
                              <div className="text-[10px] text-text-primary uppercase tracking-tight font-bold">{effect.label}</div>
                              <div className="text-[9px] text-text-muted mt-0.5">{effect.desc}</div>
                            </div>
                            <input
                              type="checkbox"
                              checked={globalEffects[effect.id as keyof typeof globalEffects] as boolean}
                              onChange={(e) => setGlobalEffects(p => ({ ...p, [effect.id]: e.target.checked }))}
                              className="rounded-sm bg-black border-border text-accent-primary focus:ring-0 w-4 h-4 cursor-pointer"
                            />
                          </div>

                          {/* Render Sliders if active */}
                          {globalEffects[effect.id as keyof typeof globalEffects] && effect.controls && (
                            <div className="p-3 pt-0 border-t border-border/30 bg-black/20 space-y-3 mt-2">
                              {effect.controls.map(ctrl => (
                                <Slider
                                  key={ctrl.id}
                                  label={ctrl.label}
                                  value={globalEffects[ctrl.id as keyof typeof globalEffects] as number}
                                  min={ctrl.min}
                                  max={ctrl.max}
                                  step={ctrl.step}
                                  onChange={(v) => setGlobalEffects(p => ({ ...p, [ctrl.id]: v }))}
                                  valueDisplay={globalEffects[ctrl.id as keyof typeof globalEffects].toString()}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* ─── Preview Panel (Right Split) ─── */}
        <motion.div
          variants={item} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col bg-[#020202] relative min-w-0"
        >
          {/* Top Toolbar */}
          <div className="h-14 border-b border-white/[0.05] bg-[#000000] shrink-0 flex items-center justify-between px-4 z-20">
            <div className="flex gap-2">
              <div className="text-[10px] font-mono text-text-muted px-2 py-1 rounded">
                COMPOSITION PREVIEW
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 text-accent-danger animate-pulse border border-accent-danger/30 px-3 py-1 rounded">
                  <div className="w-2 h-2 rounded-full bg-accent-danger" />
                  <span className="text-[10px] uppercase font-bold tracking-widest">
                    REC {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <div className="flex bg-zinc-900/50 rounded-sm p-0.5 border border-white/5 items-center">
                <button onClick={downloadShareCard} className="px-2 py-1 text-[10px] flex items-center gap-1.5 font-bold text-text-muted hover:text-white hover:bg-surface-active rounded transition-colors" title="Export Composite as PNG"><ImageIcon size={12} /> PNG</button>
                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                <button onClick={() => downloadMp4(false)} className="px-2 py-1 text-[10px] flex items-center gap-1.5 font-bold text-text-muted hover:text-white hover:bg-surface-active rounded transition-colors" title="Export Composite as MP4"><Film size={12} /> MP4</button>
                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                <button onClick={() => exportGif()} disabled={isGifExporting} className="px-2 py-1 text-[10px] flex items-center gap-1.5 font-bold text-text-muted hover:text-white hover:bg-surface-active rounded transition-colors" title="Export Composite as GIF">
                  <Video size={12} /> GIF {isGifExporting && <span className="text-accent-success animate-pulse ml-1">{Math.round(gifProgress)}%</span>}
                </button>
                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                <button onClick={downloadTxt} className="px-2 py-1 text-[10px] flex items-center gap-1.5 font-bold text-text-muted hover:text-white hover:bg-surface-active rounded transition-colors" title="Export Active Layer as TXT"><FileText size={12} /> TXT</button>
                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                <button onClick={downloadHtml} className="px-2 py-1 text-[10px] flex items-center gap-1.5 font-bold text-text-muted hover:text-white hover:bg-surface-active rounded transition-colors" title="Export Active Layer as HTML"><Code size={12} /> HTML</button>
                <div className="w-[1px] h-3 bg-white/10 mx-0.5" />
                <button onClick={() => downloadReactComponent(layers, maxDuration, { backgroundColor: activeLayer?.options.bgTheme?.bg || '#000000', fps: 24 })} className="px-2 py-1 text-[10px] flex items-center gap-1.5 font-bold text-white hover:bg-surface-active rounded transition-colors" title="Export Animated React Component (.tsx) with keyframes baked in"><Code size={12} /> JSX</button>
              </div>

              {activeLayer && activeLayer.frames.length > 0 && (
                <div className="flex items-center ml-1">
                  <GistManager
                    content={activeLayer.frames.join('\n\n--- FRAME BREAK ---\n\n')}
                    filename={`art-${Date.now()}.txt`}
                    className="px-2 py-0.5 text-[9px] bg-zinc-900 border border-white/5 text-text-muted hover:text-white hover:border-white/20 rounded transition-colors flex items-center h-7 font-mono"
                    variant="ghost"
                    size="sm"
                  />
                </div>
              )}

              <Button size="sm" variant="secondary" onClick={() => setShowSaveModal(true)} className="text-[9px] h-7 px-3 ml-2 rounded-sm bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white">
                Save
              </Button>
            </div>
          </div>

          <div ref={compositionRef} className={clsx("flex-1 relative overflow-hidden flex items-center justify-center min-h-[400px]", isRecording && "cursor-none")}
            style={{ background: activeLayer?.options.bgTheme?.bg || '#000000' }}
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
              currentTime={currentTime}
              maxDuration={maxDuration}
              audioMetrics={audioMetrics}
              isRecording={isRecording}
              globalEffects={globalEffects}
            />
          </div>

          {/* ─── Bottom Panel (Timeline / Node Graph) ─── */}
          <div className="h-[300px] flex flex-col border-t border-white/[0.05] bg-[#000000] shrink-0 z-20">
            <div className="h-10 border-b border-white/[0.05] flex bg-[#050505] justify-between items-center pr-4">
              <div className="flex h-full">
                <button
                  onClick={() => setBottomPanel('timeline')}
                  className={clsx(
                    'px-6 py-0 text-[10px] font-bold uppercase tracking-widest transition-colors border-r border-white/5',
                    bottomPanel === 'timeline'
                      ? 'text-white bg-[#000000]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  Timeline
                </button>
                <button
                  onClick={() => setBottomPanel('nodes')}
                  className={clsx(
                    'px-6 py-0 text-[10px] font-bold uppercase tracking-widest transition-colors border-r border-white/5 flex items-center gap-1.5',
                    bottomPanel === 'nodes'
                      ? 'text-white bg-[#000000]'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  Node Graph
                  <span className="px-1 py-0.5 rounded text-[7px] bg-accent-primary/20 text-accent-primary font-bold">NEW</span>
                </button>
              </div>

              {/* Video control buttons */}
              <div className="flex gap-2 items-center pl-4 border-l border-white/5 h-full">
                <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo} className="h-7 w-7 p-0 text-text-muted hover:text-white rounded-sm" title="Undo (Ctrl+Z)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></svg>
                </Button>
                <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo} className="h-7 w-7 p-0 text-text-muted hover:text-white rounded-sm mr-2" title="Redo (Ctrl+Shift+Z)">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7" /></svg>
                </Button>

                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                <Button
                  variant="ghost"
                  size="sm"
                  className={clsx(
                    "h-7 w-7 p-0 hover:bg-surface-active rounded-sm ml-2",
                    isRecording ? 'text-accent-danger bg-accent-danger/10 hover:bg-accent-danger/20' : 'text-text-muted hover:text-white'
                  )}
                  onClick={isRecording ? stopRecording : startRecording}
                  title={isRecording ? "Stop Recording" : "Record Screen (Video)"}
                >
                  <div className={clsx("w-2.5 h-2.5 rounded-full", isRecording ? 'bg-current' : 'border-2 border-current')} />
                </Button>

                {/* Transport Controls: Backward / Play-Pause / Forward / Loop */}
                <div className="flex items-center rounded border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  {/* Play Backward */}
                  <button
                    onClick={() => { setPlayDirection('backward'); setIsPlaying(true); }}
                    title="Play Backward"
                    className={clsx(
                      "flex items-center justify-center w-7 h-7 transition-colors border-r border-white/[0.06]",
                      isPlaying && playDirection === 'backward' ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-white hover:bg-white/[0.04]"
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L5 12l14-8v16z" /><rect x="3" y="4" width="2" height="16" rx="1" /></svg>
                  </button>
                  {/* Play / Pause */}
                  <button
                    onClick={() => setIsPlaying(p => !p)}
                    title={isPlaying ? "Pause" : "Play"}
                    className="flex items-center justify-center w-8 h-7 transition-colors hover:bg-white/[0.04] text-white border-r border-white/[0.06]"
                  >
                    {isPlaying ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                    ) : (
                      playDirection === 'backward'
                        ? <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 20L5 12l14-8v16z" /></svg>
                        : <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /></svg>
                    )}
                  </button>
                  {/* Play Forward */}
                  <button
                    onClick={() => { setPlayDirection('forward'); setIsPlaying(true); }}
                    title="Play Forward"
                    className={clsx(
                      "flex items-center justify-center w-7 h-7 transition-colors border-r border-white/[0.06]",
                      isPlaying && playDirection === 'forward' ? "text-blue-400 bg-blue-500/10" : "text-zinc-500 hover:text-white hover:bg-white/[0.04]"
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M5 3l14 9-14 9V3z" /><rect x="19" y="4" width="2" height="16" rx="1" /></svg>
                  </button>
                  {/* Loop Toggle */}
                  <button
                    onClick={() => {
                      if (loopMode === 'none') setLoopMode('loop');
                      else if (loopMode === 'loop') setLoopMode('ping-pong');
                      else setLoopMode('none');
                    }}
                    title={`Loop Mode: ${loopMode === 'none' ? 'Stop at End' : loopMode === 'loop' ? 'Loop' : 'Ping-Pong'}`}
                    className={clsx(
                      "flex items-center justify-center w-7 h-7 transition-colors",
                      loopMode === 'loop' ? "text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15" :
                        loopMode === 'ping-pong' ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/15" :
                          "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]"
                    )}
                  >
                    {loopMode === 'ping-pong' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8L22 12L18 16" /><path d="M2 12H22" /><path d="M6 16L2 12L6 8" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 relative overflow-hidden bg-[#000000] custom-scrollbar">
              {bottomPanel === 'timeline' ? (
                <Timeline
                  layers={layers}
                  activeLayerId={activeLayerId}
                  currentTime={currentTime}
                  maxDuration={maxDuration}
                  isPlaying={isPlaying}
                  autoKeyframe={autoKeyframe}
                  onToggleAutoKeyframe={() => setAutoKeyframe(p => !p)}
                  onSeek={(time) => {
                    setCurrentTime(time);
                  }}
                  onAddKeyframe={addKeyframe}
                  onRemoveKeyframe={removeKeyframe}
                  onUpdateKeyframe={updateKeyframe}
                />
              ) : (
                <div className="h-full">
                  <NodeEditor
                    nodes={nodeGraph.graph.nodes}
                    connections={nodeGraph.graph.connections}
                    onAddNode={nodeGraph.addNode}
                    onRemoveNode={nodeGraph.removeNode}
                    onMoveNode={nodeGraph.moveNode}
                    onUpdateNodeConfig={nodeGraph.updateNodeConfig}
                    onAddConnection={nodeGraph.addConnection}
                    onRemoveConnection={nodeGraph.removeConnection}
                    onClearGraph={nodeGraph.clearGraph}
                    evaluatedValues={nodeEvalValues}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Modals & Overlays */}
      <PresetLibrary
        isOpen={showPresetLibrary}
        onClose={() => setShowPresetLibrary(false)}
        onSelectPreset={handleApplyPreset}
      />

      {/* Save Modal */}
      {
        showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#050505] border border-white/10 p-6 rounded-sm w-full max-w-md shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-white">Save to Library</h3>
              <p className="text-sm text-zinc-400">Save this ASCII generation to your personal gallery.</p>
              <input
                type="text"
                placeholder="Name your creation..."
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full bg-[#000000] border border-white/10 rounded-sm px-4 py-3 text-white focus:border-white/30 focus:outline-none"
                autoFocus
              />
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setShowSaveModal(false)} className="rounded-sm">Cancel</Button>
                <Button onClick={() => handleSaveToLibrary(saveName)} disabled={!saveName.trim()} className="rounded-sm bg-white text-black hover:bg-white/90">Save</Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
