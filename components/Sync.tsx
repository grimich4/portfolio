"use client";

import { useEffect } from "react";

// Accueil : le site prend les couleurs du projet dont la couverture
// occupe le centre de l'écran.
export default function Sync() {
  useEffect(() => {
    const root = document.documentElement;
    const els = document.querySelectorAll<HTMLElement>("[data-bg]");
    const io = new IntersectionObserver(
      (es) => {
        for (const e of es) {
          if (!e.isIntersecting) continue;
          const { bg, fg } = (e.target as HTMLElement).dataset;
          if (bg && fg) {
            root.style.setProperty("--bg", bg);
            root.style.setProperty("--fg", fg);
          }
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.style.removeProperty("--bg");
      root.style.removeProperty("--fg");
    };
  }, []);

  return null;
}
