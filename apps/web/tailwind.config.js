/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: 'hsl(var(--background))',
                surface: {
                    DEFAULT: 'hsl(var(--surface))',
                    hover: 'hsl(var(--surface-hover))',
                    active: 'hsl(var(--surface-active))',
                },
                border: {
                    DEFAULT: 'hsl(var(--border))',
                    hover: 'hsl(var(--border-hover))',
                },
                text: {
                    primary: 'hsl(var(--text-primary))',
                    secondary: 'hsl(var(--text-secondary))',
                    muted: 'hsl(var(--text-muted))',
                },
                accent: {
                    primary: 'hsl(var(--accent-primary))',
                    danger: 'hsl(var(--accent-danger))',
                    success: 'hsl(var(--accent-success))',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'], // Modern coding font
            },
            keyframes: {
                'slide-down': {
                    '0%': { transform: 'translateY(-10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                }
            },
            animation: {
                'slide-down': 'slide-down 0.2s ease-out',
                'fade-in': 'fade-in 0.2s ease-out',
            }
        },
    },
    plugins: [
        require("tailwindcss-animate") // Useful for standardized animations
    ],
}
