"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Projets" },
  { href: "/a-propos", label: "À propos" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const path = usePathname();
  const on = (h: string) => (h === "/" ? path === "/" || path.startsWith("/projets") : path === h);

  return (
    <header className="fixed inset-x-0 top-0 z-40 bg-bg text-fg transition-colors duration-700 pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center justify-between px-4 md:px-8">
        <Link href="/" className="font-serif text-[19px] leading-none tracking-tight">
          Gaspard David
        </Link>
        <nav className="flex gap-5 md:gap-8">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="cap ul pb-0.5" aria-current={on(n.href) ? "page" : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
