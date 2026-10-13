// Optimise toutes les photos de public/projets/ (voir optim.mjs).
// Lancé par GitHub Actions après un envoi de photos.
// En local : node scripts/photos.mjs
import fs from "node:fs";
import path from "node:path";
import { isPhoto, optimize } from "./optim.mjs";

const ROOT = path.join(process.cwd(), "public", "projets");
let n = 0;

for (const dir of fs.readdirSync(ROOT)) {
  const d = path.join(ROOT, dir);
  if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d)) {
    if (!isPhoto(f)) continue;
    const r = await optimize(path.join(d, f));
    if (r?.changed) {
      console.log(`✓ ${dir}/${r.file}`);
      n++;
    }
  }
}
console.log(n ? `${n} photo(s) optimisée(s).` : "Rien à optimiser.");
