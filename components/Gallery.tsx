"use client";

import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import Arrow from "@/components/Arrow";
import Img from "@/components/Img";
import type { Photo } from "@/lib/projects";

type Mode = "grand" | "mosaique";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Gallery({ photos, slug }: { photos: Photo[]; slug: string }) {
  const [mode, setMode] = useState<Mode>("grand");
  const top = useRef<HTMLDivElement>(null);
  const n = photos.length;

  // Clic en mosaïque : on rouvre en grand sur la photo choisie.
  const open = (i: number) => {
    flushSync(() => setMode("grand"));
    document.getElementById(`p${i}`)?.scrollIntoView({ block: "center" });
  };

  const pick = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    const y = top.current?.getBoundingClientRect().top ?? 0;
    if (y < 0) top.current?.scrollIntoView();
  };

  return (
    <div ref={top} className="scroll-mt-14">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 flex items-center justify-between bg-bg px-4 py-3 transition-colors duration-700 md:px-8">
        <Link href={`/#${slug}`} aria-label="Retour aux projets" className="group flex items-center gap-3">
          <span className="transition-transform duration-500 ease-[var(--ease)] group-hover:-translate-x-1">
            <Arrow dir="left" />
          </span>
          <span className="cap ul pb-0.5">Projets</span>
        </Link>
        <div className="flex gap-5" role="group" aria-label="Affichage">
          {(["grand", "mosaique"] as const).map((m) => (
            <button
              key={m}
              onClick={() => pick(m)}
              aria-pressed={mode === m}
              className="cap ul cursor-pointer pb-0.5"
            >
              {m === "grand" ? "Grand" : "Mosaïque"}
            </button>
          ))}
        </div>
      </div>

      {mode === "grand" ? (
        <div className="flex flex-col gap-14 px-3 pb-24 pt-6 md:gap-28 md:px-8 md:pt-10">
          {photos.map((p, i) => {
            const r = p.w / p.h;
            return (
              <figure
                key={i}
                id={`p${i}`}
                className="mx-auto"
                style={{ width: `min(100%, calc((100svh - 9rem) * ${r.toFixed(4)}))` }}
              >
                <div className="tint relative" style={{ aspectRatio: `${p.w} / ${p.h}` }}>
                  <Img
                    p={p}
                    preload={i === 0}
                    sizes={r >= 1 ? "(max-width: 768px) 100vw, 90vw" : "(max-width: 768px) 100vw, 60vw"}
                  />
                </div>
                <figcaption className="cap mt-3 opacity-50">
                  {pad(i + 1)} / {pad(n)}
                </figcaption>
              </figure>
            );
          })}
        </div>
      ) : (
        <div className="columns-2 gap-2 px-3 pb-24 pt-2 md:columns-3 md:gap-3 md:px-8 xl:columns-4">
          {photos.map((p, i) => (
            <button
              key={i}
              onClick={() => open(i)}
              aria-label={`Voir la photo ${i + 1} en grand`}
              className="tint relative mb-2 block w-full cursor-zoom-in overflow-hidden break-inside-avoid md:mb-3"
              style={{ aspectRatio: `${p.w} / ${p.h}` }}
            >
              <Img
                p={p}
                sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
