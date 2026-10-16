import type { Metadata } from "next";
import Theme from "@/components/Theme";

export const metadata: Metadata = { title: "Contact" };

// À remplacer par tes vrais liens.
const links = [
  { label: "Email", value: "ton@email.fr", href: "mailto:ton@email.fr" },
  { label: "Instagram", value: "@ton_compte", href: "https://instagram.com/" },
];

export default function Contact() {
  return (
    <main className="min-h-svh px-4 pb-16 pt-[calc(var(--hh)+env(safe-area-inset-top)+12vh)] md:px-8">
      <Theme bg="#0b0b0b" fg="#f3f1ec" />
      <p className="cap mb-5 opacity-50">Contact</p>
      <h1 className="font-serif text-[clamp(3.25rem,11vw,9rem)] leading-[0.9] tracking-[-0.02em]">Écrire</h1>
      <ul className="mt-14 max-w-xl border-t border-current/15">
        {links.map((l) => (
          <li key={l.label} className="border-b border-current/15">
            <a href={l.href} className="group flex items-baseline justify-between py-5">
              <span className="cap opacity-50">{l.label}</span>
              <span className="font-serif text-2xl transition-transform duration-700 ease-[var(--ease)] group-hover:-translate-x-2 md:text-3xl">
                {l.value}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
