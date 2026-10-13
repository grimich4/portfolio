import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectView from "@/components/ProjectView";
import Theme from "@/components/Theme";
import { getProject, nextOf, projects } from "@/lib/projects";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = getProject((await params).slug);
  if (!p) return {};
  return { title: p.title, description: p.text ?? `${p.title} — ${[p.place, p.year].filter(Boolean).join(", ")}.` };
}

export default async function ProjectPage({ params }: Props) {
  const p = getProject((await params).slug);
  if (!p) notFound();
  const nx = nextOf(p);

  return (
    <>
      <Theme bg={p.colors.bg} fg={p.colors.fg} />
      <ProjectView p={p} nx={{ slug: nx.slug, title: nx.title, cover: nx.cover.mob }} />
    </>
  );
}
