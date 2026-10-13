import type { NextConfig } from "next";

const cfg: NextConfig = {
  images: {
    // Les photos locales passent par des variantes WebP pré-calculées
    // (scripts/variants.mjs) : ces largeurs doivent correspondre à WIDTHS.
    deviceSizes: [480, 828, 1200, 1680, 2400],
    imageSizes: [160, 320],
    formats: ["image/webp"],
    minimumCacheTTL: 31536000,
    // Images temporaires : à retirer quand toutes les photos seront locales.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
  // Variantes d'images : nom avec empreinte → cache navigateur/CDN d'un an.
  async headers() {
    return [{ source: "/_img/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
  async redirects() {
    return [{ source: "/about", destination: "/a-propos", permanent: true }];
  },
};

export default cfg;
