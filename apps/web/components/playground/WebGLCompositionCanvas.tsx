"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import { Layer } from '../../types/layer';

export interface WebGLCompositionCanvasProps {
    layers: Layer[];
    canvasWidth: number;
    canvasHeight: number;
    activeLayerId?: string;
    onLayerUpdate: (id: string, updates: Partial<Layer>) => void;
    isPlaying: boolean;
    audioMetrics?: any;
    globalEffects?: {
        bloom?: boolean;
        bloomIntensity?: number;
        bloomRadius?: number;
        chromaticAberration?: boolean;
        rgbShift?: number;
        scanlines?: boolean;
        vignette?: boolean;
        vignetteIntensity?: number;
        vignetteSize?: number;
        fluidDynamics?: boolean;
        fluidForce?: number;
        fluidRadius?: number;
        fluidViscosity?: number;
        edgeSensitivity?: number;
        enable3D?: boolean; // Toggles Depth Mapping mode
    };
    onFrameRendered?: (frameBuffer: string) => void;
}

// The core InstancedMesh ASCII Engine
const AsciiInstancedMesh = ({ layer, isPlaying }: { layer: Layer, isPlaying: boolean }) => {
    // This is where we'll implement the ShaderMaterial and 100k instances
    return (
        <mesh>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial color="white" wireframe />
        </mesh>
    );
};

export const WebGLCompositionCanvas: React.FC<WebGLCompositionCanvasProps> = ({
    layers,
    canvasWidth,
    canvasHeight,
    activeLayerId,
    onLayerUpdate,
    isPlaying,
    audioMetrics,
    globalEffects
}) => {

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Canvas gl={{ alpha: true, antialias: false }}>
                <OrthographicCamera
                    makeDefault
                    position={[0, 0, 1000]}
                    zoom={1}
                />
                <ambientLight intensity={1} />

                {/* We map through layers, although for the WebGL engine, we likely 
                    want to flatten them into a single massively instanced structure 
                    if they represent text grids. */}
                {layers.map(layer => (
                    <group key={layer.id} position={[layer.transform.x, -layer.transform.y, 0]}>
                        <AsciiInstancedMesh layer={layer} isPlaying={isPlaying} />
                    </group>
                ))}
            </Canvas>
        </div>
    );
};
