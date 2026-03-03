import { useState, useEffect, useRef, useCallback } from 'react';

interface FluidInstance {
    grid: { vx: number; vy: number }[][];
    width: number;
    height: number;
}

export function useFluidDynamics(options: {
    enabled: boolean;
    viscosity?: number;
    force?: number;
    radius?: number;
    gridResolution?: number; // How many pixels per grid cell (e.g., matching font size)
}) {
    const { enabled, viscosity = 0.9, force = 5, radius = 50, gridResolution = 10 } = options;

    const width = Math.ceil(typeof window !== 'undefined' ? window.innerWidth / gridResolution : 100);
    const height = Math.ceil(typeof window !== 'undefined' ? window.innerHeight / gridResolution : 100);

    const fluidRef = useRef<FluidInstance>({
        grid: Array(height).fill(0).map(() => Array(width).fill(0).map(() => ({ vx: 0, vy: 0 }))),
        width,
        height
    });

    const mouseRef = useRef({ x: 0, y: 0, px: 0, py: 0, isDown: false, timestamp: 0 });
    const animationRef = useRef<number>();

    // 1. Mouse Interaction Tracking
    const pointerMove = useCallback((e: MouseEvent | TouchEvent, rect: DOMRect) => {
        if (!enabled) return;

        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        mouseRef.current.px = mouseRef.current.x;
        mouseRef.current.py = mouseRef.current.y;
        mouseRef.current.x = x;
        mouseRef.current.y = y;

        // Inject Force
        const dx = mouseRef.current.x - mouseRef.current.px;
        const dy = mouseRef.current.y - mouseRef.current.py;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            const { grid, width: w, height: h } = fluidRef.current;

            const gridX = Math.floor(x / gridResolution);
            const gridY = Math.floor(y / gridResolution);
            const gridRadius = Math.ceil(radius / gridResolution);

            for (let gy = Math.max(0, gridY - gridRadius); gy < Math.min(h, gridY + gridRadius); gy++) {
                for (let gx = Math.max(0, gridX - gridRadius); gx < Math.min(w, gridX + gridRadius); gx++) {
                    const distX = (gx - gridX);
                    const distY = (gy - gridY);
                    const cellDist = Math.sqrt(distX * distX + distY * distY);

                    if (cellDist <= gridRadius) {
                        // Closer cells get more force
                        const dropoff = 1 - (cellDist / gridRadius);
                        grid[gy][gx].vx += dx * force * dropoff * 0.1;
                        grid[gy][gx].vy += dy * force * dropoff * 0.1;
                    }
                }
            }
        }
    }, [enabled, force, radius, gridResolution]);

    // 2. Physics Simulation Loop
    const simulate = useCallback(() => {
        if (!enabled) return;
        const { grid, width: w, height: h } = fluidRef.current;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                // Apply Viscosity (slow down over time)
                grid[y][x].vx *= viscosity;
                grid[y][x].vy *= viscosity;

                // Dampen entirely if too small
                if (Math.abs(grid[y][x].vx) < 0.01) grid[y][x].vx = 0;
                if (Math.abs(grid[y][x].vy) < 0.01) grid[y][x].vy = 0;
            }
        }

        // Simple propagation (blur/bloom velocities to neighbors) could go here for realistic water,
        // but for "hologram ripple" this simple decay + force injection is very performant.

        animationRef.current = requestAnimationFrame(simulate);
    }, [enabled, viscosity]);

    useEffect(() => {
        if (enabled) {
            simulate();
        } else {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [enabled, simulate]);

    // Expose lookup function for Canvas/DOM renderers
    const getDisplacement = useCallback((x: number, y: number) => {
        if (!enabled) return { x: 0, y: 0 };
        const gridX = Math.floor(x / gridResolution);
        const gridY = Math.floor(y / gridResolution);

        const { grid, width: w, height: h } = fluidRef.current;

        if (gridY >= 0 && gridY < h && gridX >= 0 && gridX < w) {
            return {
                x: grid[gridY][gridX].vx,
                y: grid[gridY][gridX].vy
            };
        }
        return { x: 0, y: 0 };
    }, [enabled, gridResolution]);

    // Expose raw Float32Array for WebGL DataTextures (RGBA float format: r=vx, g=vy, b=0, a=0)
    const getWebGlTextureData = useCallback(() => {
        if (!enabled) return null;
        const { grid, width: w, height: h } = fluidRef.current;
        const data = new Float32Array(w * h * 4);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                data[idx] = grid[y][x].vx;     // R
                data[idx + 1] = grid[y][x].vy; // G
                data[idx + 2] = 0;             // B
                data[idx + 3] = 0;             // A
            }
        }
        return { data, width: w, height: h };
    }, [enabled]);

    const resize = useCallback((w: number, h: number) => {
        const cols = Math.ceil(w / gridResolution);
        const rows = Math.ceil(h / gridResolution);
        fluidRef.current = {
            width: cols,
            height: rows,
            grid: Array(rows).fill(0).map(() => Array(cols).fill(0).map(() => ({ vx: 0, vy: 0 })))
        };
    }, [gridResolution]);

    return { pointerMove, getDisplacement, getWebGlTextureData, resize };
}
