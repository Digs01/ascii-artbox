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
import { useVideoExport } from '../../hooks/useVideoExport';
import { downloadReactComponent } from '../../utils/exportReactComponent';

const DEFAULT_CHARSET = " .:-=+*#%@";
const DENSE_CHARSET = "@%#*+=-:. ";
import { usePlaygroundExport } from '../../hooks/usePlaygroundExport';
import { usePlaygroundGenerator } from '../../hooks/usePlaygroundGenerator';
import { useLiveCameraLayer } from '../../hooks/useLiveCameraLayer';
import { useAsciiWorker } from '../../hooks/useAsciiWorker';
import { PlaygroundHeader } from '../../components/playground/PlaygroundHeader';
import { PlaygroundSidebar } from '../../components/playground/PlaygroundSidebar';

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

  // ─── UX Polish State ───
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [isResizingPanel, setIsResizingPanel] = useState(false);
  const panelResizeRef = useRef({ startY: 0, startHeight: 0 });
  const [showShortcuts, setShowShortcuts] = useState(false);

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

  // Canvas View State
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);
  const containerPanRef = useRef({ x: 0, y: 0 });

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Pinch to zoom or Ctrl+Scroll
      const zoomFactor = -e.deltaY * 0.01;
      setCanvasScale(s => Math.min(Math.max(0.1, s * (1 + zoomFactor)), 10));
    } else {
      // Regular scroll / Two finger trackpad = Pan
      setCanvasPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const handleCanvasPointerDown = useCallback((e: React.PointerEvent) => {
    // Middle click (1) or Alt+LeftClick (0) to pan
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsCanvasPanning(true);
      containerPanRef.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleCanvasPointerMove = useCallback((e: React.PointerEvent) => {
    if (isCanvasPanning) {
      const dx = e.clientX - containerPanRef.current.x;
      const dy = e.clientY - containerPanRef.current.y;
      setCanvasPan(p => ({ x: p.x + dx, y: p.y + dy }));
      containerPanRef.current = { x: e.clientX, y: e.clientY };
    }
  }, [isCanvasPanning]);

  const handleCanvasPointerUp = useCallback(() => {
    setIsCanvasPanning(false);
  }, []);

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

  // Keyboard Shortcuts for Undo/Redo & Playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

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
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
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
    layers,
    width: 800,
    height: 600,
    fps: 12,
    audioMetrics,
    backgroundColor: activeLayer?.options.bgTheme?.bg || '#000000'
  });

  // High-Fidelity Video Export
  const { isExporting: isVideoExporting, progress: videoProgress, status: videoStatus, exportVideo } = useVideoExport({
    targetRef: compositionRef,
    fps: 60, // Targeting smooth 60fps captures
    width: 1920,
    height: 1080,
    onSeekFrame: async (t) => {
      // Stop playback if playing
      if (isPlaying) setIsPlaying(false);
      // Scrub the global clock
      setCurrentTime(t);
      // Give React a double-RAF cycle to guarantee DOM paint of complex CSS/WebGL before snapshotting
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
  });

  const [showAlgoSettings, setShowAlgoSettings] = useState(false);
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

      // Evaluate Node Graph — and APPLY results to the active layer
      if (nodeGraph.graph.nodes.length > 0 && activeLayerId) {
        const evaluated = nodeGraph.evaluate({
          currentTime: performance.now() / 1000,
          maxDuration,
          globalFrameCount,
          audioMetrics: audioAnalyzer.isListening ? audioAnalyzer.getAudioMetrics() : undefined,
        });
        setNodeEvalValues(evaluated);

        // ─── Critical: Apply evaluated values to the active layer ───
        if (Object.keys(evaluated).length > 0) {
          const transformUpdates: Record<string, any> = {};
          const optionsUpdates: Record<string, any> = {};
          for (const [key, val] of Object.entries(evaluated)) {
            if (key.startsWith('transform.')) {
              transformUpdates[key.slice('transform.'.length)] = val;
            } else if (key.startsWith('options.')) {
              optionsUpdates[key.slice('options.'.length)] = val;
            }
          }
          if (Object.keys(transformUpdates).length > 0) {
            updateLayerTransform(activeLayerId, transformUpdates);
          }
          if (Object.keys(optionsUpdates).length > 0) {
            replaceLayerOptions(activeLayerId, optionsUpdates);
          }
        }
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationRef.current!);
  }, [isPlaying, playDirection, loopMode, audioAnalyzer.isListening, activeLayer?.options?.videoFps]);

  // Loading State
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

  const {
    width, inverted, videoFps, charset, color, customColor, fontSize, bgTheme,
    removeBackground, transparentColor, colorTolerance, colorMode, renderMode,
    posterize, clahe, frameDiff, dither, palette, sharpen, blur, noise, overlayText, depthMode, edgeThreshold
  } = options as LayerOptions || {}; // Fallback to empty

  // --- WORKER (shared between generator & camera) ---
  const { convertFile: workerConvert, convertCanvas: workerConvertCanvas } = useAsciiWorker();

  const { generate, loading } = usePlaygroundGenerator({
    activeLayer, toast, setProgress, setMaxDuration, setLayerAscii, updateLayerTransform, workerConvert
  });

  const {
    downloadMp4, copyToClipboard, downloadTxt, downloadHtml, downloadSvg, downloadShareCard, handleSaveToLibrary
  } = usePlaygroundExport({
    activeLayer, isVideoExporting, exportVideo, maxDuration, videoFps: videoFps || 12, compositionRef,
    bgTheme: bgTheme as any, color: color as string, fontSize: fontSize as number, setShowSaveModal, toast
  });

  // --- LIVE CAMERA LAYER (Feature 2: WebRTC — worker-accelerated) ---
  const cameraActiveLayer = activeLayer?.type === 'camera' ? activeLayer : null;
  const camera = useLiveCameraLayer({
    active: !!cameraActiveLayer,
    targetFps: 15,
    onFrame: async (canvas: HTMLCanvasElement) => {
      if (!cameraActiveLayer) return;
      const opts = cameraActiveLayer.options;
      try {
        const ascii = await workerConvertCanvas(canvas, {
          width: opts.width || 100,
          renderMode: opts.renderMode,
          invert: opts.inverted,
          charset: opts.charset,
          colorMode: opts.colorMode,
        });
        if (ascii) setLayerAscii(cameraActiveLayer.id, [ascii]);
      } catch (e) { /* Worker failed — skip frame */ }
    }
  });

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
        if (activeLayer.previewUrl) URL.revokeObjectURL(activeLayer.previewUrl);
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
        if (activeLayer.previewUrl) URL.revokeObjectURL(activeLayer.previewUrl);
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
  const generateRef = useRef(generate);
  useEffect(() => {
    generateRef.current = generate;
  });

  // Panel resize handlers
  const handlePanelResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsResizingPanel(true);
    panelResizeRef.current = { startY: e.clientY, startHeight: bottomPanelHeight };
  }, [bottomPanelHeight]);

  useEffect(() => {
    if (!isResizingPanel) return;
    const handleMove = (e: PointerEvent) => {
      const delta = panelResizeRef.current.startY - e.clientY;
      setBottomPanelHeight(Math.max(120, Math.min(500, panelResizeRef.current.startHeight + delta)));
    };
    const handleUp = () => setIsResizingPanel(false);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => { window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp); };
  }, [isResizingPanel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const cmd = e.metaKey || e.ctrlKey;

      // ─── Generate ───
      if (cmd && (e.key === 'Enter' || e.key === 'g')) {
        e.preventDefault();
        generateRef.current();
        return;
      }

      // ─── Save modal ───
      if (cmd && e.key === 's') {
        e.preventDefault();
        setShowSaveModal(true);
        return;
      }

      // ─── Export PNG ───
      if (cmd && e.key === 'e') {
        e.preventDefault();
        downloadShareCard();
        return;
      }

      // ─── Undo / Redo ───
      if (cmd && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (cmd && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // ─── Duplicate ───
      if (cmd && e.key === 'd') {
        e.preventDefault();
        if (activeLayerId) duplicateLayer(activeLayerId);
        return;
      }

      // Non-cmd shortcuts below
      if (cmd) return;

      // ─── Space = Play/Pause ───
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
        return;
      }

      // ─── Delete/Backspace = Remove layer ───
      if ((e.key === 'Delete' || e.key === 'Backspace') && activeLayerId) {
        e.preventDefault();
        removeLayer(activeLayerId);
        return;
      }

      // ─── [ / ] = Select prev/next layer ───
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const idx = layers.findIndex(l => l.id === activeLayerId);
        if (e.key === '[' && idx > 0) setActiveLayerId(layers[idx - 1].id);
        if (e.key === ']' && idx < layers.length - 1) setActiveLayerId(layers[idx + 1].id);
        return;
      }

      // ─── 1/2 = Switch bottom panel ───
      if (e.key === '1') { setBottomPanel('timeline'); return; }
      if (e.key === '2') { setBottomPanel('nodes'); return; }

      // ─── F = Fit to canvas ───
      if (e.key === 'f' || e.key === 'F') {
        handleFitToCanvas(false);
        return;
      }

      // ─── R = Reset view ───
      if (e.key === 'r' || e.key === 'R') {
        setCanvasScale(1);
        setCanvasPan({ x: 0, y: 0 });
        return;
      }

      // ─── +/- = Zoom ───
      if (e.key === '=' || e.key === '+') { setCanvasScale(s => Math.min(10, s + 0.1)); return; }
      if (e.key === '-') { setCanvasScale(s => Math.max(0.1, s - 0.1)); return; }

      // ─── Backtick = Toggle sidebar ───
      if (e.key === '`') { setSidebarCollapsed(p => !p); return; }

      // ─── ? = Show shortcuts ───
      if (e.key === '?') { setShowShortcuts(p => !p); return; }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeLayerId, layers]);

  if (!activeLayer) {
    return (
      <div className="min-h-screen bg-black text-white pt-24 text-center">Loading layers...</div>
    );
  }

  return (
    <div className="h-screen w-full pt-16 bg-[#000000] text-text-primary overflow-hidden flex flex-col font-sans">
      <PlaygroundHeader
        activeLayer={activeLayer}
        isExportingVideo={isVideoExporting}
        isExportingGif={isGifExporting}
        videoProgress={videoProgress}
        gifProgress={gifProgress}
        onDownloadMp4={downloadMp4}
        onDownloadGif={exportGif}
        onDownloadTxt={downloadTxt}
        onDownloadHtml={downloadHtml}
        onDownloadSvg={downloadSvg}
        onDownloadPng={downloadShareCard}
        onCopyClipboard={copyToClipboard}
        onSaveToLibrary={() => setShowSaveModal(true)}
      />
      <main className="flex-1 flex overflow-hidden">
        {/* ─── Controls Panel (Left Sidebar) ─── */}
        <div className={`sidebar-transition shrink-0 relative ${sidebarCollapsed ? 'w-12 min-w-[48px]' : 'w-[400px]'}`}>
          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(p => !p)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-30 w-6 h-12 bg-zinc-900 border border-white/10 rounded-r-md flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all group"
            title={sidebarCollapsed ? 'Expand sidebar (`)' : 'Collapse sidebar (`)'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`}><polyline points="9 18 15 12 9 6" /></svg>
          </button>

          {sidebarCollapsed ? (
            /* ─── Collapsed Rail ─── */
            <div className="h-full bg-[#000000] border-r border-white/[0.05] flex flex-col items-center py-4 gap-3">
              <button onClick={() => setSidebarCollapsed(false)} className="w-8 h-8 rounded bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors" title="Expand">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></svg>
              </button>
              <div className="w-8 h-px bg-white/10" />
              {/* Layer count badge */}
              <div className="flex flex-col items-center gap-1" title={`${layers.length} layers`}>
                <div className="w-8 h-8 rounded bg-zinc-900 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-300">{layers.length}</div>
                <span className="text-[7px] text-zinc-600 uppercase tracking-wider">Layers</span>
              </div>
              {/* Generate button */}
              <button onClick={generate} disabled={!activeLayer?.file || loading} className="w-8 h-8 rounded bg-white text-black flex items-center justify-center hover:bg-white/90 transition-colors disabled:opacity-30" title="Generate (Ctrl+Enter)">
                {loading ? (
                  <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" className="opacity-25" /><path d="M4 12a8 8 0 0 1 8-8" className="opacity-75" /></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                )}
              </button>
            </div>
          ) : (
            <PlaygroundSidebar
              layers={layers}
              activeLayer={activeLayer}
              activeLayerId={activeLayerId}
              setActiveLayerId={setActiveLayerId}
              updateLayer={updateLayer}
              updateLayerOptions={updateLayerOptions}
              updateLayerTransform={updateLayerTransform}
              replaceLayerOptions={replaceLayerOptions}
              removeLayer={removeLayer}
              duplicateLayer={duplicateLayer}
              reorderLayers={reorderLayers}
              addLayer={addLayer}
              addKeyframe={addKeyframe}
              loading={loading}
              progress={progress}
              generate={generate}
              autoKeyframe={autoKeyframe}
              currentTime={currentTime}
              audioAnalyzer={audioAnalyzer}
              globalEffects={globalEffects}
              setGlobalEffects={setGlobalEffects}
              setShowPresetLibrary={setShowPresetLibrary}
              handleFitToCanvas={handleFitToCanvas}
              cameraIsStreaming={camera.isStreaming}
              cameraDevices={camera.devices}
              cameraSelectedDeviceId={camera.selectedDeviceId}
              cameraError={camera.error}
              onStartCamera={camera.startCamera}
              onStopCamera={camera.stopCamera}
              onCameraDeviceChange={(id) => { camera.setSelectedDeviceId(id); }}
            />
          )}
        </div>

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

          <div ref={compositionRef} className={clsx("flex-1 relative overflow-hidden flex items-center justify-center min-h-[400px]", isRecording && "cursor-none", isVideoExporting && "pointer-events-none", isCanvasPanning && "!cursor-grabbing")}
            style={{ background: activeLayer?.options.bgTheme?.bg || '#000000' }}
            onWheel={handleCanvasWheel}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handleCanvasPointerUp}
            onPointerLeave={handleCanvasPointerUp}
            onContextMenu={(e) => { if (e.altKey) e.preventDefault(); }}
          >
            {/* ─── Empty State Onboarding ─── */}
            {layers.every(l => !l.frames || l.frames.length === 0) && !isVideoExporting && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="pointer-events-auto animate-fade-slide-in bg-black/60 shortcut-overlay-backdrop border border-white/10 rounded-xl p-8 max-w-md text-center space-y-5">
                  <div className="text-3xl mb-2">◈</div>
                  <h2 className="text-lg font-bold tracking-wider uppercase text-white">Welcome to AsciiArtbox</h2>
                  <div className="space-y-2 text-sm text-zinc-400">
                    <div className="flex items-center gap-3 justify-center"><span className="shortcut-key">1</span><span>Drop an image in the sidebar</span></div>
                    <div className="flex items-center gap-3 justify-center"><span className="shortcut-key">2</span><span>Tweak engine settings</span></div>
                    <div className="flex items-center gap-3 justify-center"><span className="shortcut-key">3</span><span>Hit <strong className="text-white">GENERATE</strong></span></div>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-center gap-3">
                    <button onClick={() => setShowPresetLibrary(true)} className="px-4 py-2 bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/20 transition-colors uppercase tracking-wider">Browse Presets</button>
                  </div>
                  <div className="space-y-1 text-[10px] text-zinc-600">
                    <div className="flex items-center justify-center gap-2"><span className="shortcut-key">Ctrl+Enter</span> Generate</div>
                    <div className="flex items-center justify-center gap-2"><span className="shortcut-key">Space</span> Play / Pause</div>
                    <div className="flex items-center justify-center gap-2"><span className="shortcut-key">?</span> All Shortcuts</div>
                  </div>
                </div>
              </div>
            )}
            {/* Offline Rendering Overlay */}
            <AnimatePresence>
              {isVideoExporting && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md"
                >
                  <Film className="w-12 h-12 text-blue-500 mb-6 animate-pulse" />
                  <h2 className="text-xl font-bold tracking-widest uppercase mb-2">Offline Rendering</h2>
                  <p className="text-sm text-zinc-400 max-w-sm text-center mb-8">
                    {videoStatus || 'Preparing encoder...'}
                  </p>

                  <div className="w-64 h-2 bg-zinc-900 rounded-full overflow-hidden mb-8 border border-white/10">
                    <motion.div
                      className="h-full bg-blue-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${videoProgress}%` }}
                      transition={{ ease: "linear", duration: 0.1 }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Composition Canvas */}
            <div
              style={{
                width: 800,
                height: 600,
                transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasScale})`,
                transformOrigin: 'center center'
              }}
              className="relative flex-shrink-0"
            >
              <CompositionCanvas
                layers={layers}
                activeLayerId={activeLayerId}
                onSelectLayer={setActiveLayerId}
                onUpdateTransform={(id, t) => updateLayerTransform(id, t)}
                onUpdateTransformEnd={(id, t) => commitLayerTransform(id, t)}
                width={800} height={600} scale={canvasScale}
                globalFrameCount={globalFrameCount}
                currentTime={currentTime}
                maxDuration={maxDuration}
                audioMetrics={audioMetrics}
                isRecording={isRecording}
                globalEffects={globalEffects}
              />
            </div>

            {/* View Controls Overlay */}
            <div className="absolute bottom-4 right-4 flex gap-2 z-40">
              <button className="h-7 text-[10px] uppercase font-bold tracking-widest px-3 bg-[#050505] border border-white/10 hover:bg-white/10 text-white rounded transition-colors" onClick={() => { setCanvasScale(1); setCanvasPan({ x: 0, y: 0 }); }}>Reset View</button>
              <div className="flex bg-[#050505] border border-white/10 rounded overflow-hidden text-white/80">
                <button className="px-3 py-0.5 hover:bg-white/10 transition-colors font-bold" title="Zoom Out" onClick={() => setCanvasScale(s => Math.max(0.1, s - 0.1))}>-</button>
                <span className="px-2 py-0.5 text-[10px] font-mono flex items-center w-12 justify-center border-l border-r border-white/5">{Math.round(canvasScale * 100)}%</span>
                <button className="px-3 py-0.5 hover:bg-white/10 transition-colors font-bold" title="Zoom In" onClick={() => setCanvasScale(s => Math.min(10, s + 0.1))}>+</button>
              </div>
            </div>
          </div>

          {/* ─── Bottom Panel (Timeline / Node Graph) ─── */}
          <div className={clsx("flex flex-col border-t border-white/[0.05] bg-[#000000] shrink-0 z-20", isVideoExporting && "pointer-events-none opacity-50")} style={{ height: bottomPanelHeight }}>
            {/* ─── Drag Handle ─── */}
            <div
              className="drag-handle h-[6px] w-full flex items-center justify-center"
              onPointerDown={handlePanelResizeStart}
              onDoubleClick={() => setBottomPanelHeight(h => h < 300 ? 400 : 200)}
              title="Drag to resize · Double-click to toggle"
            />
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
                    onSaveGraph={nodeGraph.saveGraph}
                    onLoadGraph={nodeGraph.loadGraph}
                    onDeleteGraph={nodeGraph.deleteSavedGraph}
                    listSavedGraphs={nodeGraph.listSavedGraphs}
                    onLoadPreset={nodeGraph.loadPreset}
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </main>

      {/* ─── Keyboard Shortcuts Overlay ─── */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 shortcut-overlay-backdrop" onClick={() => setShowShortcuts(false)}>
          <div className="animate-fade-slide-in bg-[#0a0a0a] border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="text-zinc-500 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px]">
              {[
                ['Ctrl + Enter', 'Generate ASCII'],
                ['Space', 'Play / Pause'],
                ['Ctrl + Z', 'Undo'],
                ['Ctrl + Shift + Z', 'Redo'],
                ['Ctrl + D', 'Duplicate Layer'],
                ['Ctrl + S', 'Save to Library'],
                ['Ctrl + E', 'Export PNG'],
                ['Delete', 'Remove Layer'],
                ['[ / ]', 'Prev / Next Layer'],
                ['1 / 2', 'Timeline / Nodes'],
                ['F', 'Fit to Canvas'],
                ['R', 'Reset View'],
                ['+ / -', 'Zoom In / Out'],
                ['`', 'Toggle Sidebar'],
                ['?', 'This Help'],
                ['Alt + Drag', 'Pan Canvas'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-3 py-1 border-b border-white/[0.04]">
                  <span className="text-zinc-400">{desc}</span>
                  <span className="shortcut-key text-[9px]">{key}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center text-[10px] text-zinc-600">Press <span className="shortcut-key">?</span> or click outside to close</div>
          </div>
        </div>
      )}

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
