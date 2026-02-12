import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const rmdir = promisify(fs.rm);

const LIBRARY_DIST = path.join(process.cwd(), '../../packages/library/dist');

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Missing animation ID' }, { status: 400 });
        }

        // Sanitize ID to prevent directory traversal
        const safeId = id.replace(/[^a-z0-9-_]/gi, ''); // Strict alphanumeric+hyphen/underscore
        if (safeId !== id) {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }

        const dir = path.join(LIBRARY_DIST, safeId);

        if (!fs.existsSync(dir)) {
            return NextResponse.json({ error: 'Animation not found' }, { status: 404 });
        }

        // Ensure we are deleting a directory within LIBRARY_DIST
        const realPath = fs.realpathSync(dir);
        if (!realPath.startsWith(fs.realpathSync(LIBRARY_DIST))) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 403 });
        }

        await rmdir(dir, { recursive: true, force: true });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete animation:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
