"use client";

import Image from "next/image";
import type { Photo } from "@/lib/projects";

type Props = {
  p: Photo;
  sizes: string;
  className?: string;
  preload?: boolean;
};

// Marque l'image comme chargée (couvre aussi l'image déjà en cache).
export const show = (el: HTMLImageElement | null) => {
  if (el?.complete && el.naturalWidth) el.dataset.ok = "1";
};

// Image en mode `fill` : le parent fixe la taille (aspect-ratio).
// Apparaît en fondu sur une teinte entre les deux couleurs du projet.
export default function Img({ p, sizes, className = "", preload }: Props) {
  return (
    <Image
      ref={show}
      src={p.src}
      alt={p.alt}
      fill
      sizes={sizes}
      preload={preload}
      fetchPriority={preload ? "high" : undefined}
      onLoad={(e) => (e.currentTarget.dataset.ok = "1")}
      className={`fade object-cover ${className}`}
      draggable={false}
    />
  );
}
