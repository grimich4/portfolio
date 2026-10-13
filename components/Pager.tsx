"use client";

import { useRef } from "react";
import Arrow from "@/components/Arrow";
import { useTrack } from "@/components/useTrack";

// Accueil : le contenu glisse d'un projet à l'autre (une étape par
// [data-page]), dans un conteneur fixe plein écran.
const stops = (track: HTMLElement) =>
  Array.from(track.querySelectorAll<HTMLElement>("[data-page]")).map((el) => el.offsetTop);

// Arrivée depuis « ← Projets » : on se place directement sur le projet (#slug).
const start = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return 0;
  const all = Array.from(document.querySelectorAll<HTMLElement>("[data-page]"));
  return Math.max(0, all.findIndex((el) => el.id === id));
};

export default function Pager({ children }: { children: React.ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const { idx, count, go } = useTrack({ track, stops, start });

  const tab = "fixed right-3 z-30 bg-bg text-fg transition-[opacity,background-color,color] duration-700 md:right-8";
  const hid = "pointer-events-none opacity-0";

  return (
    <>
      <div className="fixed inset-0 overflow-hidden">
        <div ref={track} data-track className="will-change-transform">
          {children}
        </div>
      </div>
      <button
        onClick={() => go(idx - 1)}
        aria-label="Projet précédent"
        className={`${tab} top-[calc(3.5rem+env(safe-area-inset-top))] cursor-pointer pb-3 pl-3 pt-1 md:pb-4 md:pl-4 ${idx === 0 ? hid : ""}`}
      >
        <Arrow dir="up" />
      </button>
      <button
        onClick={() => go(idx + 1)}
        aria-label="Projet suivant"
        className={`${tab} bottom-3 cursor-pointer pl-3 pt-3 md:bottom-8 md:pl-4 md:pt-4 ${!count || idx >= count - 2 ? hid : ""}`}
      >
        <Arrow dir="down" />
      </button>
    </>
  );
}
