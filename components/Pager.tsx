"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Arrow from "@/components/Arrow";

/*
 * Accueil : un geste de défilement = un projet.
 * - Souris / trackpad / clavier : animation maison (easing doux), un geste
 *   continu (inertie du trackpad comprise) ne fait avancer que d'un projet.
 * - Écrans tactiles : scroll-snap natif (glisser = un projet).
 * Cibles : tous les éléments [data-page] dans l'ordre du document.
 */

const DUR = 1000;
const GAP = 180; // ms sans événement molette = nouveau geste
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const tops = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-page]")).map((el) =>
    Math.min(el.offsetTop, document.documentElement.scrollHeight - innerHeight),
  );

const near = () => {
  const t = tops();
  let best = 0;
  t.forEach((y, i) => {
    if (Math.abs(y - scrollY) < Math.abs(t[best] - scrollY)) best = i;
  });
  return best;
};

// n = nombre de cibles [data-page] (projets + pied de page).
export default function Pager({ n }: { n: number }) {
  const [idx, setIdx] = useState(0);
  const busy = useRef(false);

  const go = useCallback((i: number) => {
    const t = tops();
    if (!t.length) return;
    i = Math.max(0, Math.min(t.length - 1, i));
    const to = t[i];
    const from = scrollY;
    setIdx(i);
    const touch = matchMedia("(pointer: coarse)").matches;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (touch || still) {
      scrollTo({ top: to, behavior: still ? "auto" : "smooth" });
      return;
    }
    busy.current = true;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / DUR);
      scrollTo(0, from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step);
      else busy.current = false;
    };
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || matchMedia("(pointer: coarse)").matches) return;
      e.preventDefault();
      const now = performance.now();
      const fresh = now - last > GAP;
      last = now;
      if (busy.current || !fresh || Math.abs(e.deltaY) < 3) return;
      go(near() + (e.deltaY > 0 ? 1 : -1));
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const map: Record<string, number> = {
        ArrowDown: 1, PageDown: 1, " ": e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1,
      };
      if (e.key === "Home" || e.key === "End") {
        e.preventDefault();
        if (!busy.current) go(e.key === "Home" ? 0 : Infinity);
      } else if (e.key in map) {
        e.preventDefault();
        if (!busy.current) go(near() + map[e.key]);
      }
    };

    let raf = 0;
    const onScroll = () => {
      if (busy.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setIdx(near()));
    };

    // Après redimensionnement, on se recale sur le projet courant.
    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => scrollTo(0, tops()[near()] ?? 0), 120);
    };

    raf = requestAnimationFrame(() => setIdx(near()));
    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("keydown", onKey);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    return () => {
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
      clearTimeout(rt);
    };
  }, [go]);

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
        className={`${tab} bottom-3 cursor-pointer pl-3 pt-3 md:bottom-8 md:pl-4 md:pt-4 ${idx >= n - 2 ? hid : ""}`}
      >
        <Arrow dir="down" />
      </button>
    </>
  );
}
