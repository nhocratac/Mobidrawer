/** @type {import('next').NextConfig} */

const nextConfig = {
  webpack(config, { isServer }) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"], // Allows importing SVGs as React components
    });
    if (isServer) {
      config.externals.push({ canvas: "canvas" });
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
