import { NextRequest, NextResponse } from 'next/server';
import { createAsciiVideo, createCompositeAsciiVideo } from '@asciiweb/core';
import fs from 'fs';
import { Readable } from 'stream';

// Helper to convert Node stream to Web stream
function nodeStreamToWebStream(nodeStream: Readable) {
    return new ReadableStream({
        start(controller) {
            nodeStream.on('data', chunk => controller.enqueue(chunk));
            nodeStream.on('end', () => controller.close());
            nodeStream.on('error', err => controller.error(err));
        },
        cancel() {
            nodeStream.destroy();
        }
    });
}

export async function POST(req: NextRequest) {
    let filePath: string | null = null;
    try {
        const body = await req.json();

        // Check if it's a multi-layer request or legacy single layer
        if (body.layers) {
            // Multi-layer composition
            const { layers, options } = body;
            // Expect layers to be ordered bottom-to-top for rendering? 
            // Or frontend sends top-to-bottom and we reverse.
            // Let's assume frontend sends top-to-bottom (UI order) and we reverse here.

            // Also need global options like bg color, size
            const width = options?.width || 800;
            const height = options?.height || 600;
            const fps = options?.fps || 12;
            const duration = options?.duration;

            filePath = await createCompositeAsciiVideo(
                [...layers].reverse(), // Render bottom to top
                {
                    width,
                    height,
                    backgroundColor: options?.backgroundColor || '#000000',
                    fps,
                    duration
                }
            );

        } else {
            // Legacy/Single Layer fallback
            const { frames, fps, width, height, color, backgroundColor } = body;

            if (!frames || !Array.isArray(frames) || frames.length === 0) {
                return NextResponse.json({ error: 'Invalid frames data' }, { status: 400 });
            }

            filePath = await createAsciiVideo(frames, fps || 12, {
                width,
                height,
                color,
                backgroundColor
            });
        }

        const fileStat = await fs.promises.stat(filePath);
        const fileStream = fs.createReadStream(filePath);

        const response = new NextResponse(nodeStreamToWebStream(fileStream) as any, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Length': fileStat.size.toString(),
                'Content-Disposition': `attachment; filename="ascii-composite-${Date.now()}.mp4"`,
            },
        });

        // Cleanup
        setTimeout(() => {
            if (filePath) fs.unlink(filePath, () => { });
        }, 10000);

        return response;

    } catch (error: any) {
        console.error('MP4 Gen Error:', error);
        if (filePath) fs.unlink(filePath, (err) => { if (err) console.error('Cleanup error:', err); });
        return NextResponse.json({ error: error.message || 'Failed to generate video' }, { status: 500 });
    }
}
