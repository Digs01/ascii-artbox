import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const LIBRARY_DIST = path.join(process.cwd(), '../../packages/library/dist');

export async function POST(req: NextRequest) {
    try {
        const { name, frames, fps, tags } = await req.json();

        if (!name || !frames || !fps) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Sanitize name
        const safeName = name.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
        const dir = path.join(LIBRARY_DIST, safeName);

        if (!fs.existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }

        // Save manifest
        const manifest = {
            id: safeName,
            name,
            frames: frames.map((_: any, i: number) => `${String(i).padStart(3, '0')}.txt`),
            fps,
            tags: tags || ['user-generated'],
        };

        await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

        // Save frames
        for (let i = 0; i < frames.length; i++) {
            const fileName = `${String(i).padStart(3, '0')}.txt`;
            await writeFile(path.join(dir, fileName), frames[i]);
        }

        return NextResponse.json({ success: true, id: safeName });
    } catch (error) {
        console.error('Failed to save animation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
