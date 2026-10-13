"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Arrow from "@/components/Arrow";

/*
 * Accueil : un geste = un projet.
 * - Molette / trackpad / clavier : glissé animé, un geste continu
 *   (inertie du trackpad comprise) n'avance que d'un projet.
 * - Tactile : la page suit le doigt, puis termine le mouvement en douceur
 *   vers le projet suivant, précédent, ou revient au projet courant.
 * Cibles : les éléments [data-page], dans l'ordre du document.
 */

const GAP = 180; // ms sans molette = nouveau geste
const inOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const out = (t: number) => 1 - Math.pow(1 - t, 4);

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

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// n = nombre de cibles [data-page] (projets + pied de page).
export default function Pager({ n }: { n: number }) {
  const [idx, setIdx] = useState(0);
  const busy = useRef(false);
  const run = useRef(0); // identifiant de l'animation en cours

  const go = useCallback((i: number, opt: { touch?: boolean } = {}) => {
    const t = tops();
    if (!t.length) return;
    i = Math.max(0, Math.min(t.length - 1, i));
    setIdx(i);
    const to = t[i];
    const from = scrollY;
    const id = ++run.current;
    if (still() || from === to) {
      scrollTo(0, to);
      busy.current = false;
      return;
    }
    // Tactile : durée selon la distance restante, départ rapide (suite du doigt).
    const dist = Math.abs(to - from) / innerHeight;
    const dur = opt.touch ? 420 + 480 * Math.min(1, dist) : 1000;
    const ease = opt.touch ? out : inOut;
    busy.current = true;
    const t0 = performance.now();
    const step = (now: number) => {
      if (id !== run.current) return; // interrompue
      const k = Math.min(1, (now - t0) / dur);
      scrollTo(0, from + (to - from) * ease(k));
      if (k < 1) requestAnimationFrame(step);
      else busy.current = false;
    };
    requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    let raf = requestAnimationFrame(() => setIdx(near()));

    // Molette / trackpad
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // zoom
      e.preventDefault();
      const now = performance.now();
      const fresh = now - last > GAP;
      last = now;
      if (busy.current || !fresh || Math.abs(e.deltaY) < 3) return;
      go(near() + (e.deltaY > 0 ? 1 : -1));
    };

    // Clavier
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

    // Tactile
    let y0 = 0, s0 = 0, t0 = 0, base = 0, drag = false;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        drag = false;
        return;
      }
      run.current++; // le doigt reprend la main sur une animation en cours
      busy.current = false;
      drag = true;
      y0 = e.touches[0].clientY;
      s0 = scrollY;
      t0 = performance.now();
      base = near();
    };
    const onMove = (e: TouchEvent) => {
      if (!drag || e.touches.length > 1) return;
      e.preventDefault();
      scrollTo(0, s0 + (y0 - e.touches[0].clientY));
    };
    const onEnd = (e: TouchEvent) => {
      if (!drag) return;
      drag = false;
      const dy = y0 - (e.changedTouches[0]?.clientY ?? y0);
      if (Math.abs(dy) < 4) return; // simple tap : on laisse le lien s'ouvrir
      const v = dy / Math.max(1, performance.now() - t0); // px/ms
      const flick = Math.abs(dy) > innerHeight * 0.18 || (Math.abs(dy) > 12 && Math.abs(v) > 0.3);
      go(base + (flick ? Math.sign(dy) : 0), { touch: true });
    };

    const onScroll = () => {
      if (busy.current || drag) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setIdx(near()));
    };

    // Changement de largeur (rotation, fenêtre) : on se recale.
    // La barre d'adresse mobile ne change que la hauteur : ignorée.
    let w = innerWidth;
    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      if (innerWidth === w) return;
      w = innerWidth;
      clearTimeout(rt);
      rt = setTimeout(() => scrollTo(0, tops()[near()] ?? 0), 120);
    };

    const active = { passive: false } as const;
    addEventListener("wheel", onWheel, active);
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onStart, { passive: true });
    addEventListener("touchmove", onMove, active);
    addEventListener("touchend", onEnd);
    addEventListener("touchcancel", onEnd);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    const r = run;
    return () => {
      r.current++;
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", onStart);
      removeEventListener("touchmove", onMove);
      removeEventListener("touchend", onEnd);
      removeEventListener("touchcancel", onEnd);
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
