import { Layer, KeyframeTrack } from '../types/layer';

/**
 * Generates a self-contained React component (.tsx) that plays back
 * the full ASCII animation with all keyframed property changes baked in.
 */
export function generateAnimatedComponent(
  layers: Layer[],
  maxDuration: number,
  options?: {
    componentName?: string;
    backgroundColor?: string;
    fps?: number;
  }
): string {
  const name = options?.componentName || 'AsciiScene';
  const bg = options?.backgroundColor || '#000000';
  const fps = options?.fps || 24;

  // Serialize layer data (frames + keyframes + transform defaults)
  const layerData = layers
    .filter(l => l.visible && l.frames.length > 0)
    .map(l => ({
      id: l.id,
      name: l.name,
      frames: l.frames,
      fps: l.fps || 12,
      transform: {
        x: l.transform.x,
        y: l.transform.y,
        scale: l.transform.scale,
        rotation: l.transform.rotation,
        opacity: l.transform.opacity,
      },
      options: {
        fontSize: l.options.fontSize,
        color: l.options.color,
        colorMode: l.options.colorMode,
      },
      animationTracks: (l.animationTracks || []).map(t => ({
        property: t.property,
        keyframes: t.keyframes.map(k => ({
          time: k.time,
          value: k.value,
          easing: k.easing || 'linear',
        }))
      }))
    }));

  return `"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";

// ─── Baked Animation Data ───
const LAYERS = ${JSON.stringify(layerData, null, 2)};
const MAX_DURATION = ${maxDuration};
const FPS = ${fps};

// ─── Interpolation Engine ───
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function getInterpolatedValue(
  tracks: { property: string; keyframes: { time: number; value: any; easing: string }[] }[],
  property: string,
  time: number,
  defaultValue: any
) {
  const track = tracks.find((t) => t.property === property);
  if (!track || track.keyframes.length === 0) return defaultValue;

  const kfs = track.keyframes;
  if (kfs.length === 1) return kfs[0].value;
  if (time <= kfs[0].time) return kfs[0].value;
  if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;

  for (let i = 0; i < kfs.length - 1; i++) {
    if (time >= kfs[i].time && time <= kfs[i + 1].time) {
      const t = (time - kfs[i].time) / (kfs[i + 1].time - kfs[i].time);
      const a = kfs[i].value;
      const b = kfs[i + 1].value;
      if (typeof a === "number" && typeof b === "number") {
        return lerp(a, b, t);
      }
      return t < 0.5 ? a : b;
    }
  }
  return defaultValue;
}

// ─── Memoized Layer Component ───
const AsciiLayer = memo(({ layer, currentTime, globalFrameCount }: { layer: any, currentTime: number, globalFrameCount: number }) => {
  const frameIndex = globalFrameCount % layer.frames.length;
  const frame = layer.frames[frameIndex];
  const tracks = layer.animationTracks;

  const x = getInterpolatedValue(tracks, "transform.x", currentTime, layer.transform.x);
  const y = getInterpolatedValue(tracks, "transform.y", currentTime, layer.transform.y);
  const scale = getInterpolatedValue(tracks, "transform.scale", currentTime, layer.transform.scale);
  const rotation = getInterpolatedValue(tracks, "transform.rotation", currentTime, layer.transform.rotation);
  const opacity = getInterpolatedValue(tracks, "transform.opacity", currentTime, layer.transform.opacity);
  const fontSize = getInterpolatedValue(tracks, "options.fontSize", currentTime, layer.options.fontSize);
  const color = getInterpolatedValue(tracks, "options.color", currentTime, layer.options.color);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: \`translate(-50%, -50%) translate(\${x}px, \${y}px) rotate(\${rotation}deg) scale(\${scale})\`,
        opacity,
        pointerEvents: "none"
      }}
    >
      <pre
        style={{
          fontFamily: "monospace",
          whiteSpace: "pre",
          lineHeight: \`\${fontSize}px\`,
          fontSize: \`\${fontSize}px\`,
          color,
          margin: 0,
        }}
      >
        {frame}
      </pre>
    </div>
  );
}, (prev, next) => {
    if (prev.globalFrameCount !== next.globalFrameCount && next.layer.frames.length > 1) return false;
    if (prev.currentTime !== next.currentTime) {
        const hasKeyframes = next.layer.animationTracks && next.layer.animationTracks.length > 0;
        if (hasKeyframes) return false;
    }
    return true;
});

// ─── Component ───
export interface ${name}Props {
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}

export function ${name}({
  autoPlay = true,
  loop = true,
  className,
  style,
  width = 800,
  height = 600,
}: ${name}Props) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const animRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        let next = prev + delta;
        if (next > MAX_DURATION) {
          if (!loop) {
            setIsPlaying(false);
            return MAX_DURATION;
          }
          next = 0;
        }
        return next;
      });

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, loop]);

  const globalFrameCount = Math.floor(currentTime * FPS);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        backgroundColor: "${bg}",
        cursor: "pointer",
        ...style,
      }}
      onClick={() => setIsPlaying((p) => !p)}
      role="img"
      aria-label="Animated ASCII Scene"
    >
      {LAYERS.map((layer) => (
        <AsciiLayer 
          key={layer.id} 
          layer={layer} 
          currentTime={currentTime} 
          globalFrameCount={globalFrameCount} 
        />
      ))}
    </div>
  );
}

export default ${name};
`;
}

/**
 * Triggers the download of the generated component as a .tsx file.
 */
export function downloadReactComponent(
  layers: Layer[],
  maxDuration: number,
  options?: {
    componentName?: string;
    backgroundColor?: string;
    fps?: number;
  }
) {
  const code = generateAnimatedComponent(layers, maxDuration, options);
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options?.componentName || 'AsciiScene'}.tsx`;
  a.click();
  URL.revokeObjectURL(url);
}
