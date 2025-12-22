"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { photos } from "../data/photos";

export default function Home() {
  const [current, setCurrent] = useState<number | null>(null);

  const close = () => setCurrent(null);
  const prev = () =>
    setCurrent((i) => (i !== null ? (i - 1 + photos.length) % photos.length : i));
  const next = () =>
    setCurrent((i) => (i !== null ? (i + 1) % photos.length : i));

  // clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (current === null) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  return (
    <section>
      <h1 className="text-2xl font-bold mb-6">Portfolio</h1>

      {/* Galerie */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            onClick={() => setCurrent(index)}
            className="mb-4 break-inside-avoid overflow-hidden rounded focus:outline-none w-full inline-block"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              className="w-full h-auto hover:scale-105 transition-transform duration-300"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {current !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          {/* fermer */}
          <button
            onClick={close}
            className="absolute top-4 right-4 text-white text-3xl"
          >
            ✕
          </button>

          {/* précédent */}
          <button
            onClick={prev}
            className="absolute left-4 text-white text-4xl px-4"
          >
            ‹
          </button>

          {/* image */}
          <div className="max-w-[90vw] max-h-[90vh]">
            <Image
              src={photos[current].src}
              alt={photos[current].alt}
              width={photos[current].width}
              height={photos[current].height}
              className="w-auto h-auto max-h-[90vh] object-contain"
              priority
            />
          </div>

          {/* suivant */}
          <button
            onClick={next}
            className="absolute right-4 text-white text-4xl px-4"
          >
            ›
          </button>
        </div>
      )}
    </section>
  );
}
