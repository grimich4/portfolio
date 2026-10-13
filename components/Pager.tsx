"use client";

import { useEffect, useRef, useState } from "react";
import Arrow from "@/components/Arrow";

/*
 * Accueil : un geste = un projet.
 *
 * Le défilement est piloté par un ressort critique (pas de durée fixe) :
 * - un nouveau geste pendant une transition change la cible sans arrêt
 *   ni à-coup, la vitesse acquise est conservée ;
 * - au doigt, la page suit puis repart avec l'élan du lâcher ;
 * - l'inertie du trackpad ne compte que pour un seul projet.
 * Cibles : les éléments [data-page], dans l'ordre du document.
 */

const W_WHEEL = 7.5; // raideur (rad/s) : ~0,65 s pour se poser
const W_TOUCH = 9; // un peu plus vif au doigt
const GAP = 160; // ms sans molette = nouveau geste
const VMAX = 6000; // px/s, élan maximal au lâcher

const tops = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-page]")).map((el) =>
    Math.min(el.offsetTop, document.documentElement.scrollHeight - innerHeight),
  );

const nearest = (y: number) => {
  const t = tops();
  let best = 0;
  t.forEach((v, i) => {
    if (Math.abs(v - y) < Math.abs(t[best] - y)) best = i;
  });
  return best;
};

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// n = nombre de cibles [data-page] (projets + pied de page).
export default function Pager({ n }: { n: number }) {
  const [idx, setIdx] = useState(0);
  const go = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    // État du ressort
    let pos = scrollY, vel = 0, tgt = nearest(scrollY), w = W_WHEEL;
    let raf = 0, running = false, last = 0;

    const clampIdx = (i: number) => Math.max(0, Math.min(tops().length - 1, i));

    const frame = (now: number) => {
      const dt = Math.min(0.034, (now - last) / 1000 || 0.016);
      last = now;
      const to = tops()[tgt] ?? 0;
      // Ressort critique, intégration semi-implicite (stable).
      vel += (w * w * (to - pos) - 2 * w * vel) * dt;
      pos += vel * dt;
      if (Math.abs(to - pos) < 0.5 && Math.abs(vel) < 8) {
        pos = to;
        vel = 0;
        scrollTo(0, to);
        running = false;
        return;
      }
      scrollTo(0, pos);
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      running = false;
    };

    const target = (i: number, opt: { stiff?: number; v?: number } = {}) => {
      tgt = clampIdx(i);
      setIdx(tgt);
      if (still()) {
        stop();
        pos = tops()[tgt] ?? 0;
        vel = 0;
        scrollTo(0, pos);
        return;
      }
      w = opt.stiff ?? W_WHEEL;
      if (!running) pos = scrollY;
      if (opt.v !== undefined) vel = opt.v;
      start();
    };
    go.current = (i) => target(i);

    // Point de départ d'un nouveau geste : la cible en cours si on est en
    // mouvement (on enchaîne), sinon le projet affiché.
    const base = () => (running ? tgt : nearest(scrollY));

    // ---- Molette / trackpad ----
    let lastEvt = 0, peak = 0, lastFire = 0;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return; // zoom
      e.preventDefault();
      const now = performance.now();
      const d = Math.abs(e.deltaY) * (e.deltaMode === 1 ? 16 : 1);
      // Nouveau geste : une pause, ou une accélération nette en pleine
      // inertie (on relance le trackpad avant la fin de l'élan).
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
      if (e.key === "Home") target(0);
      else if (e.key === "End") target(Infinity);
      else if (e.key in map) target(base() + map[e.key]);
      else return;
      e.preventDefault();
    };

    // ---- Tactile ----
    let drag = false, y0 = 0, s0 = 0, from = 0;
    let hist: { t: number; y: number }[] = [];
    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        drag = false;
        return;
      }
      // Le doigt rattrape la page en vol : on repart d'où elle est.
      from = running ? tgt : nearest(scrollY);
      stop();
      pos = scrollY;
      vel = 0;
      drag = true;
      y0 = e.touches[0].clientY;
      s0 = scrollY;
      hist = [{ t: performance.now(), y: y0 }];
    };
    const onMove = (e: TouchEvent) => {
      if (!drag || e.touches.length > 1) return;
      e.preventDefault();
      const y = e.touches[0].clientY;
      const t = performance.now();
      hist.push({ t, y });
      while (hist.length > 2 && t - hist[0].t > 100) hist.shift();
      scrollTo(0, s0 + (y0 - y));
    };
    const onEnd = (e: TouchEvent) => {
      if (!drag) return;
      drag = false;
      const y = e.changedTouches[0]?.clientY ?? y0;
      const dy = y0 - y;
      if (Math.abs(dy) < 4) return; // simple tap : le lien s'ouvre
      // Vitesse au lâcher, mesurée sur les ~100 dernières ms (px/s).
      const t = performance.now();
      const h = hist.find((p) => t - p.t <= 100) ?? hist[0];
      const v = Math.max(-VMAX, Math.min(VMAX, ((h.y - y) / Math.max(16, t - h.t)) * 1000));
      const flick = Math.abs(dy) > innerHeight * 0.18 || (Math.abs(dy) > 12 && Math.abs(v) > 300);
      const dir = flick ? Math.sign(Math.abs(v) > 300 ? v : dy) : 0;
      pos = scrollY;
      target(from + dir, { stiff: W_TOUCH, v });
    };

    // ---- Indicateur (flèches) quand on défile autrement ----
    let tick = 0;
    const onScroll = () => {
      if (running || drag) return;
      cancelAnimationFrame(tick);
      tick = requestAnimationFrame(() => setIdx(nearest(scrollY)));
    };

    // Rotation / largeur de fenêtre : on se recale (la barre d'adresse
    // mobile ne change que la hauteur : ignorée).
    let wd = innerWidth, rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      if (innerWidth === wd) return;
      wd = innerWidth;
      clearTimeout(rt);
      rt = setTimeout(() => {
        stop();
        pos = tops()[tgt] ?? 0;
        scrollTo(0, pos);
      }, 120);
    };

    tick = requestAnimationFrame(() => setIdx(nearest(scrollY)));
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
  }, []);

  const tab = "fixed right-3 z-30 bg-bg text-fg transition-[opacity,background-color,color] duration-700 md:right-8";
  const hid = "pointer-events-none opacity-0";

  return (
    <>
      <button
        onClick={() => go.current(idx - 1)}
        aria-label="Projet précédent"
        className={`${tab} top-[calc(3.5rem+env(safe-area-inset-top))] cursor-pointer pb-3 pl-3 pt-1 md:pb-4 md:pl-4 ${idx === 0 ? hid : ""}`}
      >
        <Arrow dir="up" />
      </button>
      <button
        onClick={() => go.current(idx + 1)}
        aria-label="Projet suivant"
        className={`${tab} bottom-3 cursor-pointer pl-3 pt-3 md:bottom-8 md:pl-4 md:pt-4 ${idx >= n - 2 ? hid : ""}`}
      >
        <Arrow dir="down" />
      </button>
    </>
  );
}
