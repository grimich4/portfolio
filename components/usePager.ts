"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Défilement « un geste = une étape » (accueil : un projet, page projet :
 * une photo). Partagé par Pager et Gallery.
 *
 * - Molette / trackpad / clavier : glissé en ease-in-out (1 s). Un nouveau
 *   geste pendant le mouvement repart de la position et de la vitesse
 *   actuelles vers l'étape suivante : pas d'arrêt, pas d'à-coup.
 * - Tactile : la page suit le doigt puis se pose en douceur (ease-out).
 * - L'inertie du trackpad ne compte que pour une étape ; une relance nette
 *   pendant l'inertie compte comme un nouveau geste.
 * - Les positions des étapes sont mesurées au début d'un geste, jamais
 *   pendant l'animation (pas de recalcul de mise en page à chaque image).
 */

type Opts = {
  enabled?: boolean;
  // Positions de défilement (px) des étapes, dans l'ordre. Doit être une
  // fonction stable (définie hors du composant).
  stops: () => number[];
};

const GAP = 160; // ms sans molette = nouveau geste
const DUR = 1; // s, molette / clavier / flèches

const inOut = (s: number) => (s < 0.5 ? 4 * s * s * s : 1 - (-2 * s + 2) ** 3 / 2);
const dInOut = (s: number) => (s < 0.5 ? 12 * s * s : 12 * (1 - s) ** 2);
const out = (s: number) => 1 - (1 - s) ** 4;
const dOut = (s: number) => 4 * (1 - s) ** 3;

const still = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const maxScroll = () => document.documentElement.scrollHeight - innerHeight;

