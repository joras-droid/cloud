import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Required for the slim Docker runtime image.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Menu images are capped at 1200px; anything larger is wasted bytes on a
    // phone and blows the LCP budget.
    deviceSizes: [360, 480, 640, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflarestorage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Menu videos are allowed up to 15 MB; the multipart wrapper needs a little extra.
    serverActions: {
      bodySizeLimit: "18mb",
    },
  },
};

export default withNextIntl(nextConfig);
