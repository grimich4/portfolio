"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { href: "/", label: "Projets" },
  { href: "/paris", label: "Paris" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

// Ordi : liens en ligne. Téléphone : « Menu » ouvre un plein écran aux
// grandes lettres (quatre liens ne tiennent pas sur une ligne à 375 px).
export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const on = (h: string) =>
    h === "/" ? path === "/" || path.startsWith("/projets") : path === h || path.startsWith(`${h}/`);

  // Fermeture avec Échap.
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-bg pt-[env(safe-area-inset-top)] text-fg transition-colors duration-700">
      <div className="flex h-14 items-center justify-between px-4 md:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="relative z-10 whitespace-nowrap font-serif text-[19px] leading-none tracking-tight">
          Gaspard David
        </Link>
        <nav className="hidden gap-8 md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="cap ul pb-0.5" aria-current={on(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="menu"
          className="cap relative z-10 cursor-pointer py-2 md:hidden"
        >
          {open ? "Fermer" : "Menu"}
        </button>
      </div>

      <div
        id="menu"
        className={`fixed inset-0 bg-bg px-4 pt-[calc(3.5rem+env(safe-area-inset-top)+8vh)] transition-[opacity,visibility] duration-500 ease-[var(--ease)] md:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <nav className="flex flex-col">
          {nav.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              aria-current={on(n.href) ? "page" : undefined}
              className="flex items-baseline gap-4 border-b border-current/15 py-4 font-serif text-[44px] leading-none tracking-[-0.015em] transition-transform duration-700 ease-[var(--ease)]"
              style={{ transform: open ? "none" : "translateY(12px)", transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
            >
              <span className="cap w-6 font-sans opacity-50">{String(i + 1).padStart(2, "0")}</span>
              <span className={on(n.href) ? "italic" : ""}>{n.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
