// Optimisation d'une photo, partagée par photos.mjs et drive.mjs :
// HEIC → JPEG, 3000 px max, rotation EXIF appliquée, métadonnées (GPS…)
// retirées, extension en minuscules. Renvoie le nom final, ou null.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const MAX = 3000;
const OK = [".jpg", ".jpeg", ".png", ".webp"];
const HEIC = [".heic", ".heif"];

export const isPhoto = (f) => [...OK, ...HEIC].includes(path.extname(f).toLowerCase());

// HEIC (iPhone) : sharp ne le lit pas, on passe par heif-convert (libheif),
// qui applique déjà la rotation. On ré-encode sans EXIF pour éviter une
// double rotation plus loin.
const fromHeic = async (src) => {
  const tmp = src.replace(/\.[^.]+$/, ".tmp.jpg");
  try {
    execFileSync("heif-convert", ["-q", "92", src, tmp], { stdio: "ignore" });
  } catch {
    console.warn(`⚠ ${path.basename(src)} : HEIC non converti (heif-convert absent ?).`);
    return null;
  }
  const out = src.replace(/\.[^.]+$/, ".jpg");
  const buf = await sharp(tmp)
    .resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
  fs.unlinkSync(tmp);
  fs.unlinkSync(src);
  fs.writeFileSync(out, buf);
  return path.basename(out);
};

// Renvoie { file, changed } ou null si ce n'est pas une photo exploitable.
export const optimize = async (src) => {
  const ext = path.extname(src);
  const low = ext.toLowerCase();
  if (HEIC.includes(low)) {
    const f = await fromHeic(src);
    return f && { file: f, changed: true };
  }
  if (!OK.includes(low)) return null;

  const norm = low === ".jpeg" ? ".jpg" : low;
  const out = path.join(path.dirname(src), path.basename(src, ext) + norm);
  const m = await sharp(src).metadata();
  const big = Math.max(m.width ?? 0, m.height ?? 0) > MAX;
  if (!big && !m.exif && !m.iptc && !m.xmp && src === out) return { file: path.basename(out), changed: false };

  let img = sharp(src).rotate().resize({ width: MAX, height: MAX, fit: "inside", withoutEnlargement: true });
  img =
    norm === ".png"
      ? img.png({ compressionLevel: 9 })
      : norm === ".webp"
        ? img.webp({ quality: 88 })
        : img.jpeg({ quality: 86, mozjpeg: true });
  const buf = await img.toBuffer();
  if (src !== out) fs.unlinkSync(src);
  fs.writeFileSync(out, buf);
  return { file: path.basename(out), changed: true };
};
