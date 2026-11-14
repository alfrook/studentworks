import type { NextConfig } from "next";

// Static export so the site runs free on GitHub Pages (no server).
// For the project page at alfrook.github.io/studentworks set NEXT_PUBLIC_BASE_PATH=/studentworks when building.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
