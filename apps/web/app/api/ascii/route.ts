
import { NextRequest, NextResponse } from 'next/server';
import { imageToAscii } from '@asciiweb/core';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const width = formData.get('width') ? parseInt(formData.get('width') as string) : 100;
        const inverted = formData.get('inverted') === 'true';
        const charset = formData.get('charset') as string | null;
        const transparentColor = formData.get('transparentColor') as string | null;
        const colorTolerance = formData.get('colorTolerance') ? parseInt(formData.get('colorTolerance') as string) : 30;
        const colorMode = formData.get('colorMode') === 'true';
        const renderMode = (formData.get('renderMode') as string) || 'standard';
        const posterize = formData.get('posterize') ? parseInt(formData.get('posterize') as string) : undefined;
        const clahe = formData.get('clahe') === 'true';
        const dither = formData.get('dither') === 'true';
        const palette = (formData.get('palette') as string) || undefined;
        const sharpen = formData.get('sharpen') === 'true';
        const blur = formData.get('blur') ? parseFloat(formData.get('blur') as string) : undefined;
        const noise = formData.get('noise') ? parseFloat(formData.get('noise') as string) : undefined;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const ascii = await imageToAscii(buffer, {
            width,
            invert: inverted,
            ...(charset ? { charset } : {}),
            transparentColor: transparentColor || undefined,
            colorTolerance,
            colorMode,
            renderMode: renderMode as any,
            posterize,
            clahe,
            dither,
            palette,
            sharpen,
            blur,
            noise,
        });

        return NextResponse.json({ ascii });
    } catch (error: any) {
        console.error('Conversion error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
