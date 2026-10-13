import type { StaticImageData } from "next/image";
import p0848 from "../public/photos/paris-01.jpg";
import p2081 from "../public/photos/paris-02.jpg";
import p4206 from "../public/photos/paris-03.jpg";

/*
 * Tous les projets du site.
 *
 * Ajouter un projet = ajouter un objet dans `projects`.
 * - colors.bg / colors.fg : les deux couleurs du projet (fond / texte).
 *   Elles pilotent la page du projet et la couleur du site quand sa
 *   couverture est à l'écran sur l'accueil.
 * - cover : index de la photo de couverture dans `photos` (0 par défaut).
 * - photos : soit un import local (dimensions et flou de chargement
 *   automatiques), soit pic() pour une image temporaire.
 */

export type Photo = {
  src: string | StaticImageData;
  w: number;
  h: number;
  alt: string;
};

export type Project = {
  slug: string;
  title: string;
  place: string;
  year: string;
  text?: string;
  colors: { bg: string; fg: string };
  cover?: number;
  photos: Photo[];
};

const local = (img: StaticImageData, alt: string): Photo => ({
  src: img,
  w: img.width,
  h: img.height,
  alt,
});

// Image temporaire (picsum.photos), stable grâce à la seed.
const pic = (seed: string, w: number, h: number): Photo => ({
  src: `https://picsum.photos/seed/${seed}/${w}/${h}`,
  w,
  h,
  alt: "",
});

// Génère n images temporaires avec un mélange de formats.
const set = (key: string, n: number): Photo[] => {
  const fmts: [number, number][] = [
    [2400, 1600],
    [1600, 2400],
    [2400, 1600],
    [2000, 2000],
    [1600, 2400],
    [2400, 1350],
  ];
  return Array.from({ length: n }, (_, i) => {
    const [w, h] = fmts[i % fmts.length];
    return pic(`${key}-${i}`, w, h);
  });
};

export const projects: Project[] = [
  {
    slug: "paris",
    title: "Paris",
    place: "Paris",
    year: "2025",
    text: "Rues, passages et lumières de la ville.",
    colors: { bg: "#0b0b0b", fg: "#f3f1ec" },
    photos: [
      local(p0848, "Paris"),
      local(p2081, "Paris"),
      local(p4206, "Paris"),
      ...set("paris", 9),
    ],
  },
  {
    slug: "littoral",
    title: "Littoral",
    place: "Côte",
    year: "2025",
    colors: { bg: "#f1ece2", fg: "#1c2a3a" },
    photos: set("littoral", 14),
  },
  {
    slug: "cretes",
    title: "Crêtes",
    place: "Montagne",
    year: "2024",
    colors: { bg: "#1d2a22", fg: "#e8e4d8" },
    photos: set("cretes", 11),
  },
  {
    slug: "nuit-blanche",
    title: "Nuit blanche",
    place: "Paris",
    year: "2024",
    colors: { bg: "#f6f5f1", fg: "#111111" },
    photos: set("nuit", 16),
  },
  {
    slug: "atelier",
    title: "Atelier",
    place: "Studio",
    year: "2023",
    colors: { bg: "#3a1414", fg: "#efe3d2" },
    photos: set("atelier", 10),
  },
];

export const getProject = (slug: string) =>
  projects.find((p) => p.slug === slug);

export const coverOf = (p: Project) => p.photos[p.cover ?? 0];

export const nextOf = (p: Project) =>
  projects[(projects.indexOf(p) + 1) % projects.length];
