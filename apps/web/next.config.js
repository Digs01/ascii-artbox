const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', '@react-spring/three'],
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@react-three/fiber': path.resolve(__dirname, 'node_modules/@react-three/fiber')
        };
        return config;
    }
};

module.exports = nextConfig;
