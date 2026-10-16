import fs from "node:fs";
import path from "node:path";
import { imageSize } from "image-size";

/*
 * Les projets sont lus au moment du build, dans deux dossiers :
 *
 *   public/projets/            projets « classiques » (accueil)
 *     01-venise/               ← le numéro fixe l'ordre, le reste devient l'URL
 *       projet.json            ← titre, lieu, année, couleurs, couvertures
 *       IMG_0001.jpg …         ← les photos (ordre alphabétique, ou "ordre")
 *
 *   public/paris/              série « Paris » (onglet Paris, carte)
 *     serie.json               ← titre / texte / couleurs de la série (facultatif)
 *     11-oberkampf/            ← le numéro = l'arrondissement (1 à 20)
 *       projet.json            ← + "support" (Polaroid, argentique…), "quartier"
 *
 * Voir AJOUTER-UN-PROJET.md pour le format de projet.json.
 */

export type Photo = {
  src: string;
  w: number;
  h: number;
  alt: string;
  // Variantes WebP pré-calculées (scripts/variants.mjs) : base des fichiers
  // /_img/<racine>/<dossier>/<nom>-<largeur>.webp, largeurs, aperçu flou.
  v?: { base: string; widths: number[]; blur: string };
};

export type Project = {
  slug: string;
  title: string;
  place: string;
  year: string;
  text?: string;
  support?: string; // Paris : support photographique (Polaroid, argentique…)
  quartier?: string;
  colors: { bg: string; fg: string };
  photos: Photo[];
  cover: { desk: Photo; mob: Photo };
};

export type Arr = Project & { n: number; ord: string; name: string };

type Meta = {
  titre: string;
  lieu?: string;
  annee?: string | number;
  texte?: string;
  support?: string;
  quartier?: string;
  couleurs?: [string, string];
  couverture?: { ordi?: string; telephone?: string };
  ordre?: string[];
  exemples?: number; // images temporaires (picsum.photos), à retirer
};

const PUBLIC = path.join(process.cwd(), "public");
const IMG = /\.(jpe?g|png|webp|avif)$/i;

// Manifeste écrit par scripts/variants.mjs avant le build (absent en dev).
type Variant = { w: number; h: number; widths: number[]; blur: string; name: string };
const variants: Record<string, Variant> = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.join(PUBLIC, "_img", "manifest.json"), "utf8"));
  } catch {
    return {};
  }
})();

const readJson = <T>(f: string): T | undefined => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8")) as T;
  } catch {
    return undefined;
  }
};

