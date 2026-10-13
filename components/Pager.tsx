"use client";

import Arrow from "@/components/Arrow";
import { usePager } from "@/components/usePager";

// Accueil : une étape par projet (+ le pied de page), flèches haut/bas.
const stops = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-page]")).map((el) => el.offsetTop);

export default function Pager() {
  const { idx, count, go } = usePager({ stops });

  const tab = "fixed right-3 z-30 bg-bg text-fg transition-[opacity,background-color,color] duration-700 md:right-8";
  const hid = "pointer-events-none opacity-0";

  return (
    <>
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