export function usePager({ enabled = true, stops }: Opts) {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const go = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    if (!enabled) return;

    let list: number[] = [];
    const measure = () => {
      const max = maxScroll();
      list = stops().map((y) => Math.round(Math.max(0, Math.min(max, y))));
      setCount(list.length);
      return list;
    };
    const nearest = (y: number) => {
      let best = 0;
      list.forEach((v, i) => {
        if (Math.abs(v - y) < Math.abs(list[best] - y)) best = i;
      });
      return best;
    };

    // Animation en cours : position = p0 + (p1-p0)·f(s) + v0·D·g(s), où
    // g(s) = s(1-s)² raccorde la vitesse de départ v0 (px/s) sans à-coup.
    type Anim = { p0: number; p1: number; v0: number; t0: number; D: number; f: typeof inOut; df: typeof inOut };
    let anim: Anim | null = null;
    let raf = 0, tgt = 0;

    const at = (a: Anim, now: number) => {
      const s = Math.min(1, (now - a.t0) / 1000 / a.D);
      const g = s * (1 - s) ** 2;
      const dg = (1 - s) * (1 - 3 * s);
      return {
        s,
        p: a.p0 + (a.p1 - a.p0) * a.f(s) + a.v0 * a.D * g,
        v: ((a.p1 - a.p0) * a.df(s)) / a.D + a.v0 * dg,
      };
    };

    const frame = (now: number) => {
      if (!anim) return;
      const { s, p } = at(anim, now);
      scrollTo(0, s >= 1 ? anim.p1 : p);
      if (s >= 1) anim = null;
      else raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      anim = null;
    };

    const target = (i: number, opt: { touch?: boolean } = {}) => {
      if (!list.length) measure();
      tgt = Math.max(0, Math.min(list.length - 1, i));
      setIdx(tgt);
      const p1 = list[tgt];
      const now = performance.now();
      if (still()) {
        stop();
        scrollTo(0, p1);
        return;
      }
      // Repart de l'état actuel : position et vitesse si on est en mouvement.
      const cur = anim ? at(anim, now) : { p: scrollY, v: 0 };
      cancelAnimationFrame(raf);
      const dist = Math.abs(p1 - cur.p) / innerHeight;
      anim = opt.touch
        ? { p0: cur.p, p1, v0: 0, t0: now, D: 0.42 + 0.48 * Math.min(1, dist), f: out, df: dOut }
        : { p0: cur.p, p1, v0: cur.v, t0: now, D: DUR, f: inOut, df: dInOut };
      if (Math.abs(p1 - cur.p) < 1 && Math.abs(cur.v) < 1) {
        anim = null;
        scrollTo(0, p1);
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const base = () => {
      if (anim) return tgt;
      measure();
      return nearest(scrollY);
    };
    go.current = (i) => {
      if (!anim) measure();
      target(i);
    };

    // ---- Molette / trackpad ----
    let lastEvt = 0, peak = 0, lastFire = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // zoom
      e.preventDefault();
      const now = performance.now();
      const d = Math.abs(e.deltaY) * (e.deltaMode === 1 ? 16 : 1);
      const fresh = now - lastEvt > GAP || (d > peak * 1.6 && d > 18 && now - lastFire > 280);
      lastEvt = now;
      peak = fresh ? d : Math.max(peak * 0.92, d);
      if (!fresh || d < 2) return;
      lastFire = now;
      target(base() + Math.sign(e.deltaY));
    };

    // ---- Clavier ----
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const map: Record<string, number> = {
        ArrowDown: 1, PageDown: 1, " ": e.shiftKey ? -1 : 1, ArrowUp: -1, PageUp: -1,
      };
      if (e.key === "Home") {
        measure();
        target(0);
      } else if (e.key === "End") {
        measure();
        target(Infinity);
      } else if (e.key in map) target(base() + map[e.key]);
      else return;
      e.preventDefault();
    };

    // ---- Tactile ----
    let drag = false, y0 = 0, s0 = 0, t0 = 0, from = 0;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        drag = false;
        return;
      }
      from = anim ? tgt : (measure(), nearest(scrollY)); // rattrapée en vol : on enchaîne
      stop();
      drag = true;
      y0 = e.touches[0].clientY;
      s0 = scrollY;
      t0 = performance.now();
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
      if (Math.abs(dy) < 4) return; // simple tap : le lien s'ouvre
      const v = dy / Math.max(1, performance.now() - t0); // px/ms
      const flick = Math.abs(dy) > innerHeight * 0.18 || (Math.abs(dy) > 12 && Math.abs(v) > 0.3);
      target(from + (flick ? Math.sign(dy) : 0), { touch: true });
    };

    // ---- Suivi de l'étape quand on défile autrement (barre, ancre) ----
    let tick = 0;
    const onScroll = () => {
      if (anim || drag) return;
      cancelAnimationFrame(tick);
      tick = requestAnimationFrame(() => {
        if (!list.length) measure();
        setIdx(nearest(scrollY));
      });
    };

    // Changement de largeur (rotation, fenêtre) : on remesure et on se recale.
    // La barre d'adresse mobile ne change que la hauteur : ignorée.
    let wd = innerWidth, rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      if (innerWidth === wd) return;
      wd = innerWidth;
      clearTimeout(rt);
      rt = setTimeout(() => {
        const i = anim ? tgt : nearest(scrollY);
        stop();
        measure();
        scrollTo(0, list[Math.min(i, list.length - 1)] ?? 0);
      }, 150);
    };

    tick = requestAnimationFrame(() => {
      measure();
      setIdx(nearest(scrollY));
    });
    const active = { passive: false } as const;
    addEventListener("wheel", onWheel, active);
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onStart, { passive: true });
    addEventListener("touchmove", onMove, active);
    addEventListener("touchend", onEnd);
    addEventListener("touchcancel", onEnd);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onResize);
    return () => {
      stop();
      cancelAnimationFrame(tick);
      clearTimeout(rt);
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", onStart);
      removeEventListener("touchmove", onMove);
      removeEventListener("touchend", onEnd);
      removeEventListener("touchcancel", onEnd);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", onResize);
    };
  }, [enabled, stops]); // stops : fonction stable (définie hors composant)

  return { idx, count, go: (i: number) => go.current(i) };
}
