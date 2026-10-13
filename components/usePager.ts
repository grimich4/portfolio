"use client";

import { useEffect, useRef, useState } from "react";

/*
 * Défilement « un geste = une étape » (accueil : un projet, page projet :
 * une photo). Partagé par Pager et Gallery.
 *
 * - Molette / trackpad / clavier / flèches : défilement fluide NATIF du
 *   navigateur (scrollTo smooth). Il est calculé hors du fil JavaScript,
 *   donc sans saccade, et un nouveau geste en cours de route est enchaîné
 *   par le navigateur lui-même.
 * - Tactile : la page suit le doigt, puis se pose en douceur (ease-out).
 * - L'inertie du trackpad ne compte que pour une étape ; une relance nette
 *   pendant l'inertie compte comme un nouveau geste.
 * - Positions mesurées au début d'un geste, jamais pendant le mouvement.
 * - Le mouvement est conservé même si le système demande de réduire les
 *   animations (sinon la page « saute » d'un projet à l'autre).
 */

type Opts = {
  enabled?: boolean;
  // Positions de défilement (px) des étapes, dans l'ordre. Doit être une
  // fonction stable (définie hors du composant).
  stops: () => number[];
};

const GAP = 160; // ms sans molette = nouveau geste
const out = (s: number) => 1 - (1 - s) ** 4;

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

    // « En mouvement » tant que la page n'est pas arrivée sur l'étape visée.
    let tgt = 0, moving = false, raf = 0, settle: ReturnType<typeof setTimeout>;
    const arrived = () => {
      moving = false;
      clearTimeout(settle);
    };
    const watch = () => {
      clearTimeout(settle);
      settle = setTimeout(arrived, 1400); // filet si scrollend n'arrive pas
    };

    const target = (i: number) => {
      if (!list.length) measure();
      tgt = Math.max(0, Math.min(list.length - 1, i));
      setIdx(tgt);
      cancelAnimationFrame(raf);
      if (Math.abs(list[tgt] - scrollY) < 1) return arrived();
      moving = true;
      watch();
      scrollTo({ top: list[tgt], behavior: "smooth" });
    };

    const base = () => {
      if (moving) return tgt; // geste pendant le mouvement : on enchaîne
      measure();
      return nearest(scrollY);
    };
    go.current = (i) => {
      if (!moving) measure();
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

    // ---- Tactile : suivi du doigt puis atterrissage ease-out ----
    let drag = false, y0 = 0, s0 = 0, t0 = 0, from = 0;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        drag = false;
        return;
      }
      from = moving ? tgt : (measure(), nearest(scrollY));
      cancelAnimationFrame(raf);
      // Fige un éventuel défilement en cours là où il est.
      if (moving) scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
      arrived();
      drag = true;
      y0 = e.touches[0].clientY;
      s0 = scrollY;
      t0 = performance.now();
    };
    const onMove = (e: TouchEvent) => {
      if (!drag || e.touches.length > 1) return;
      e.preventDefault();
      scrollTo({ top: s0 + (y0 - e.touches[0].clientY), behavior: "instant" as ScrollBehavior });
    };
    const onEnd = (e: TouchEvent) => {
      if (!drag) return;
      drag = false;
      const dy = y0 - (e.changedTouches[0]?.clientY ?? y0);
      if (Math.abs(dy) < 4) return; // simple tap : le lien s'ouvre
      const v = dy / Math.max(1, performance.now() - t0); // px/ms
      const flick = Math.abs(dy) > innerHeight * 0.18 || (Math.abs(dy) > 12 && Math.abs(v) > 0.3);
      if (!list.length) measure();
      tgt = Math.max(0, Math.min(list.length - 1, from + (flick ? Math.sign(dy) : 0)));
      setIdx(tgt);
      const p0 = scrollY, p1 = list[tgt];
      const D = 420 + 480 * Math.min(1, Math.abs(p1 - p0) / innerHeight);
      const start = performance.now();
      moving = true;
      watch();
      const step = (now: number) => {
        const s = Math.min(1, (now - start) / D);
        scrollTo({ top: p0 + (p1 - p0) * out(s), behavior: "instant" as ScrollBehavior });
        if (s < 1) raf = requestAnimationFrame(step);
        else arrived();
      };
      raf = requestAnimationFrame(step);
    };

    // ---- Fin de mouvement / suivi de l'étape ----
    const onScrollEnd = () => {
      if (drag) return;
      if (moving && Math.abs(scrollY - (list[tgt] ?? scrollY)) <= 2) arrived();
      if (!moving) setIdx(nearest(scrollY));
    };
    let tick = 0;
    const onScroll = () => {
      if (moving || drag) return;
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
        const i = moving ? tgt : nearest(scrollY);
        measure();
        arrived();
        scrollTo({ top: list[Math.min(i, list.length - 1)] ?? 0, behavior: "instant" as ScrollBehavior });
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
    addEventListener("scrollend", onScrollEnd);
    addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(tick);
      clearTimeout(settle);
      clearTimeout(rt);
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", onStart);
      removeEventListener("touchmove", onMove);
      removeEventListener("touchend", onEnd);
      removeEventListener("touchcancel", onEnd);
      removeEventListener("scroll", onScroll);
      removeEventListener("scrollend", onScrollEnd);
      removeEventListener("resize", onResize);
    };
  }, [enabled, stops]);

  return { idx, count, go: (i: number) => go.current(i) };
}
