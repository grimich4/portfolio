"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { track } from "@/components/nav";

export type NavProject = { slug: string; title: string };

const nav = [
  { href: "/", label: "Vitrine" },
  { href: "/projets", label: "Projets" },
  { href: "/paris", label: "Paris" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

const pad = (n: number) => String(n).padStart(2, "0");

/*
 * Grand écran (≥ 1024 px) : nom + onglets en ligne ; « Projets » ouvre un
 * menu déroulant simple (survol, ou clavier). Plus petit : « Menu » ouvre un
 * plein écran aux grandes lettres, avec la liste des projets sous « Projets ».
 * Hauteur de la barre : variable CSS --hh (globals.css), utilisée partout.
 */
export default function Header({ projects }: { projects: NavProject[] }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const on = (h: string) => (h === "/" ? path === "/" : path === h || path.startsWith(`${h}/`));

  useEffect(() => track(path), [path]);

  // Fermeture avec Échap.
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-bg pt-[env(safe-area-inset-top)] text-fg transition-colors duration-700">
      <div className="flex h-[var(--hh)] items-center justify-between px-4 md:px-8">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="relative z-10 whitespace-nowrap font-serif text-[26px] leading-none tracking-[-0.01em] lg:text-[34px]"
        >
          Gaspard David
        </Link>

        <nav className="hidden items-center gap-10 lg:flex xl:gap-12">
          {nav.map((n) =>
            n.href === "/projets" ? (
              <div key={n.href} className="dd relative flex">
                <Link href={n.href} className="nav ul pb-1" aria-current={on(n.href) ? "page" : undefined} aria-haspopup="true">
                  {n.label}
                </Link>
                {/* Menu déroulant : la marge haute fait le pont avec le lien. */}
                <div className="dd-menu absolute left-1/2 top-full z-50 pt-5">
                  <ul className="min-w-64 border border-current/15 bg-bg px-6 pb-5 pt-4">
                    {projects.map((p, i) => (
                      <li key={p.slug}>
                        <Link href={`/projets/${p.slug}`} className="flex items-baseline gap-4 py-1.5">
                          <span className="cap w-5 opacity-50">{pad(i + 1)}</span>
                          <span className="ul whitespace-nowrap font-serif text-[22px] leading-tight">{p.title}</span>
                        </Link>
                      </li>
                    ))}
                    <li className="mt-3 border-t border-current/15 pt-3">
                      <Link href="/projets" className="cap ul pb-0.5">
                        Tous les projets
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <Link key={n.href} href={n.href} className="nav ul pb-1" aria-current={on(n.href) ? "page" : undefined}>
                {n.label}
              </Link>
            ),
          )}
        </nav>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="menu"
          className="nav relative z-10 cursor-pointer py-2 lg:hidden"
        >
          {open ? "Fermer" : "Menu"}
        </button>
      </div>

      <div
        id="menu"
        className={`fixed inset-0 overflow-y-auto bg-bg px-4 pb-10 pt-[calc(var(--hh)+env(safe-area-inset-top)+5vh)] transition-[opacity,visibility] duration-500 ease-[var(--ease)] md:px-8 lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav className="flex flex-col">
          {nav.map((n, i) => (
            <div
              key={n.href}
              className="border-b border-current/15 transition-transform duration-700 ease-[var(--ease)]"
              style={{ transform: open ? "none" : "translateY(12px)", transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
            >
              <Link
                href={n.href}
                onClick={() => setOpen(false)}
                aria-current={on(n.href) ? "page" : undefined}
                className="flex items-baseline gap-4 py-4 font-serif text-[44px] leading-none tracking-[-0.015em]"
              >
                <span className="cap w-6 font-sans opacity-50">{pad(i + 1)}</span>
                <span className={on(n.href) ? "italic" : ""}>{n.label}</span>
              </Link>
              {n.href === "/projets" && projects.length > 0 && (
                <ul className="-mt-1 pb-4 pl-10">
                  {projects.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/projets/${p.slug}`}
                        onClick={() => setOpen(false)}
                        className={`block py-1 font-serif text-[21px] leading-tight ${path === `/projets/${p.slug}` ? "italic" : "opacity-70"}`}
                      >
                        {p.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
