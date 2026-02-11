import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "AsciiArtbox",
    description: "Animated ASCII Art Toolkit",
};

import { NextAuthProvider } from '@/components/providers/NextAuthProvider';
import { Nav } from '@/components/ui/Nav';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <NextAuthProvider>
                    <Nav />
                    {children}
                </NextAuthProvider>
            </body>
        </html>
    );
}