const valid = (c?: string[]): c is [string, string] =>
  c?.length === 2 && c.every((x) => /^#[0-9a-f]{3,8}$/i.test(x));

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

const enc = (s: string) => s.split("/").map(encodeURIComponent).join("/");

const read = (root: string, dir: string, file: string, alt: string): Photo | null => {
  try {
    const d = imageSize(fs.readFileSync(path.join(PUBLIC, root, dir, file)));
    if (!d.width || !d.height) return null;
    // Photo encore brute (pas passée par l'optimisation) : on respecte l'EXIF.
    const turn = d.orientation && d.orientation >= 5;
    const v = variants[`${root}/${dir}/${file}`];
    return {
      src: `/${enc(`${root}/${dir}/${file}`)}`,
      w: v?.w ?? (turn ? d.height : d.width),
      h: v?.h ?? (turn ? d.width : d.height),
      alt,
      ...(v && { v: { base: `/_img/${enc(`${root}/${dir}/${v.name}`)}`, widths: v.widths, blur: v.blur } }),
    };
  } catch {
    return null;
  }
};

const load = (root: string, dir: string): Project | null => {
  const slug = dir.replace(/^\d+[-_ ]*/, "").toLowerCase();
  const base = path.join(PUBLIC, root, dir);
  // projet.json facultatif : sans lui, le titre vient du nom du dossier.
  let m: Meta = { titre: slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()) };
  const jf = path.join(base, "projet.json");
  if (fs.existsSync(jf)) {
    const j = readJson<Meta>(jf);
    if (j) m = { ...m, ...j };
    else console.warn(`projet.json illisible dans ${root}/${dir}, valeurs par défaut utilisées.`);
  }

  const files = fs
    .readdirSync(base)
    .filter((f) => IMG.test(f))
    .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const want = (m.ordre ?? []).map(key);
  const order = [
    ...want.map((k) => files.find((f) => key(f) === k)).filter((f): f is string => !!f),
    ...files.filter((f) => !want.includes(key(f))),
  ];

  const byFile = new Map<string, Photo>();
  for (const f of order) {
    const p = read(root, dir, f, m.titre);
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
  const auto = readJson<{ couleurs?: string[] }>(path.join(base, ".mood.json"))?.couleurs;
  const [bg, fg] = valid(m.couleurs) ? m.couleurs : valid(auto) ? auto : ["#0b0b0b", "#f3f1ec"];

  return {
    slug,
    title: m.titre,
    place: m.lieu ?? "",
    year: m.annee ? String(m.annee) : "",
    text: m.texte,
    support: m.support,
    quartier: m.quartier,
    colors: { bg, fg },
    photos,
    cover: { desk, mob },
  };
};

const dirs = (root: string) => {
  const p = path.join(PUBLIC, root);
  if (!fs.existsSync(p)) return [];
  return fs
    .readdirSync(p, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
};

// ---------- Projets (accueil) ----------

export const projects: Project[] = dirs("projets")
  .map((d) => load("projets", d))
  .filter((p): p is Project => !!p);

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);

export const nextOf = (p: Project) => projects[(projects.indexOf(p) + 1) % projects.length];

// ---------- Série Paris ----------

export const ARR_NAMES = [
  "Louvre", "Bourse", "Temple", "Hôtel-de-Ville", "Panthéon", "Luxembourg", "Palais-Bourbon",
  "Élysée", "Opéra", "Entrepôt", "Popincourt", "Reuilly", "Gobelins", "Observatoire",
  "Vaugirard", "Passy", "Batignolles-Monceau", "Butte-Montmartre", "Buttes-Chaumont", "Ménilmontant",
];

export const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

export type Serie = { title: string; text?: string; colors: { bg: string; fg: string } };

const s = readJson<{ titre?: string; texte?: string; couleurs?: string[] }>(path.join(PUBLIC, "paris", "serie.json"));
export const serie: Serie = {
  title: s?.titre || "Paris",
  text: s?.texte || "Vingt arrondissements, vingt regards : un support photographique différent pour chacun.",
  // Pierre de Paris et zinc des toits.
  colors: valid(s?.couleurs) ? { bg: s.couleurs[0], fg: s.couleurs[1] } : { bg: "#ece7de", fg: "#1f242b" },
};

// Un projet par arrondissement : le premier dossier dont le nom commence
// par ce numéro (« 11 », « 11e », « 11-oberkampf »…).
export const arrs: Arr[] = (() => {
  const out = new Map<number, Arr>();
  for (const d of dirs("paris")) {
    const n = Number(d.match(/^(\d{1,2})/)?.[1]);
    if (!(n >= 1 && n <= 20)) {
      console.warn(`Paris : « ${d} » ne commence pas par un numéro d'arrondissement (1 à 20), ignoré.`);
      continue;
    }
    if (out.has(n)) {
      console.warn(`Paris : plusieurs dossiers pour le ${ordinal(n)}, « ${d} » ignoré.`);
      continue;
    }
    const p = load("paris", d);
    if (!p) continue;
    const name = ARR_NAMES[n - 1];
    const titled = p.title.replace(/^\d+(er|e|ème)?\s*/i, "").trim();
    out.set(n, {
      ...p,
      slug: ordinal(n),
      n,
      ord: ordinal(n),
      name,
      // Titre par défaut (dossier « 11 ») : le nom de l'arrondissement.
      title: titled && !/^\d+$/.test(titled) ? titled : name,
      place: `Paris ${ordinal(n)}`,
    });
  }
  return [...out.values()].sort((a, b) => a.n - b.n);
})();

export const getArr = (slug: string) => arrs.find((a) => a.slug === slug);

export const nextArr = (a: Arr) => arrs[(arrs.indexOf(a) + 1) % arrs.length];
