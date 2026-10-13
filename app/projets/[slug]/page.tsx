import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import Img from "@/components/Img";
import Theme from "@/components/Theme";
import { coverOf, getProject, nextOf, projects } from "@/data/projects";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProject((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.text ?? `${p.title} — ${p.place}, ${p.year}.` };
}

export default async function ProjectPage({ params }: Props) {
  const p = getProject((await params).slug);
  if (!p) notFound();
  const nx = nextOf(p);

  return (
    <main>
      <Theme bg={p.colors.bg} fg={p.colors.fg} />

      <header className="px-4 pb-10 pt-[calc(3.5rem+env(safe-area-inset-top)+12vh)] md:px-8 md:pb-16">
        <p className="cap mb-5 opacity-50">
          {p.place} · {p.year}
        </p>
        <h1 className="font-serif text-[clamp(3.25rem,11vw,9rem)] leading-[0.9] tracking-[-0.02em]">{p.title}</h1>
        {p.text && <p className="mt-6 max-w-md text-[15px] leading-relaxed opacity-70">{p.text}</p>}
      </header>

      <Gallery photos={p.photos} />

      <Link
        href={`/projets/${nx.slug}`}
        className="group flex items-end justify-between gap-6 border-t border-current/15 px-4 pb-10 pt-8 md:px-8 md:pb-14"
      >
        <div>
          <p className="cap mb-3 opacity-50">Projet suivant</p>
          <p className="font-serif text-[clamp(2.5rem,7vw,5.5rem)] leading-none tracking-[-0.02em] italic transition-transform duration-700 ease-[var(--ease)] group-hover:translate-x-2">
            {nx.title}
          </p>
        </div>
        <div className="tint relative aspect-[4/5] w-24 shrink-0 overflow-hidden md:w-40">
          <Img p={coverOf(nx)} sizes="160px" />
        </div>
      </Link>
    </main>
  );
}
