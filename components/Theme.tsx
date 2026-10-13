// Applique les deux couleurs d'une page dès le rendu serveur (pas de flash).
export default function Theme({ bg, fg, extra = "" }: { bg: string; fg: string; extra?: string }) {
  return <style>{`:root{--bg:${bg};--fg:${fg}}${extra}`}</style>;
}
