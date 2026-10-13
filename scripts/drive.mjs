// Synchronise un dossier Google Drive vers public/projets/.
//
//   Drive : Site/                       Repo : public/projets/
//             06 Venise/          →              06-venise/
//               IMG_1234.HEIC                      IMG_1234.jpg   (optimisée)
//               projet (Google Doc, facultatif)    projet.json
//
// - Un sous-dossier du dossier partagé = un projet.
// - Infos du projet : un Google Doc nommé « projet » (lignes « clé : valeur »)
//   ou un fichier projet.json. Sinon, le titre vient du nom du dossier.
// - Seules les photos nouvelles ou modifiées sont téléchargées
//   (suivi dans .drive.json de chaque projet).
// - Un dossier supprimé ou renommé sur le Drive l'est aussi sur le site.
// - Les projets ajoutés à la main dans le repo (sans .drive.json) ne sont
//   jamais touchés.
//
// Variables d'environnement :
//   GDRIVE_KEY    contenu JSON de la clé du compte de service Google
//   GDRIVE_FOLDER identifiant du dossier « Site » (dans son URL Drive)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { moodOf } from "./mood.mjs";
import { isPhoto, optimize } from "./optim.mjs";

const ROOT = path.join(process.cwd(), "public", "projets");
const API = "https://www.googleapis.com/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";
const GDOC = "application/vnd.google-apps.document";
const MANIFEST = ".drive.json";

// ---------- Authentification (compte de service, JWT signé localement) ----------

const b64 = (x) => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");

