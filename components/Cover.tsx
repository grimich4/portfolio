"use client";

import { getImageProps } from "next/image";
import { show } from "@/components/Img";
import { loaderFor } from "@/components/variant";
import type { Project } from "@/lib/projects";

const WIDE = "(min-aspect-ratio: 1/1)";

// Couverture « art direction » : paysage sur écran large, portrait sur
// écran en hauteur (téléphone). Le navigateur ne charge que la bonne.
// Aperçu flou de la bonne couverture affiché instantanément en dessous.
export default function Cover({ p, eager, first }: { p: Project; eager?: boolean; first?: boolean }) {
  const base = { alt: p.title, fill: true, sizes: "100vw" } as const;
  const { desk, mob } = p.cover;
  const { props: dk } = getImageProps({ ...base, src: desk.src, loader: loaderFor(desk) });
  const { props: mb } = getImageProps({ ...base, src: mob.src, loader: loaderFor(mob) });
  const bg = (b?: string) => (b ? { backgroundImage: `url("${b}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined);

  return (
    <>
      <span aria-hidden className="absolute inset-0 [@media(min-aspect-ratio:1/1)]:hidden" style={bg(mob.v?.blur)} />
      <span aria-hidden className="absolute inset-0 hidden [@media(min-aspect-ratio:1/1)]:block" style={bg(desk.v?.blur)} />
      <picture>
        <source media={WIDE} srcSet={dk.srcSet} sizes="100vw" />
        <img
          {...mb}
          ref={show}
          alt={p.title}
          loading={first || eager ? "eager" : "lazy"}
          fetchPriority={first ? "high" : eager ? "low" : undefined}
          onLoad={(e) => (e.currentTarget.dataset.ok = "1")}
          className="fade object-cover"
          draggable={false}
        />
      </picture>
    </>
  );
}
