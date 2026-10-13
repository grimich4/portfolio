import Link from "next/link";
import Img from "@/components/Img";
import Sync from "@/components/Sync";
import Theme from "@/components/Theme";
import { coverOf, projects } from "@/data/projects";

const pad = (n: number) => String(n).padStart(2, "0");

export default function Home() {
  const first = projects[0].colors;

  return (
    <main>
      <Theme bg={first.bg} fg={first.fg} extra="html{scroll-snap-type:y proximity}" />
      <Sync />
      <h1 className="sr-only">Gaspard David — projets photographiques</h1>

      {projects.map((p, i) => (
        <section
          key={p.slug}
          data-bg={p.colors.bg}
          data-fg={p.colors.fg}
          className="flex h-svh snap-start flex-col px-3 pb-3 pt-[calc(3.5rem+env(safe-area-inset-top))] md:px-8 md:pb-8"
        >
          <Link
            href={`/projets/${p.slug}`}
            className="group relative block flex-1 overflow-hidden"
            style={{ background: `color-mix(in srgb, ${p.colors.fg} 8%, ${p.colors.bg})` }}
          >
            <Img
              p={coverOf(p)}
              sizes="100vw"
              preload={i === 0}
              className="transition-transform duration-[1800ms] ease-[var(--ease)] group-hover:scale-[1.025]"
            />
            <div className="absolute bottom-0 left-0 flex items-baseline gap-3 bg-bg pr-4 pt-2.5 text-fg transition-colors duration-700 md:gap-5 md:pr-7 md:pt-3.5">
              <span className="cap opacity-60">{pad(i + 1)}</span>
              <span className="font-serif text-[22px] leading-none md:text-[28px]">{p.title}</span>
              <span className="cap opacity-60">
                {p.place} · {p.year}
              </span>
            </div>
          </Link>
        </section>
      ))}

      <footer className="flex items-center justify-between px-4 pb-8 pt-4 md:px-8">
        <span className="cap opacity-50">© {new Date().getFullYear()} Gaspard David</span>
        <span className="cap opacity-50">{pad(projects.length)} projets</span>
      </footer>
    </main>
  );
}
