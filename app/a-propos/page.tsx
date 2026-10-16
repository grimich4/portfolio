import type { Metadata } from "next";
import Theme from "@/components/Theme";

export const metadata: Metadata = { title: "À propos" };

export default function About() {
  return (
    <main className="min-h-svh px-4 pb-16 pt-[calc(var(--hh)+env(safe-area-inset-top)+12vh)] md:px-8">
      <Theme bg="#f3f1ec" fg="#0b0b0b" />
      <p className="cap mb-5 opacity-50">À propos</p>
      <h1 className="max-w-4xl font-serif text-[clamp(2.25rem,6vw,5rem)] leading-[1] tracking-[-0.02em]">
        Gaspard David photographie la ville, la lumière <em>et ce qui passe entre les deux.</em>
      </h1>
      <p className="mt-10 max-w-md text-[15px] leading-relaxed opacity-70">
        Texte de présentation à compléter : parcours, démarche, matériel, expositions.
      </p>
    </main>
  );
}
