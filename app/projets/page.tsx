import type { Metadata } from "next";
import Link from "next/link";
import Img from "@/components/Img";
import Theme from "@/components/Theme";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Projets",
  description: "Tous les projets photographiques de Gaspard David.",
};

const pad = (n: number) => String(n).padStart(2, "0");

// Index des projets : petites vignettes, défilement normal.
// La vitrine (/) garde le défilement plein écran, un projet par geste.
export default function Projets() {
  return (
    <main className="min-h-svh px-4 pb-20 pt-[calc(var(--hh)+env(safe-area-inset-top)+6vh)] md:px-8">
      <Theme bg="#f3f1ec" fg="#0b0b0b" />

      <header className="mb-10 flex items-baseline justify-between border-b border-current/15 pb-4 md:mb-14">
        <h1 className="font-serif text-[34px] leading-none tracking-[-0.01em] md:text-[44px]">Projets</h1>
        <p className="cap opacity-50">{pad(projects.length)} projets</p>
      </header>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-9 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 md:gap-y-12 lg:grid-cols-5 xl:grid-cols-6">
        {projects.map((p, i) => (
          <li key={p.slug} id={p.slug} className="scroll-mt-[calc(var(--hh)+2rem)]">
            <Link href={`/projets/${p.slug}`} className="group block">
              <div className="tint relative aspect-[4/5] overflow-hidden">
                <Img
                  p={p.cover.mob}
                  preload={i === 0}
                  eager={i < 6}
                  sizes="(min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 768px) 24vw, (min-width: 640px) 32vw, 48vw"
                />
              </div>
              <p className="mt-3 flex items-baseline gap-2.5">
                <span className="cap opacity-50">{pad(i + 1)}</span>
                <span className="ul font-serif text-[19px] leading-tight md:text-[21px]">{p.title}</span>
              </p>
              <p className="cap mt-1.5 truncate opacity-50">
                {[p.place, p.year].filter(Boolean).join(" · ")}
                {/* Nombre de photos : seulement quand la place le permet. */}
                <span className="hidden sm:inline">
                  {p.place || p.year ? " · " : ""}
                  {pad(p.photos.length)} photos
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
