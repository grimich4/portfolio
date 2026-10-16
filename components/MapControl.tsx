"use client";

import { useEffect, useRef } from "react";

/*
 * Interactions de la carte de Paris, par délégation d'événements :
 * survol ou focus d'un élément [data-n] → `data-on` sur tous les éléments du
 * même arrondissement (photo, contour, numéro, panneau, ligne d'index) et
 * `data-active` sur la carte. Le site prend les couleurs de l'arrondissement
 * survolé s'il est réalisé. Arrivée avec #11e : l'arrondissement est mis en avant.
 */
export default function MapControl() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("[data-pm]");
    if (!root) return;
    const html = document.documentElement;
    let cur = 0;
    let tColor: ReturnType<typeof setTimeout>;
    let tOff: ReturnType<typeof setTimeout>;

    const mark = (n: number, on: boolean) => {
      root.querySelectorAll(`[data-n="${n}"], [data-panel="${n}"]`).forEach((el) => el.toggleAttribute("data-on", on));
    };

    const colors = (n: number) => {
      clearTimeout(tColor);
      const el = n ? root.querySelector<HTMLElement>(`[data-n="${n}"][data-bg]`) : null;
      // Petit délai : on ne change pas de couleurs en balayant la carte.
      tColor = setTimeout(
        () => {
          if (el?.dataset.bg && el.dataset.fg) {
            html.style.setProperty("--bg", el.dataset.bg);
            html.style.setProperty("--fg", el.dataset.fg);
          } else {
            html.style.removeProperty("--bg");
            html.style.removeProperty("--fg");
          }
        },
        n ? 140 : 220,
      );
    };

    const on = (n: number) => {
      clearTimeout(tOff);
      if (n === cur) return;
      if (cur) mark(cur, false);
      cur = n;
      mark(n, true);
      root.dataset.active = String(n);
      colors(n);
    };
    const off = () => {
      clearTimeout(tOff);
      // Léger délai : passer d'un arrondissement à son voisin sans clignoter.
      tOff = setTimeout(() => {
        if (cur) mark(cur, false);
        cur = 0;
        delete root.dataset.active;
        colors(0);
      }, 80);
    };

    const nOf = (t: EventTarget | null) => {
      const el = (t as Element | null)?.closest?.("[data-n]");
      return el && root.contains(el) ? Number(el.getAttribute("data-n")) : 0;
    };
    const over = (e: Event) => {
      const n = nOf(e.target);
      if (n) on(n);
    };
    const out = (e: Event) => {
      const to = nOf((e as PointerEvent | FocusEvent).relatedTarget);
      if (!to) off();
    };

    // Échelle de la carte : --u = unités de carte par pixel affiché
    // (la carte est centrée et peut être limitée par la hauteur).
    const svg = root.querySelector<SVGSVGElement>("svg[data-map]");
    const scale = () => {
      if (!svg) return;
      const vb = svg.viewBox.baseVal;
      const { width, height } = svg.getBoundingClientRect();
      if (!width || !height || !vb.width) return;
      svg.style.setProperty("--u", String(Math.max(vb.width / width, vb.height / height)));
    };
    const ro = new ResizeObserver(scale);
    if (svg) ro.observe(svg);
    scale();

    root.addEventListener("pointerover", over);
    root.addEventListener("pointerout", out);
    root.addEventListener("focusin", over);
    root.addEventListener("focusout", out);

    // Retour depuis un arrondissement (/paris#11e) : on le met en avant.
    const h = location.hash.match(/^#(\d{1,2})(er|e)$/);
    const raf = requestAnimationFrame(() => {
      if (h && +h[1] >= 1 && +h[1] <= 20) on(+h[1]);
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      clearTimeout(tColor);
      clearTimeout(tOff);
      root.removeEventListener("pointerover", over);
      root.removeEventListener("pointerout", out);
      root.removeEventListener("focusin", over);
      root.removeEventListener("focusout", out);
      html.style.removeProperty("--bg");
      html.style.removeProperty("--fg");
    };
  }, []);

  return <span ref={ref} hidden />;
}
