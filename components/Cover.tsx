"use client";

import { getImageProps } from "next/image";
import { show } from "@/components/Img";
import type { Project } from "@/lib/projects";

// Couverture « art direction » : paysage sur écran large, portrait sur
// écran en hauteur (téléphone). Le navigateur ne charge que la bonne.
export default function Cover({ p, first }: { p: Project; first?: boolean }) {
  const base = { alt: p.title, fill: true, sizes: "100vw" } as const;
  const { desk, mob } = p.cover;
  const { props: dk } = getImageProps({ ...base, src: desk.src });
  const { props: mb } = getImageProps({ ...base, src: mob.src, fetchPriority: first ? "high" : undefined });

  return (
    <picture>
      <source media="(min-aspect-ratio: 1/1)" srcSet={dk.srcSet} sizes="100vw" />
      <img
        {...mb}
        ref={show}
        alt={p.title}
        loading={first ? "eager" : "lazy"}
        onLoad={(e) => (e.currentTarget.dataset.ok = "1")}
        className="fade object-cover"
        draggable={false}
      />
    </picture>
  );
}
