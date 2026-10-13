import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

/*
 * Les projets sont lus dans public/projets/ au moment du build.
 *
 *   public/projets/
 *     01-paris/              ← le numéro fixe l'ordre, le reste devient l'URL
 *       projet.json          ← titre, lieu, année, couleurs, couvertures
 *       IMG_0001.jpg …       ← les photos (ordre alphabétique, ou "ordre")
 *
 * Voir AJOUTER-UN-PROJET.md pour le format de projet.json.
 */

export type Photo = {
  src: string;
  w: number;
  h: number;
  alt: string;
  // Variantes WebP pré-calculées (scripts/variants.mjs) : base des fichiers
  // /_img/<dossier>/<nom>-<largeur>.webp, largeurs disponibles, aperçu flou.
  v?: { base: string; widths: number[]; blur: string };
};

// Manifeste écrit par scripts/variants.mjs avant le build (absent en dev).
type Variant = { w: number; h: number; widths: number[]; blur: string; name: string };
const variants: Record<string, Variant> = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), "public", "_img", "manifest.json"), "utf8"));
  } catch {
    return {};
  }
})();

export type Project = {
  slug: string;
  title: string;
  place: string;
  year: string;
  text?: string;
  colors: { bg: string; fg: string };
  photos: Photo[];
  cover: { desk: Photo; mob: Photo };
};

type Meta = {
  titre: string;
  lieu?: string;
  annee?: string | number;
  texte?: string;
  couleurs?: [string, string];
  couverture?: { ordi?: string; telephone?: string };
  ordre?: string[];
  exemples?: number; // images temporaires (picsum.photos), à retirer
};

const ROOT = path.join(process.cwd(), "public", "projets");
const IMG = /\.(jpe?g|png|webp|avif)$/i;

// Image temporaire, stable grâce à la seed.
const demo = (seed: string, n: number): Photo[] => {
  const fmts: [number, number][] = [
    [2400, 1600], [1600, 2400], [2400, 1600], [2000, 2000], [1600, 2400], [2400, 1350],
  ];
  return Array.from({ length: n }, (_, i) => {
    const [w, h] = fmts[i % fmts.length];
    return { src: `https://picsum.photos/seed/${seed}-${i}/${w}/${h}`, w, h, alt: "" };
  });
};

// "IMG_12.JPG" et "img_12.jpg" désignent la même photo (l'optimisation
// passe les extensions en minuscules).
const key = (f: string) => f.replace(/\.[^.]+$/, "").toLowerCase();

const read = (dir: string, file: string, alt: string): Photo | null => {
  try {
    const d = imageSize(fs.readFileSync(path.join(ROOT, dir, file)));
    if (!d.width || !d.height) return null;
    // Photo encore brute (pas passée par l'optimisation) : on respecte l'EXIF.
    const turn = d.orientation && d.orientation >= 5;
    const v = variants[`${dir}/${file}`];
    return {
      src: `/projets/${encodeURIComponent(dir)}/${encodeURIComponent(file)}`,
      w: v?.w ?? (turn ? d.height : d.width),
      h: v?.h ?? (turn ? d.width : d.height),
      alt,
      ...(v && {
        v: { base: `/_img/${encodeURIComponent(dir)}/${encodeURIComponent(v.name)}`, widths: v.widths, blur: v.blur },
      }),
    };
  } catch {
    return null;
  }
};

const load = (dir: string): Project | null => {
  const slug = dir.replace(/^\d+[-_ ]*/, "").toLowerCase();
  // projet.json facultatif : sans lui, le titre vient du nom du dossier.
  const jf = path.join(ROOT, dir, "projet.json");
  let m: Meta = { titre: slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) };
  try {
    if (fs.existsSync(jf)) m = { ...m, ...(JSON.parse(fs.readFileSync(jf, "utf8")) as Meta) };
  } catch {
    console.warn(`projet.json illisible dans ${dir}, valeurs par défaut utilisées.`);
  }

  const files = fs
    .readdirSync(path.join(ROOT, dir))
    .filter((f) => IMG.test(f))
    .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const want = (m.ordre ?? []).map(key);
  const order = [
    ...want.map((k) => files.find((f) => key(f) === k)).filter((f): f is string => !!f),
    ...files.filter((f) => !want.includes(key(f))),
  ];

  const byFile = new Map<string, Photo>();
  for (const f of order) {
    const p = read(dir, f, m.titre);
    if (p) byFile.set(key(f), p);
  }
  const photos = [...byFile.values(), ...demo(slug, m.exemples ?? 0)];
  if (!photos.length) return null;

  // Couvertures : celles choisies, sinon la première paysage / portrait.
  const land = photos.find((p) => p.w >= p.h) ?? photos[0];
  const port = photos.find((p) => p.h > p.w) ?? photos[0];
  const pick = (f?: string) => (f ? byFile.get(key(f)) : undefined);
  const desk = pick(m.couverture?.ordi) ?? land;
  const mob = pick(m.couverture?.telephone) ?? port;

  // Couleurs : celles de projet.json, sinon celles déduites des photos
  // (.mood.json, écrit par scripts/mood.mjs), sinon noir et blanc cassé.
  let auto: [string, string] | undefined;
  try {
    auto = JSON.parse(fs.readFileSync(path.join(ROOT, dir, ".mood.json"), "utf8")).couleurs;
  } catch {}
  const valid = (c?: string[]): c is [string, string] => c?.length === 2 && c.every((x) => /^#[0-9a-f]{3,8}$/i.test(x));
  const [bg, fg] = valid(m.couleurs) ? m.couleurs : valid(auto) ? auto : ["#0b0b0b", "#f3f1ec"];

  return {
    slug,
    title: m.titre,
    place: m.lieu ?? "",
    year: m.annee ? String(m.annee) : "",
    text: m.texte,
    colors: { bg, fg },
    photos,
    cover: { desk, mob },
  };
};

export const projects: Project[] = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }))
  .map(load)
  .filter((p): p is Project => !!p);

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export const nextOf = (p: Project) => projects[(projects.indexOf(p) + 1) % projects.length];
