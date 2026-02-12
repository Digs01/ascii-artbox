import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals_fixed.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AsciiArtbox",
    description: "Animated ASCII Art Toolkit",
};

import { NextAuthProvider } from '@/components/providers/NextAuthProvider';
import { Nav } from '@/components/ui/Nav';

import { ToastProvider } from '@/components/ui/ToastContext';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <NextAuthProvider>
                    <ToastProvider>
                        <Nav />
                        {children}
                    </ToastProvider>
                </NextAuthProvider>
            </body>
        </html>
    );
}
