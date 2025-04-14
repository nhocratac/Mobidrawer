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
            // Add memory optimizations
            removeAvailableModules: false,
            removeEmptyChunks: false,
            splitChunks: false,
        };
        
        return config;
    },
    // Add production build optimizations
    swcMinify: true,
    poweredByHeader: false,
    reactStrictMode: false,
    // Enable build output compression
    compress: true,
    // Limit the number of concurrent tasks and disable memory-intensive features
    experimental: {
        cpus: 1,
        optimizeCss: false,
        optimizePackageImports: [], // Changed from false to empty array
    },
    // Reduce image optimization memory usage
    images: {
        minimumCacheTTL: 60,
        disableStaticImages: false,
    },
    // Disable source maps in production
    productionBrowserSourceMaps: false,
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"], // Allows importing SVGs as React components
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
