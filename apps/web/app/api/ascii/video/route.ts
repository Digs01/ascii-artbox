
import { NextRequest, NextResponse } from 'next/server';
import { videoToAscii } from '@asciiweb/core';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// Helper to write buffer to file
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

export async function POST(req: NextRequest) {
    let tempFilePath = '';

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const width = formData.get('width') ? parseInt(formData.get('width') as string) : 50;
        const fps = formData.get('fps') ? parseInt(formData.get('fps') as string) : 12;
        const inverted = formData.get('inverted') === 'true';
        const charset = formData.get('charset') as string | null;
        const transparentColor = formData.get('transparentColor') as string | null;
        const colorTolerance = formData.get('colorTolerance') ? parseInt(formData.get('colorTolerance') as string) : 30;
        const colorMode = formData.get('colorMode') === 'true';
        const renderMode = (formData.get('renderMode') as string) || 'standard';
        const posterize = formData.get('posterize') ? parseInt(formData.get('posterize') as string) : undefined;
        const clahe = formData.get('clahe') === 'true';
        const dither = formData.get('dither') === 'true';
        const frameDiff = formData.get('frameDiff') === 'true';
        const palette = (formData.get('palette') as string) || undefined;
        const sharpen = formData.get('sharpen') === 'true';
        const blur = formData.get('blur') ? parseFloat(formData.get('blur') as string) : undefined;
        const noise = formData.get('noise') ? parseFloat(formData.get('noise') as string) : undefined;
        const edgeThreshold = formData.get('edgeThreshold') ? parseFloat(formData.get('edgeThreshold') as string) : undefined;
        const overlayText = formData.get('overlayText') as string | undefined;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        // Save uploaded file to a temporary location
        const buffer = Buffer.from(await file.arrayBuffer());
        const tempDir = path.join(process.cwd(), 'tmp'); // Use a local tmp in project
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        tempFilePath = path.join(tempDir, `upload-${Date.now()}-${file.name}`);
        await writeFile(tempFilePath, buffer);

        // Process video
        // We pass null for outputDir to indicate we want frames in memory only
        const frames = await videoToAscii(tempFilePath, {
            width,
            height: undefined, // maintain aspect ratio
            fps,
            returnFrames: true,
            invert: inverted,
            ...(charset ? { charset } : {}),
            transparentColor: transparentColor || undefined,
            colorTolerance,
            colorMode,
            renderMode: renderMode as any,
            posterize,
            clahe,
            dither,
            frameDiff,
            palette,
            sharpen,
            blur,
            noise,
            edgeThreshold,
            overlayText,
            outputDir: undefined
        });

        // Cleanup input file
        await unlink(tempFilePath);

        return NextResponse.json({ frames, fps });
    } catch (error: any) {
        console.error('Video conversion error:', error);
        // Try to cleanup if error occurred
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { await unlink(tempFilePath); } catch { }
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
