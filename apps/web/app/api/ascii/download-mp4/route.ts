import { NextRequest, NextResponse } from 'next/server';
import { createAsciiVideo } from '@asciiweb/core';
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
        const { frames, fps, width, height, color, backgroundColor } = await req.json();

        if (!frames || !Array.isArray(frames) || frames.length === 0) {
            return NextResponse.json({ error: 'Invalid frames data' }, { status: 400 });
        }

        // Create the video
        filePath = await createAsciiVideo(frames, fps || 12, {
            width, // Optional, can let renderer calculate
            height,
            color,
            backgroundColor
        });

        // Current Next.js app directory / API routes don't support simple res.download
        // We need to return a stream.

        const fileStat = await fs.promises.stat(filePath);
        const fileStream = fs.createReadStream(filePath);

        // Clean up the file after streaming starts? 
        // A tricky part with streams. If we delete immediately, stream might fail if not open yet.
        // But usually file unlinking while open works on POSIX, on Windows it might fail.
        // We can just rely on a periodic cleanup task or specific cleanup mechanism?
        // Or simply delete after a delay.

        // Better: Read file to buffer if small enough? 
        // Video files can be large. 
        // Let's rely on the fact that we return a Response with a stream.

        const response = new NextResponse(nodeStreamToWebStream(fileStream) as any, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Length': fileStat.size.toString(),
                'Content-Disposition': `attachment; filename="ascii-animation-${Date.now()}.mp4"`,
            },
        });

        // Attempt to clean up after response is finished? 
        // Not easily hookable in this environment.
        // For now, let's just leave it or use a separate cleanup routine.
        // Actually, let's delete after 10 seconds.
        setTimeout(() => {
            if (filePath) fs.unlink(filePath, () => { });
        }, 10000);

        return response;

    } catch (error: any) {
        console.error('MP4 Gen Error:', error);
        // Clean up if error occurred after file creation (if filePath was set but createAsciiVideo failed? no, it cleans up itself)
        // If filePath exists (createAsciiVideo returned), we might need to clean up.
        if (filePath) fs.unlink(filePath, () => { }).catch(() => { });

        return NextResponse.json({ error: error.message || 'Failed to generate video' }, { status: 500 });
    }
}
