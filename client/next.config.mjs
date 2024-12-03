/** @type {import('next').NextConfig} */

const nextConfig = {
    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/,
            use: ["@svgr/webpack"], // Allows importing SVGs as React components
        });
        return config;
    },
};

export default nextConfig;
