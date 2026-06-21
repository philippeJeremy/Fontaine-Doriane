import { useEffect, useState } from "react";
import { api } from "../utils/api";

export default function Galerie() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    api.get("/gallery")
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-sauge-400 text-sm tracking-widest uppercase mb-2">Portfolio</p>
        <h1 className="text-4xl font-bold text-stone-800">Notre galerie</h1>
        <p className="text-stone-500 mt-2">Quelques-unes de nos plus belles réalisations</p>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && photos.length === 0 && (
        <p className="text-center text-stone-400 py-20">La galerie est vide pour l'instant.</p>
      )}

      {!loading && photos.length > 0 && (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {photos.map((p) => (
            <div
              key={p.id}
              className="break-inside-avoid relative group overflow-hidden rounded-xl cursor-pointer"
              onClick={() => setLightbox(p)}
            >
              <img
                src={p.url}
                alt={p.caption ?? ""}
                className="w-full object-contain group-hover:scale-105 transition duration-500"
                loading="lazy"
              />
              {p.caption && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition flex items-end p-3">
                  <p className="text-white text-sm leading-snug">{p.caption}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? ""}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {lightbox.caption && (
              <p className="text-white text-center mt-3 text-sm">{lightbox.caption}</p>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
