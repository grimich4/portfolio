"use client";

import Image from "next/image";
import type { Photo } from "@/data/projects";

type Props = {
  p: Photo;
  sizes: string;
  className?: string;
  preload?: boolean;
};

const show = (el: HTMLImageElement | null) => {
  if (el?.complete && el.naturalWidth) el.dataset.ok = "1";
};

// Image en mode `fill` : le parent fixe la taille (aspect-ratio).
// Les photos locales ont un flou de chargement, les autres un fondu.
export default function Img({ p, sizes, className = "", preload }: Props) {
  const blur = typeof p.src !== "string" && !!p.src.blurDataURL;

  return (
    <Image
      // ref : couvre le cas d'une image déjà en cache avant l'hydratation.
      ref={blur ? undefined : show}
      src={p.src}
      alt={p.alt}
      fill
      sizes={sizes}
      preload={preload}
      fetchPriority={preload ? "high" : undefined}
      placeholder={blur ? "blur" : "empty"}
      onLoad={blur ? undefined : (e) => (e.currentTarget.dataset.ok = "1")}
      className={`${blur ? "" : "fade"} object-cover ${className}`}
      draggable={false}
    />
  );
}
