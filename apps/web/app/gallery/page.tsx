
import fs from 'fs';
import path from 'path';
import { GalleryGrid } from './GalleryGrid';
import { Nav } from '../../components/ui/Nav';

export const dynamic = 'force-dynamic';

const LIBRARY_DIST = path.join(process.cwd(), '../../packages/library/dist');

async function getAnimations() {
    if (!fs.existsSync(LIBRARY_DIST)) return [];

    const dirs = fs.readdirSync(LIBRARY_DIST, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    const animations = [];

    for (const name of dirs) {
        try {
            const manifestPath = path.join(LIBRARY_DIST, name, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

                // Load frames for SSR/Preview
                const frames = manifest.frames.map((f: string) =>
                    fs.readFileSync(path.join(LIBRARY_DIST, name, f), 'utf-8')
                );

                animations.push({
                    ...manifest,
                    frames,
                    id: name
                });
            }
        } catch (e) {
            console.error(`Failed to load animation ${name}`, e);
        }
    }

    return animations;
}

export default async function Gallery() {
    const animations = await getAnimations();

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <Nav />
            <main className="pt-24 px-6 max-w-[1400px] mx-auto pb-20">
                <header className="mb-10">
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Library</h1>
                    <p className="text-zinc-500 text-lg">Browse, preview, and copy procedurally generated ASCII animations.</p>
                </header>

                <GalleryGrid animations={animations} />
            </main>
        </div>
    );
}
