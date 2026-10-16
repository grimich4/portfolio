"use client";

import { useSyncExternalStore } from "react";

/*
 * Page précédente dans la navigation (côté client). Sert au lien retour d'un
 * projet : « ← Vitrine » si l'on vient de la vitrine, « ← Projets » sinon.
 * Header appelle track() à chaque changement de page.
 */

let cur = "";
let prev = "";
const subs = new Set<() => void>();

export const track = (path: string) => {
  if (path === cur) return;
  prev = cur;
  cur = path;
  subs.forEach((f) => f());
};

const sub = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

export const usePrevPath = () =>
  useSyncExternalStore(
    sub,
    () => prev,
    () => "",
  );
