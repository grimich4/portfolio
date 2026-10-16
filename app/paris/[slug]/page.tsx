import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectView from "@/components/ProjectView";
import Theme from "@/components/Theme";
import { arrs, getArr, nextArr } from "@/lib/projects";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return arrs.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = getArr((await params).slug);
  if (!a) return {};
  return {
    title: `${a.ord} — ${a.title}`,
    description: a.text ?? [`Paris ${a.ord}`, a.support, a.year].filter(Boolean).join(" · "),
  };
}

export default async function ArrPage({ params }: Props) {
  const a = getArr((await params).slug);
  if (!a) notFound();
  const nx = nextArr(a);

  return (
    <>
      <Theme bg={a.colors.bg} fg={a.colors.fg} />
      <ProjectView
        p={a}
        back={{ href: `/paris#${a.slug}`, label: "Paris" }}
        nx={{ href: `/paris/${nx.slug}`, title: `${nx.ord} · ${nx.title}`, cover: nx.cover.mob, label: "Arrondissement suivant" }}
      />
    </>
  );
}
