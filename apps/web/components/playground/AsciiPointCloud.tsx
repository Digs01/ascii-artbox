'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { OBJLoader, GLTFLoader } from 'three-stdlib';

interface AsciiPointCloudProps {
    file: File;
    charset?: string;
    color?: string;
    fontSize?: number;
    canvasWidth?: number;
    canvasHeight?: number;
    autoRotate?: boolean;
}

// Generates a 1D sprite sheet of characters
const createTextAtlas = (charsetStr: string, size: number = 32) => {
    const chars = charsetStr.length > 0 ? charsetStr.split('') : [' ', '.', ':', '-', '=', '+', '*', '#', '%', '@'];
    const charLen = chars.length;
    const canvas = document.createElement('canvas');
    canvas.width = size * charLen;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text
    ctx.fillStyle = '#ffffff'; // White text to allow uniform coloration
    ctx.font = `${size * 0.8}px monospace`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    chars.forEach((char, i) => {
        ctx.fillText(char, i * size + (size / 2), size / 2);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;

    return { texture, charCount: charLen };
};

const PointsRenderer = ({
    positions,
    normals,
    charset,
    color,
    fontSize,
    autoRotate
}: {
    positions: Float32Array;
    normals: Float32Array;
    charset: string;
    color: string;
    fontSize: number;
    autoRotate: boolean;
}) => {
    const pointsRef = useRef<THREE.Points>(null);
    const { camera } = useThree();

    const atlas = useMemo(() => createTextAtlas(charset, 32), [charset]);
    const parsedColor = useMemo(() => new THREE.Color(color), [color]);

    // Construct the geometry
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        return geo;
    }, [positions, normals]);

    // Custom Shader Material for ASCII Points
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTexture: { value: atlas.texture },
                uColor: { value: parsedColor },
                uTime: { value: 0 },
                uCameraPos: { value: new THREE.Vector3() },
                uCharCount: { value: atlas.charCount },
                uPointSize: { value: fontSize * window.devicePixelRatio },
            },
            vertexShader: `
                uniform vec3 uCameraPos;
                uniform float uPointSize;
                varying float vBrightness;

                void main() {
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Fixed point size regardless of distance
                    gl_PointSize = uPointSize;

                    // Calculate brightness based on normal facing camera
                    vec3 worldNormal = normalize(normalMatrix * normal);
                    vec3 viewDir = normalize(-mvPosition.xyz);
                    float dotProd = dot(worldNormal, viewDir);
                    
                    // Remap [-1, 1] to [0, 1]
                    vBrightness = clamp((dotProd + 1.0) / 2.0, 0.0, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uTexture;
                uniform vec3 uColor;
                uniform float uCharCount;
                varying float vBrightness;

                void main() {
                    // Map brightness to character index
                    float charIdx = floor(vBrightness * 0.999 * uCharCount); // 0 to uCharCount-1
                    
                    // gl_PointCoord goes from (0,0) to (1,1) inside the point
                    // We need to map the X coordinate to the specific segment of the atlas
                    vec2 uv = gl_PointCoord;
                    
                    // Only map if uv is inside the circle/square to avoid bleeding?
                    // Not strictly necessary for text bounding box if atlas is clean.
                    
                    float sliceWidth = 1.0 / uCharCount;
                    uv.x = (uv.x * sliceWidth) + (charIdx * sliceWidth);
                    
                    vec4 texColor = texture2D(uTexture, uv);
                    
                    if (texColor.a < 0.1) discard; // Transparent background points

                    gl_FragColor = vec4(uColor, texColor.a);
                }
            `,
            transparent: true,
            depthTest: true,
            depthWrite: false, // Prevents points from blocking each other poorly
            blending: THREE.NormalBlending
        });
    }, [atlas, parsedColor, fontSize]);

    useFrame((state, delta) => {
        if (pointsRef.current) {
            if (autoRotate) {
                pointsRef.current.rotation.y += delta * 0.2;
            }
            const mat = pointsRef.current.material as THREE.ShaderMaterial;
            mat.uniforms.uTime.value = state.clock.elapsedTime;
            mat.uniforms.uCameraPos.value.copy(camera.position);
        }
    });

    return (
        <points ref={pointsRef} geometry={geometry} material={material} />
    );
};

