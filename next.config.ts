import type { NextConfig } from "next";

const cfg: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 31536000,
    // Images temporaires : à retirer quand toutes les photos seront locales.
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "fastly.picsum.photos" },
    ],
  },
  async redirects() {
    return [{ source: "/about", destination: "/a-propos", permanent: true }];
  },
};

export default cfg;
