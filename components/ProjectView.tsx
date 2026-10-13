"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import Arrow from "@/components/Arrow";
import Img from "@/components/Img";
import { useTrack } from "@/components/useTrack";
import type { Photo, Project } from "@/lib/projects";

type Mode = "grand" | "mosaique";
type Next = { slug: string; title: string; cover: Photo };

const pad = (n: number) => String(n).padStart(2, "0");

// Bas de l'en-tête fixe + de la barre « Projets / Grand » (fixe elle aussi).
const topBars = () => document.querySelector<HTMLElement>("[data-bar]")?.getBoundingClientRect().bottom ?? 0;

// Vue « Grand » : le titre, puis chaque photo centrée sous les barres, puis la fin.
const stops = (track: HTMLElement) => {
  const t0 = track.getBoundingClientRect().top;
  const h = topBars();
  const mid = h + (innerHeight - h) / 2;
  return [
    0,
    ...Array.from(track.querySelectorAll<HTMLElement>("[data-shot]")).map((el) => {
      const r = el.getBoundingClientRect();
      return r.top - t0 + r.height / 2 - mid;
    }),
    Infinity,
  ];
};

export default function ProjectView({ p, nx }: { p: Project; nx: Next }) {
  const [mode, setMode] = useState<Mode>("grand");
  const track = useRef<HTMLDivElement>(null);
  const at = useRef(0);
  const start = useCallback(() => at.current, []);
  const n = p.photos.length;

  // Une photo par geste en vue « Grand » ; défilement libre en mosaïque.
  useTrack({ track, enabled: mode === "grand", stops, start });

  const pick = (m: Mode) => {
    if (m === mode) return;
    at.current = 0;
    setMode(m);
    scrollTo(0, 0);
  };
  // Clic en mosaïque : vue « Grand » ouverte directement sur cette photo.
  const open = (i: number) => {
    at.current = i + 1;
    setMode("grand");
  };

  const intro = (
    <header className="px-4 pb-10 pt-[calc(6.25rem+env(safe-area-inset-top)+12vh)] md:px-8 md:pb-16">
      <p className="cap mb-5 opacity-50">
        {[p.place, p.year, `${pad(n)} photos`].filter(Boolean).join(" · ")}
      </p>
      <h1 className="font-serif text-[clamp(3.25rem,11vw,9rem)] leading-[0.9] tracking-[-0.02em]">{p.title}</h1>
      {p.text && <p className="mt-6 max-w-md text-[15px] leading-relaxed opacity-70">{p.text}</p>}
    </header>
  );

  const next = (
    <Link
      href={`/projets/${nx.slug}`}
      className="group flex items-end justify-between gap-6 border-t border-current/15 px-4 pb-10 pt-8 md:px-8 md:pb-14"
    >
      <div>
        <p className="cap mb-3 opacity-50">Projet suivant</p>
        <p className="font-serif text-[clamp(2.5rem,7vw,5.5rem)] italic leading-none tracking-[-0.02em] transition-transform duration-700 ease-[var(--ease)] group-hover:translate-x-2">
          {nx.title}
        </p>
      </div>
      <div className="tint relative aspect-[4/5] w-24 shrink-0 overflow-hidden md:w-40">
        <Img p={nx.cover} sizes="160px" />
      </div>
    </Link>
  );

  return (
    <>
      <div
        data-bar
        className="fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] z-30 flex items-center justify-between bg-bg px-4 py-3 transition-colors duration-700 md:px-8"
      >
        <Link href={`/#${p.slug}`} aria-label="Retour aux projets" className="group flex items-center gap-3">
          <span className="transition-transform duration-500 ease-[var(--ease)] group-hover:-translate-x-1">
            <Arrow dir="left" />
          </span>
          <span className="cap ul pb-0.5">Projets</span>
        </Link>
        <div className="flex gap-5" role="group" aria-label="Affichage">
          {(["grand", "mosaique"] as const).map((m) => (
            <button key={m} onClick={() => pick(m)} aria-pressed={mode === m} className="cap ul cursor-pointer pb-0.5">
              {m === "grand" ? "Grand" : "Mosaïque"}
            </button>
          ))}
        </div>
      </div>

      {mode === "grand" ? (
        <>
          {/* La page ne défile pas : c'est le contenu qui glisse. */}
          <style>{"html,body{overflow:hidden;overscroll-behavior:none}"}</style>
          <div className="fixed inset-0 overflow-hidden">
            <div ref={track} data-track className="will-change-transform">
              {intro}
              {/* Grand écart : une seule photo visible à la fois. */}
              <div className="flex flex-col gap-[34svh] px-3 pb-[30svh] pt-[12svh] md:gap-[16svh] md:px-8">
                {p.photos.map((ph, i) => {
                  const r = ph.w / ph.h;
                  return (
                    <figure
                      key={i}
                      data-shot
                      className="mx-auto"
                      style={{ width: `min(100%, calc((100svh - 8.5rem) * ${r.toFixed(4)}))` }}
                    >
                      <div className="tint relative" style={{ aspectRatio: `${ph.w} / ${ph.h}` }}>
                        <Img
                          p={ph}
                          preload={i === 0}
                          sizes={r >= 1 ? "(max-width: 768px) 100vw, 92vw" : "(max-width: 768px) 100vw, 60vw"}
                        />
                      </div>
                      <figcaption className="cap mt-3 opacity-50">
                        {pad(i + 1)} / {pad(n)}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              {next}
            </div>
          </div>
        </>
      ) : (
        <main>
          {intro}
          <div className="columns-2 gap-2 px-3 pb-24 pt-2 md:columns-3 md:gap-3 md:px-8 xl:columns-4">
            {p.photos.map((ph, i) => (
              <button
                key={i}
                onClick={() => open(i)}
                aria-label={`Voir la photo ${i + 1} en grand`}
                className="tint relative mb-2 block w-full cursor-zoom-in overflow-hidden break-inside-avoid md:mb-3"
                style={{ aspectRatio: `${ph.w} / ${ph.h}` }}
              >
                <Img p={ph} sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw" />
              </button>
            ))}
          </div>
          {next}
        </main>
      )}
    </>
  );
}