export function AsciiPointCloud({
    file,
    charset = ' .:-=+*#%@',
    color = '#00ff00',
    fontSize = 10,
    canvasWidth = 800,
    canvasHeight = 600,
    autoRotate = true,
}: AsciiPointCloudProps) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Store merged geometry to pass to the renderer
    const [geomData, setGeomData] = useState<{ positions: Float32Array, normals: Float32Array } | null>(null);

    // Load the 3D model and extract geometry
    useEffect(() => {
        setIsLoaded(false);
        setError(null);
        setGeomData(null);

        const url = URL.createObjectURL(file);
        const ext = file.name.split('.').pop()?.toLowerCase();

        const extractJoinedGeometries = (object: THREE.Object3D) => {
            const positions: number[] = [];
            const normals: number[] = [];

            // Re-center object to origin before extracting
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.x += (object.position.x - center.x);
            object.position.y += (object.position.y - center.y);
            object.position.z += (object.position.z - center.z);

            object.updateMatrixWorld(true);

            // Subsample vertices if there are too many to keep point clouds readable?
            // Actually, displaying all vertices is usually fine for GPU Points.

            object.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    const geo = mesh.geometry.clone();
                    geo.applyMatrix4(mesh.matrixWorld);
                    if (!geo.attributes.normal) geo.computeVertexNormals();

                    const pArr = geo.attributes.position.array;
                    const nArr = geo.attributes.normal.array;

                    for (let i = 0; i < pArr.length; i++) {
                        positions.push(pArr[i]);
                        normals.push(nArr[i]);
                    }
                    geo.dispose();
                }
            });

            return {
                positions: new Float32Array(positions),
                normals: new Float32Array(normals)
            };
        };

        const onError = (err: any) => {
            console.error('Model load error:', err);
            setError(`Failed to load model: ${file.name}`);
            URL.revokeObjectURL(url);
        };

        if (ext === 'obj') {
            const loader = new OBJLoader();
            loader.load(url, (object) => {
                setGeomData(extractJoinedGeometries(object));
                setIsLoaded(true);
                URL.revokeObjectURL(url);
            }, undefined, onError);
        } else if (ext === 'gltf' || ext === 'glb') {
            const loader = new GLTFLoader();
            loader.load(url, (gltf) => {
                setGeomData(extractJoinedGeometries(gltf.scene));
                setIsLoaded(true);
                URL.revokeObjectURL(url);
            }, undefined, onError);
        } else {
            setError(`Unsupported format: .${ext}`);
            URL.revokeObjectURL(url);
        }

        return () => { URL.revokeObjectURL(url); };
    }, [file]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black text-center p-4">
                <div>
                    <div className="text-red-400 text-xs font-mono mb-2">⚠ Model Error</div>
                    <div className="text-zinc-500 text-[10px]">{error}</div>
                </div>
            </div>
        );
    }

    if (!isLoaded || !geomData) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-transparent">
                <div className="text-center">
                    <div className="text-zinc-500 text-xs font-mono animate-pulse mb-1">COMPILING POINTS</div>
                    <div className="text-zinc-700 text-[9px]">{file.name}</div>
                </div>
            </div>
        );
    }

    // Scale the camera based on object size
    // We can compute the bounding sphere of the points just to set camera distance
    let maxDist = 0;
    for (let i = 0; i < geomData.positions.length; i += 3) {
        const d = Math.sqrt(
            geomData.positions[i] * geomData.positions[i] +
            geomData.positions[i + 1] * geomData.positions[i + 1] +
            geomData.positions[i + 2] * geomData.positions[i + 2]
        );
        if (d > maxDist) maxDist = d;
    }
    const camDistance = maxDist * 2.5 || 5;

    return (
        <div style={{ width: canvasWidth, height: canvasHeight, display: 'block' }}>
            <Canvas camera={{ position: [0, 0, camDistance], fov: 45 }} gl={{ alpha: true }}>
                <ambientLight intensity={1.0} />
                <PointsRenderer
                    positions={geomData.positions}
                    normals={geomData.normals}
                    charset={charset}
                    color={color}
                    fontSize={fontSize}
                    autoRotate={autoRotate}
                />
                <OrbitControls enableZoom={true} enablePan={true} />
            </Canvas>
        </div>
    );
}
