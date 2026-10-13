"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

/*
 * « Un geste = une étape », par glissement du contenu (transform), pas par
 * défilement de la page :
 * - transition CSS sur `transform` → calculée par la carte graphique,
 *   précision au sous-pixel : pas de saccade, même en fin de ralenti ;
 * - indépendant des réglages de défilement du système (Windows peut couper
 *   le défilement fluide natif) ;
 * - un geste pendant le mouvement repart de la position actuelle ;
 * - au doigt : le contenu suit le doigt, puis se pose avec l'élan du lâcher.
 *
 * `track` : l'élément qui glisse, placé dans un conteneur fixe plein écran
 * (overflow hidden). `stops(track)` : positions (px, depuis le haut du
 * contenu) des étapes. Doit être une fonction stable.
 */

type Opts = {
  track: RefObject<HTMLElement | null>;
  enabled?: boolean;
  stops: (track: HTMLElement) => number[];
  start?: () => number; // étape de départ (ex. ancre #projet)
};

const GAP = 160; // ms sans molette = nouveau geste
const DUR = 950; // ms, molette / clavier / flèches
// Départ franc (pente initiale ~0,4) puis long atterrissage en douceur.
const IN_OUT: [number, number, number, number] = [0.25, 0.1, 0.1, 1];
const OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function useTrack({ track, enabled = true, stops, start }: Opts) {
  const [idx, setIdx] = useState(0);
  const [count, setCount] = useState(0);
  const go = useRef<(i: number) => void>(() => {});

  useEffect(() => {
    const el = track.current;
    if (!enabled || !el) return;
    const box = el.parentElement!;

    let list: number[] = [];
    let max = 0;
    const measure = () => {
      max = Math.max(0, el.scrollHeight - box.clientHeight);
      list = stops(el).map((y) => Math.max(0, Math.min(max, y)));
    };
    // État React (flèches) mis à jour hors du fil de l'effet.
    let pub = 0;
    const publish = () => {
      cancelAnimationFrame(pub);
      pub = requestAnimationFrame(() => {
        box.scrollTo(0, 0); // une ancre (#projet) a pu faire défiler le conteneur
        setCount(list.length);
        setIdx(tgt);
      });
    };

    // Position réellement affichée (y compris en pleine transition).
    let y = 0;
    const shown = () => {
      const t = getComputedStyle(el).transform;
      if (!t || t === "none") return y;
      const m = new DOMMatrixReadOnly(t);
      return -m.m42;
    };
    const nearest = (p: number) => {
      let best = 0;
      list.forEach((v, i) => {
        if (Math.abs(v - p) < Math.abs(list[best] - p)) best = i;
      });
      return best;
    };

    // Transition en cours (pour connaître la vitesse à tout instant).
    type Bez = [number, number, number, number];
    let seg: { p0: number; p1: number; t0: number; ms: number; b: Bez } | null = null;

    let tgt = 0, moving = false, done: ReturnType<typeof setTimeout>;
    const place = (p: number, ms = 0, b: Bez = IN_OUT) => {
      const from = y;
      y = p;
      el.style.setProperty("transition", ms ? `transform ${ms}ms cubic-bezier(${b.join(",")})` : "none", "important");
      el.style.transform = `translate3d(0, ${-p}px, 0)`;
      clearTimeout(done);
      moving = ms > 0;
      seg = moving ? { p0: from, p1: p, t0: performance.now(), ms, b } : null;
      if (moving) done = setTimeout(() => ((moving = false), (seg = null)), ms + 30);
    };

    // Vitesse actuelle (px/ms) d'après la courbe de la transition en cours.
    const speed = () => {
      if (!seg) return 0;
      const s = Math.min(1, (performance.now() - seg.t0) / seg.ms);
      if (s >= 1) return 0;
      const [x1, y1, x2, y2] = seg.b;
      const bx = (u: number) => 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3;
      const dx = (u: number) => 3 * x1 * (1 - u) ** 2 + 6 * (x2 - x1) * u * (1 - u) + 3 * (1 - x2) * u * u;
      const dyu = (u: number) => 3 * y1 * (1 - u) ** 2 + 6 * (y2 - y1) * u * (1 - u) + 3 * (1 - y2) * u * u;
      let u = s;
      for (let k = 0; k < 8; k++) u = Math.max(0, Math.min(1, u - (bx(u) - s) / (dx(u) || 1e-6)));
      return ((dyu(u) / (dx(u) || 1e-6)) * (seg.p1 - seg.p0)) / seg.ms;
    };

    const target = (i: number) => {
      if (!list.length) measure();
      tgt = Math.max(0, Math.min(list.length - 1, i));
      publish();
      const was = moving;
      const v = speed();
      // En vol : on repart d'une image en avance (sinon la première image de
      // la nouvelle transition répète la position actuelle = micro-arrêt).
      const from = was ? shown() + v * 16 : y;
      if (was) place(from);
      const dist = list[tgt] - from;
      if (Math.abs(dist) < 0.5) return place(list[tgt]);
      void el.offsetHeight; // fige la position de départ avant la transition
      if (was && v * dist > 0) {
        // Enchaînement en plein mouvement : la nouvelle courbe démarre à la
        // vitesse actuelle (pente initiale = v·durée/distance), sans à-coup.
        const x1 = 0.3;
        let ms = DUR * 0.85;
        let y1 = ((v * ms) / dist) * x1;
        if (y1 > 1) {
          ms = Math.max(350, (dist / v) / x1);
          y1 = Math.min(1, ((v * ms) / dist) * x1);
        }
        place(list[tgt], Math.round(ms), [x1, y1, 0.35, 1]);
      } else place(list[tgt], DUR, IN_OUT);
    };
    const base = () => (moving ? tgt : nearest(y));
    go.current = (i) => target(i);

    // ---- Départ ----
    box.scrollTo(0, 0);
    measure();
    tgt = Math.max(0, Math.min(list.length - 1, start?.() ?? 0));
    publish();
    place(list[tgt] ?? 0);

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
      if (e.key === "Home") target(0);
      else if (e.key === "End") target(Infinity);
      else if (e.key in map) target(base() + map[e.key]);
      else return;
      e.preventDefault();
    };

    // ---- Tactile ----
    let drag = false, y0 = 0, p0 = 0, from = 0;
    let hist: { t: number; y: number }[] = [];
    const onStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        drag = false;
        return;
      }
      p0 = moving ? shown() : y; // rattrapé en vol : on fige où il est
      from = moving ? tgt : nearest(p0);
      place(p0);
      drag = true;
      y0 = e.touches[0].clientY;
      hist = [{ t: performance.now(), y: y0 }];
    };
    const onMove = (e: TouchEvent) => {
      if (!drag || e.touches.length > 1) return;
      e.preventDefault();
      const cy = e.touches[0].clientY;
      const t = performance.now();
      hist.push({ t, y: cy });
      while (hist.length > 2 && t - hist[0].t > 100) hist.shift();
      let p = p0 + (y0 - cy);
      // Résistance élastique au-delà des bords.
      if (p < 0) p *= 0.35;
      if (p > max) p = max + (p - max) * 0.35;
      place(p);
    };
    const onEnd = (e: TouchEvent) => {
      if (!drag) return;
      drag = false;
      const cy = e.changedTouches[0]?.clientY ?? y0;
      const dy = y0 - cy;
      if (Math.abs(dy) < 4) {
        place(Math.max(0, Math.min(max, y)));
        return; // simple tap : le lien s'ouvre
      }
      const t = performance.now();
      const h = hist.find((q) => t - q.t <= 100) ?? hist[0];
      const v = (h.y - cy) / Math.max(16, t - h.t); // px/ms, > 0 vers le bas
      const flick = Math.abs(dy) > innerHeight * 0.18 || (Math.abs(dy) > 12 && Math.abs(v) > 0.3);
      const i = Math.max(0, Math.min(list.length - 1, from + (flick ? Math.sign(Math.abs(v) > 0.3 ? v : dy) : 0)));
      // Durée selon la distance restante et l'élan : rapide si on lance fort.
      const dist = Math.abs(list[i] - y);
      const ms = Math.round(Math.max(380, Math.min(900, dist / Math.max(0.9, Math.abs(v) * 0.9) + 220)));
      tgt = i;
      publish();
      void el.offsetHeight;
      place(list[i], ms, OUT);
    };

    // Le focus clavier ne doit pas faire défiler le conteneur fixe.
    const onBoxScroll = () => {
      if (box.scrollTop) box.scrollTo(0, 0);
    };

    // Taille de fenêtre : on remesure et on se recale, sans animation.
    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        measure();
        tgt = Math.min(tgt, list.length - 1);
        place(list[tgt] ?? 0);
        publish();
      }, 120);
    };

    const active = { passive: false } as const;
    addEventListener("wheel", onWheel, active);
    addEventListener("keydown", onKey);
    addEventListener("touchstart", onStart, { passive: true });
    addEventListener("touchmove", onMove, active);
    addEventListener("touchend", onEnd);
    addEventListener("touchcancel", onEnd);
    addEventListener("resize", onResize);
    box.addEventListener("scroll", onBoxScroll);
    return () => {
      cancelAnimationFrame(pub);
      clearTimeout(done);
      clearTimeout(rt);
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("touchstart", onStart);
      removeEventListener("touchmove", onMove);
      removeEventListener("touchend", onEnd);
      removeEventListener("touchcancel", onEnd);
      removeEventListener("resize", onResize);
      box.removeEventListener("scroll", onBoxScroll);
      el.style.removeProperty("transition");
      el.style.removeProperty("transform");
    };
  }, [track, enabled, stops, start]);

  return { idx, count, go: (i: number) => go.current(i) };
}
