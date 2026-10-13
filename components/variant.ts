import type { ImageLoader } from "next/image";
import type { Photo } from "@/lib/projects";

// Loader next/image vers les variantes WebP pré-calculées : la plus petite
// largeur disponible ≥ largeur demandée. Sans variantes (dev, image
// distante) : optimiseur Next habituel.
export const loaderFor = (p: Photo): ImageLoader | undefined => {
  const v = p.v;
  if (!v) return undefined;
  return ({ width }) => `${v.base}-${v.widths.find((w) => w >= width) ?? v.widths.at(-1)}.webp`;
};
