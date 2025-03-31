/** @type {import('next').NextConfig} */

const nextConfig = {
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"], // Allows importing SVGs as React components
        });
        
        // Optimize build for low memory environments
        config.optimization = {
            ...config.optimization,
            minimize: true,
            sideEffects: true,
        };
        
        return config;
    },
    // Add production build optimizations
    swcMinify: true,
    poweredByHeader: false,
    reactStrictMode: false,
    // Enable build output compression
    compress: true,
    // Limit the number of concurrent tasks
    experimental: {
        cpus: 1
    }
};

export default nextConfig;
