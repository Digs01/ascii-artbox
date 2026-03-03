"use client";

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Layer } from '../../types/layer';

// --- Texture Atlas Generator ---
// Creates a sprite sheet of the char set to feed into the WebGL Shader
function createTextAtlas(charset: string, fontSize: number = 64) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const charCount = charset.length;

    // We make a horizontal strip
    canvas.width = fontSize * charCount;
    canvas.height = fontSize;

    ctx.fillStyle = 'black'; // Background transparent in material, but let's keep it black here
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (let i = 0; i < charCount; i++) {
        ctx.fillText(charset[i], i * fontSize + fontSize / 2, fontSize / 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return { texture, charCount };
}

// --- The Core Instanced Engine ---
const AsciiInstancedMesh = ({ frame, layer, fluid }: { frame: string, layer: Layer, fluid?: any }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);

    // Generate Atlas dynamically based on the kinetic word used
    const charset = useMemo(() => {
        const word = (layer.options?.overlayText && layer.options.overlayText.length > 0) ? layer.options.overlayText : "KINETIC";
        const unique = Array.from(new Set(word.split('')));
        if (!unique.includes(' ')) unique.unshift(' ');
        return unique.join('');
    }, [layer.options?.overlayText]);

    const atlas = useMemo(() => createTextAtlas(charset), [charset]);

    // Pre-allocate massive arrays so we don't GC thrash
    const MAX_INSTANCES = 50000;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // We need custom attributes for UV mapping and color
    const [charOffsets] = useState(() => new Float32Array(MAX_INSTANCES));
    const [instanceColors] = useState(() => new Float32Array(MAX_INSTANCES * 3));

    // Fluid Texture Reference
    const fluidTextureRef = useRef<THREE.DataTexture | null>(null);

    // Initialize/Update Fluid Texture
    useEffect(() => {
        if (!fluid?.getWebGlTextureData) return;
        const fluidData = fluid.getWebGlTextureData();
        if (!fluidData) return;

        if (!fluidTextureRef.current || fluidTextureRef.current.image.width !== fluidData.width || fluidTextureRef.current.image.height !== fluidData.height) {
            fluidTextureRef.current = new THREE.DataTexture(
                fluidData.data,
                fluidData.width,
                fluidData.height,
                THREE.RGBAFormat,
                THREE.FloatType
            );
            fluidTextureRef.current.needsUpdate = true;
        }
    }, [fluid]);

    // Continuously update fluid texture data
    useFrame(() => {
        if (fluid?.getWebGlTextureData && fluidTextureRef.current) {
            const fluidData = fluid.getWebGlTextureData();
            if (fluidData && fluidTextureRef.current.image?.data) {
                fluidTextureRef.current.image.data.set(fluidData.data);
                fluidTextureRef.current.needsUpdate = true;
            }
        }
    });

    useEffect(() => {
        if (!meshRef.current || !frame) return;

        const lines = frame.split('\n');
        const fontSize = layer.options.fontSize || 12;
        let instanceCount = 0;

        const charAdvance = fontSize * 0.6;

        let maxChars = 0;
        for (let i = 0; i < lines.length; i++) {
            const blockCount = lines[i].split('|').filter(Boolean).length;
            if (blockCount > maxChars) maxChars = blockCount;
        }

        const totalWidth = maxChars * charAdvance;
        const totalHeight = lines.length * fontSize;

        const startX = -(totalWidth / 2) + (charAdvance / 2);
        const startY = (totalHeight / 2) - (fontSize / 2);
        const totalLines = lines.length;

        for (let i = 0; i < totalLines; i++) {
            const line = lines[i];
            if (!line) continue;

            const lineY = startY - (i * fontSize);
            let currentX = startX;

            // Optimized parsing: split by '|' only once per line
            const charDataBlocks = line.split('|');
            const blocksCount = charDataBlocks.length;

            for (let c = 0; c < blocksCount; c++) {
                const block = charDataBlocks[c];
                if (!block) continue;
                if (instanceCount >= MAX_INSTANCES) break;

                // Split by ',' only if block exists
                const parts = block.split(',');
                if (parts.length === 7) {
                    const char = parts[0] === '&nbsp;' ? ' ' : parts[0];

                    if (char !== ' ') {
                        const op = parseFloat(parts[3]);
                        if (op > 0.05) {
                            const z = parseFloat(parts[1]);
                            const scale = parseFloat(parts[2]);
                            const r = parseInt(parts[4]);
                            const g = parseInt(parts[5]);
                            const b = parseInt(parts[6]);

                            const charIndex = charset.indexOf(char);
                            charOffsets[instanceCount] = charIndex === -1 ? 0 : charIndex;

                            dummy.position.set(currentX, lineY, z);
                            dummy.scale.set(fontSize * scale, fontSize * scale, 1);
                            dummy.updateMatrix();
                            meshRef.current.setMatrixAt(instanceCount, dummy.matrix);

                            instanceColors[instanceCount * 3] = r / 255;
                            instanceColors[instanceCount * 3 + 1] = g / 255;
                            instanceColors[instanceCount * 3 + 2] = b / 255;

                            instanceCount++;
                        }
                    }
                }
                currentX += charAdvance;
            }
        }

        meshRef.current.count = instanceCount;
        meshRef.current.instanceMatrix.needsUpdate = true;
        // Trigger custom attribute updates
        meshRef.current.geometry.attributes.charOffset.needsUpdate = true;
        meshRef.current.geometry.attributes.aColor.needsUpdate = true;

        console.log(`[WebGL Tracker] Frame chars: ${frame.length}, Generated Instances: ${instanceCount}`);

    }, [frame, layer, atlas]);

    const uniforms = useMemo(() => {
        return {
            uTime: { value: 0 },
            uFluid: { value: fluidTextureRef.current },
            uFluidDimensions: { value: new THREE.Vector2(100, 100) },
            uScreenDimensions: { value: new THREE.Vector2(1920, 1080) } // We approximate screen size for the fluid mapping
        };
    }, []);

    useFrame((state) => {
        uniforms.uTime.value = state.clock.elapsedTime;
        if (fluidTextureRef.current) {
            uniforms.uFluid.value = fluidTextureRef.current;
            uniforms.uFluidDimensions.value.set(fluidTextureRef.current.image.width, fluidTextureRef.current.image.height);
            // We need screen dimensions to map world coordinates to fluid grid. Approximate 800x600 canvas for now.
            uniforms.uScreenDimensions.value.set(800, 600);
        }
    });

    // Custom Shader Material that knows how to read the Atlas
    const customMaterial = useMemo(() => {
        const mat = new THREE.MeshBasicMaterial({
            transparent: true,
            depthWrite: false,
            map: atlas.texture, // Binds texture, defining USE_MAP and map uniform
            color: 0xffffff
        });

        mat.onBeforeCompile = (shader) => {
            // Inject attributes and varyings
            shader.uniforms.uFluid = uniforms.uFluid;
            shader.uniforms.uFluidDimensions = uniforms.uFluidDimensions;
            shader.uniforms.uScreenDimensions = uniforms.uScreenDimensions;
            shader.uniforms.uTime = uniforms.uTime;

            shader.vertexShader = `
                uniform sampler2D uFluid;
                uniform vec2 uFluidDimensions;
                uniform vec2 uScreenDimensions;
                uniform float uTime;

                attribute vec3 aColor;
                attribute float charOffset;
                varying vec3 vColorCustom;
                varying vec2 vCustomUv;
            ` + shader.vertexShader;

            // Modify UV to select the correct character from the sprite sheet
            shader.vertexShader = shader.vertexShader.replace(
                '#include <uv_vertex>',
                `
                #include <uv_vertex>
                vColorCustom = aColor;
                float sliceWidth = 1.0 / ${atlas.charCount.toFixed(1)};
                float customU = (uv.x * sliceWidth) + (charOffset * sliceWidth);
                vCustomUv = vec2(customU, uv.y); 
                `
            );

            // Fetch fluid velocity and displace the vertex
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `
                #include <begin_vertex>
                
                // Map world position of instance to fluid grid UV
                // We assume the canvas is roughly centered around 0,0 and occupies uScreenDimensions
                vec4 worldPosition = instanceMatrix * vec4(position, 1.0);
                vec2 screenUv = (worldPosition.xy / uScreenDimensions) + 0.5;
                
                // Read fluid velocity
                vec4 fluidVel = texture2D(uFluid, screenUv);
                
                // Displace vertex based on fluid velocity (red: vx, green: vy)
                // Add a small time-based sine wave modulated by fluid strength for a rippling effect
                float velMag = length(fluidVel.xy);
                float ripple = sin(uTime * 5.0 + worldPosition.x * 0.05 + worldPosition.y * 0.05) * 5.0;
                
                transformed.x += fluidVel.x * 30.0 + (fluidVel.x * ripple);
                transformed.y += fluidVel.y * 30.0 + (fluidVel.y * ripple);
                transformed.z += velMag * 80.0; // Push out in Z based on speed
                `
            );

            // Inject varying into fragment shader
            shader.fragmentShader = `
                varying vec3 vColorCustom;
                varying vec2 vCustomUv;
            ` + shader.fragmentShader;

            // Completely replace map_fragment to use our custom UV and color logic
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                #ifdef USE_MAP
                    vec4 texelColor = texture2D(map, vCustomUv);
                    if (texelColor.r < 0.05 && texelColor.g < 0.05 && texelColor.b < 0.05) {
                        discard;
                    }
                    // Colorize white text using vColorCustom, and keep the mapped intensity as opacity for anti-aliasing
                    diffuseColor = vec4(vColorCustom, texelColor.r);
                #endif
                `
            );
        };
        mat.customProgramCacheKey = () => atlas.charCount.toString();
        return mat;
    }, [atlas]);

    // Need DynamicDrawUsage for frequent updates
    useEffect(() => {
        if (meshRef.current) {
            // Prevent drawing uninitialized garbage on frame 1
            if (!frame) meshRef.current.count = 0;

            // Set dynamic draw usage
            if (meshRef.current.geometry.attributes.charOffset) {
                (meshRef.current.geometry.attributes.charOffset as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
            }
            if (meshRef.current.geometry.attributes.aColor) {
                (meshRef.current.geometry.attributes.aColor as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
            }
            if (meshRef.current.instanceMatrix) {
                meshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            }
        }
    }, [frame]);

    return (
        <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, MAX_INSTANCES]} count={0}>
            <planeGeometry args={[1, 1]}>
                <instancedBufferAttribute attach="attributes-charOffset" args={[charOffsets, 1]} />
                <instancedBufferAttribute attach="attributes-aColor" args={[instanceColors, 3]} />
            </planeGeometry>
            <primitive object={customMaterial} attach="material" />
        </instancedMesh>
    );
};

// --- Viewport Setup ---
export const WebGLKineticRenderer = ({ frame, layer, audioMetrics, fluid }: { frame: string, layer: Layer, audioMetrics?: any, fluid?: any }) => {
    const fontSize = layer.options.fontSize || 12;
    const lines = useMemo(() => frame ? frame.split('\n') : [], [frame]);

    const { gridWidth, gridHeight } = useMemo(() => {
        let maxChars = 0;
        for (let i = 0; i < lines.length; i++) {
            const count = lines[i].split('|').filter(Boolean).length;
            if (count > maxChars) maxChars = count;
        }
        return {
            gridWidth: maxChars * (fontSize * 0.6),
            gridHeight: lines.length * fontSize
        };
    }, [lines, fontSize]);

    return (
        <Canvas
            gl={{ alpha: true, antialias: false }}
            style={{
                width: gridWidth > 0 ? `${gridWidth}px` : '100%',
                height: gridHeight > 0 ? `${gridHeight}px` : '100%',
                display: 'block'
            }}
        >
            <OrthographicCamera
                makeDefault
                position={[0, 0, 500]}
                zoom={1}
                left={-gridWidth / 2}
                right={gridWidth / 2}
                top={gridHeight / 2}
                bottom={-gridHeight / 2}
                near={-1000}
                far={1000}
            />
            {frame && <AsciiInstancedMesh frame={frame} layer={layer} fluid={fluid} />}
        </Canvas>
    );
};
