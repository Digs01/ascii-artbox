
import Link from 'next/link';

export default function Home() {
    return (
        <main className="min-h-screen bg-black text-white selection:bg-green-900">
            <div className="max-w-6xl mx-auto px-6 py-24">
                <div className="text-center space-y-8 mb-20">
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                        AsciiArtbox
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
                        The modern toolkit for high-performance ASCII art animations on the web.
                    </p>
                    <div className="flex justify-center gap-4">
                        <Link
                            href="/playground"
                            className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors"
                        >
                            Try Playground
                        </Link>
                        <Link
                            href="/docs"
                            className="px-8 py-3 border border-gray-700 rounded-full hover:bg-gray-900 transition-colors"
                        >
                            Documentation
                        </Link>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                        <h3 className="text-xl font-bold mb-2">React Component</h3>
                        <p className="text-gray-400">
                            Drop-in <code>&lt;AsciiAnimation /&gt;</code> component for your React and Next.js apps.
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                        <h3 className="text-xl font-bold mb-2">CLI Tool</h3>
                        <p className="text-gray-400">
                            Convert images and videos to optimized ASCII frames directly from your terminal.
                        </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
                        <h3 className="text-xl font-bold mb-2">Animation Library</h3>
                        <p className="text-gray-400">
                            Access a growing collection of pre-generated ASCII loops for your projects.
                        </p>
                    </div>
                </div>
            </div>
        </main >
    );
}