const token = async (key) => {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: key.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const sig = crypto.sign("RSA-SHA256", Buffer.from(`${head}.${body}`), key.private_key).toString("base64url");
  const r = await fetch(key.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${body}.${sig}`,
    }),
  });
  if (!r.ok) throw new Error(`Authentification Google refusée (${r.status}) : ${await r.text()}`);
  return (await r.json()).access_token;
};

// ---------- Drive ----------

const drive = (tok) => {
  const get = async (url) => {
    for (let i = 0; ; i++) {
      const r = await fetch(url, { headers: { authorization: `Bearer ${tok}` } });
      if (r.ok) return r;
      if ((r.status === 429 || r.status >= 500) && i < 4) {
        await new Promise((s) => setTimeout(s, 1000 * 2 ** i));
        continue;
      }
      throw new Error(`Drive ${r.status} sur ${url} : ${await r.text()}`);
    }
  };
  return {
    // Contenu direct d'un dossier, toutes pages.
    list: async (parent) => {
      const out = [];
      let page = "";
      do {
        const q = new URLSearchParams({
          q: `'${parent}' in parents and trashed = false`,
          fields: "nextPageToken, files(id, name, mimeType, md5Checksum, modifiedTime)",
          pageSize: "1000",
          supportsAllDrives: "true",
          includeItemsFromAllDrives: "true",
          ...(page && { pageToken: page }),
        });
        const j = await (await get(`${API}/files?${q}`)).json();
        out.push(...j.files);
        page = j.nextPageToken ?? "";
      } while (page);
      return out;
    },
    bytes: async (id) => Buffer.from(await (await get(`${API}/files/${id}?alt=media&supportsAllDrives=true`)).arrayBuffer()),
    text: async (f) =>
      f.mimeType === GDOC
        ? (await get(`${API}/files/${f.id}/export?mimeType=text/plain`)).text()
        : (await get(`${API}/files/${f.id}?alt=media&supportsAllDrives=true`)).text(),
  };
};

// ---------- Noms ----------

const plain = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// « 06 Venise » → « 06-venise »
const dirName = (s) =>
  plain(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "projet";

// « 06 Venise » → « Venise »
const titleOf = (s) => s.replace(/^\d+[\s._-]*/, "").trim() || s;

const safe = (s) => s.replace(/[/\\:*?"<>|]+/g, "_").replace(/^\.+/, "_");

// ---------- Infos du projet ----------

const KEYS = {
  titre: "titre",
  lieu: "lieu",
  annee: "annee",
  texte: "texte",
  couleurs: "couleurs",
  "couverture ordi": "ordi",
  "couverture ordinateur": "ordi",
  "couverture telephone": "telephone",
  "couverture tel": "telephone",
  ordre: "ordre",
};

// Google Doc « projet » : une info par ligne, « clé : valeur ».
const fromDoc = (txt) => {
  const m = {};
  for (const line of txt.replace(/^﻿/, "").split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = KEYS[plain(line.slice(0, i)).toLowerCase().replace(/\s+/g, " ").trim()];
    const v = line.slice(i + 1).trim();
    if (!k || !v) continue;
    if (k === "couleurs") m.couleurs = v.match(/#[0-9a-f]{3,8}\b/gi)?.slice(0, 2); // « auto » → rien
    else if (k === "ordi" || k === "telephone") (m.couverture ??= {})[k] = v;
    else if (k === "ordre") m.ordre = v.split(/[,;]\s*|\s+/).filter(Boolean);
    else m[k] = v;
  }
  if (m.couleurs?.length !== 2) delete m.couleurs;
  return m;
};

// ---------- Synchro ----------

const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return null;
  }
};

const writeIfChanged = (f, s) => {
  if (fs.existsSync(f) && fs.readFileSync(f, "utf8") === s) return false;
  fs.writeFileSync(f, s);
  return true;
};

export const sync = async (api, root) => {
  const log = { added: 0, removed: 0, projects: new Set() };

  // Projets déjà synchronisés : id du dossier Drive → nom du dossier local.
  const known = new Map();
  for (const d of fs.readdirSync(ROOT)) {
    const m = readJson(path.join(ROOT, d, MANIFEST));
    if (m?.folder) known.set(m.folder, d);
  }

  const folders = (await api.list(root)).filter((f) => f.mimeType === FOLDER);
  const seen = new Set();

  for (const folder of folders) {
    seen.add(folder.id);
    let dir = dirName(folder.name);
    const prev = known.get(folder.id);

    // Collision avec un projet géré à la main : on n'y touche pas.
    const target = path.join(ROOT, dir);
    if (prev !== dir && fs.existsSync(target)) {
      const other = readJson(path.join(target, MANIFEST));
      if (!other || other.folder !== folder.id) {
        console.warn(`⚠ « ${folder.name} » : le dossier ${dir} existe déjà dans le repo, projet ignoré.`);
        continue;
      }
    }
    // Dossier renommé sur le Drive.
    if (prev && prev !== dir) {
      fs.renameSync(path.join(ROOT, prev), target);
      console.log(`↻ ${prev} → ${dir}`);
      log.projects.add(dir);
    }
    fs.mkdirSync(target, { recursive: true });

    const man = readJson(path.join(target, MANIFEST)) ?? { folder: folder.id, files: {} };
    man.folder = folder.id;
    const items = await api.list(folder.id);

    // Photos
    const live = new Set();
    for (const f of items) {
      if (!isPhoto(f.name) && !f.mimeType?.startsWith("image/")) continue;
      if (f.mimeType === FOLDER) continue;
      live.add(f.id);
      const v = f.md5Checksum ?? f.modifiedTime;
      const had = man.files[f.id];
      if (had && had.v === v && fs.existsSync(path.join(target, had.file))) continue;
      if (had) fs.rmSync(path.join(target, had.file), { force: true });

      // Nom unique dans le dossier (deux photos homonymes sur le Drive).
      const base = safe(f.name);
      const ext = path.extname(base) || ".jpg";
      const stem = base.slice(0, base.length - path.extname(base).length);
      const taken = new Set(
        Object.entries(man.files)
          .filter(([id]) => id !== f.id)
          .map(([, x]) => x.file.replace(/\.[^.]+$/, "").toLowerCase()),
      );
      let s = stem;
      for (let i = 2; taken.has(s.toLowerCase()); i++) s = `${stem}-${i}`;
      const name = s + ext;

      const src = path.join(target, name);
      fs.writeFileSync(src, await api.bytes(f.id));
      const r = await optimize(src);
      if (!r) {
        fs.rmSync(src, { force: true });
        continue;
      }
      man.files[f.id] = { v, file: r.file, name: f.name };
      console.log(`+ ${dir}/${r.file}`);
      log.added++;
      log.projects.add(dir);
    }

    // Photos supprimées du Drive.
    for (const [id, x] of Object.entries(man.files)) {
      if (live.has(id)) continue;
      fs.rmSync(path.join(target, x.file), { force: true });
      delete man.files[id];
      console.log(`− ${dir}/${x.file}`);
      log.removed++;
      log.projects.add(dir);
    }

    // Infos : Google Doc « projet » ou projet.json, sinon titre du dossier.
    const doc = items.find((f) => f.mimeType === GDOC && /^(projet|infos?)$/i.test(plain(f.name).trim()));
    const json = items.find((f) => f.name.toLowerCase() === "projet.json");
    let meta = { titre: titleOf(folder.name) };
    try {
      if (json) meta = { ...meta, ...JSON.parse(await api.text(json)) };
      else if (doc) meta = { ...meta, ...fromDoc(await api.text(doc)) };
    } catch (e) {
      console.warn(`⚠ ${dir} : infos illisibles (${e.message}), titre du dossier utilisé.`);
    }
    // Les couvertures peuvent être désignées par le nom d'origine (IMG_1.HEIC).
    if (writeIfChanged(path.join(target, "projet.json"), JSON.stringify(meta, null, 2) + "\n")) log.projects.add(dir);

    // Couleurs automatiques d'après les photos (utilisées si aucune n'est imposée).
    if (await moodOf(target)) log.projects.add(dir);

    const sorted = { folder: man.folder, files: Object.fromEntries(Object.entries(man.files).sort()) };
    writeIfChanged(path.join(target, MANIFEST), JSON.stringify(sorted, null, 2) + "\n");

    // Dossier vide sur le Drive : pas de projet affiché (lib ignore sans photo).
  }

  // Dossiers supprimés du Drive.
  for (const [id, d] of known) {
    if (seen.has(id)) continue;
    fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
    console.log(`✕ ${d} (supprimé du Drive)`);
    log.projects.add(d);
  }

  return log;
};

// ---------- Lancement ----------

// Erreur lisible dans l'onglet Actions (annotation GitHub), sans secret.
const fail = (msg) => {
  console.error(process.env.GITHUB_ACTIONS ? `::error title=Synchro Drive::${msg.replace(/\r?\n/g, " ")}` : msg);
  process.exit(1);
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const raw = process.env.GDRIVE_KEY?.trim();
  const root = process.env.GDRIVE_FOLDER?.trim().replace(/^.*\/folders\//, "").replace(/[?#].*$/, "");
  if (!raw || !root) fail("GDRIVE_KEY et GDRIVE_FOLDER doivent être définis (secrets du repo GitHub).");

  let key;
  try {
    key = JSON.parse(raw);
  } catch {
    fail("GDRIVE_KEY n'est pas un JSON valide : recopie TOUT le contenu du fichier .json (de { à }).");
  }
  if (!key.client_email || !key.private_key) fail("GDRIVE_KEY ne ressemble pas à une clé de compte de service (client_email / private_key absents).");
  console.log(`Compte de service : ${key.client_email}`);
  console.log(`Dossier : ${root}`);

  let tok;
  try {
    tok = await token(key);
  } catch (e) {
    fail(`Connexion à Google impossible : ${e.message}`);
  }

  const api = drive(tok);
  try {
    await api.list(root);
  } catch (e) {
    const m = String(e.message);
    if (/ 404 /.test(m)) fail(`Dossier ${root} introuvable : vérifie GDRIVE_FOLDER et que le dossier est partagé avec ${key.client_email}.`);
    if (/ 403 /.test(m) && /accessNotConfigured|has not been used|disabled/i.test(m)) fail("Google Drive API non activée sur le projet Google Cloud.");
    fail(`Accès au dossier refusé : ${m.slice(0, 300)}`);
  }

  try {
    const log = await sync(api, root);
    const sum = `${log.added} ajoutée(s), ${log.removed} retirée(s), projets : ${[...log.projects].join(", ") || "aucun"}`;
    console.log(`Synchro terminée — ${sum}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `summary=${sum}\n`);
  } catch (e) {
    fail(`Synchro interrompue : ${String(e.message).slice(0, 300)}`);
  }
}
