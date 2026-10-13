"use client";

import Image from "next/image";
import { loaderFor } from "@/components/variant";
import type { Photo } from "@/lib/projects";

type Props = {
  p: Photo;
  sizes: string;
  className?: string;
  preload?: boolean;
  eager?: boolean; // voisine de la photo affichée : on la charge d'avance
};

// Marque l'image comme chargée (couvre aussi l'image déjà en cache).
export const show = (el: HTMLImageElement | null) => {
  if (el?.complete && el.naturalWidth) el.dataset.ok = "1";
};

// Image en mode `fill` : le parent fixe la taille (aspect-ratio).
// Aperçu flou instantané (intégré à la page), puis la photo nette en fondu court.
export default function Img({ p, sizes, className = "", preload, eager }: Props) {
  const blur = p.v?.blur;
  return (
    <Image
      ref={show}
      src={p.src}
      loader={loaderFor(p)}
      alt={p.alt}
      fill
      sizes={sizes}
      preload={preload}
      loading={preload || eager ? "eager" : "lazy"}
      fetchPriority={preload ? "high" : eager ? "low" : undefined}
      placeholder={blur ? "blur" : "empty"}
      blurDataURL={blur}
      onLoad={(e) => (e.currentTarget.dataset.ok = "1")}
      className={`${blur ? "" : "fade"} object-cover ${className}`}
      draggable={false}
    />
  );
}
