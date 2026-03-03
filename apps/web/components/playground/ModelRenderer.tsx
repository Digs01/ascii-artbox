'use client';

import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useGLTF, OrbitControls, Center } from '@react-three/drei';
import { OBJLoader } from 'three-stdlib';
import { Layer } from '../../types/layer';
import { AsciiPointCloud } from './AsciiPointCloud';

// ------- Viewport (WebGL) Model sub-components --------

function ObjModel({ url }: { url: string }) {
    const obj = useLoader(OBJLoader, url);
    const ref = useRef<any>(null);
    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.y += delta * 0.4;
    });
    return <primitive ref={ref} object={obj} />;
}

function GltfModel({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    const ref = useRef<any>(null);
    useFrame((_, delta) => {
        if (ref.current) ref.current.rotation.y += delta * 0.4;
    });
    return <primitive ref={ref} object={scene} />;
}

function ViewportModel({ file }: { file: File }) {
    const url = URL.createObjectURL(file);
    const ext = file.name.split('.').pop()?.toLowerCase();

    return (
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 7]} intensity={1.2} />
            <pointLight position={[-5, -5, -5]} intensity={0.3} />
            <Suspense fallback={null}>
                <Center>
                    {ext === 'obj' ? <ObjModel url={url} /> : <GltfModel url={url} />}
                </Center>
            </Suspense>
            <OrbitControls enableZoom={true} enablePan={false} />
        </Canvas>
    );
}

// ------- Main ModelRenderer --------

export const ModelRenderer = ({ layer }: { layer: Layer }) => {
    if (!layer.file) return null;

    const mode = layer.options.modelRenderMode ?? 'ascii-point-cloud';

    if (mode === 'ascii-point-cloud') {
        return (
            <AsciiPointCloud
                file={layer.file}
                charset={layer.options.charset || ' .:-=+*#%@'}
                color={layer.options.color || '#00ff00'}
                fontSize={layer.options.fontSize || 10}
                canvasWidth={800}
                canvasHeight={600}
                autoRotate={layer.options.modelAutoRotate ?? true}
            />
        );
    }

    // Viewport 3D mode
    return (
        <div style={{ width: '800px', height: '600px', background: '#000' }}>
            <ViewportModel file={layer.file} />
        </div>
    );
};
