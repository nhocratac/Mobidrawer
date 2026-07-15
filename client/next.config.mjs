/** @type {import('next').NextConfig} */

const nextConfig = {
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"], // Allows importing SVGs as React components
    });
    if (isServer) {
      // konva's node entry requires the native "canvas" package; alias it away
      // so the server bundle never tries to load it (dev SSR included).
      config.resolve.alias = { ...config.resolve.alias, canvas: false };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "miro.com",
      },
      {
        protocol:"https",
        hostname:"cdn.builder.io"
      }
    ],
  },
};

export default nextConfig;
