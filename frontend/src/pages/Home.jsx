import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api } from "../utils/api";

function ServiceCarousel({ service }) {
  const [idx, setIdx] = useState(0);
  const imgs = [service.image_url, service.image_url_2, service.image_url_3].filter(Boolean);

  if (imgs.length === 0) {
    return (
      <div className="w-full aspect-square bg-gradient-to-br from-sauge-100 to-sauge-50 flex items-center justify-center text-4xl">💅</div>
    );
  }

  return (
    <div className="relative w-full aspect-square bg-stone-50 overflow-hidden group">
      <img src={imgs[idx]} alt={service.name} className="w-full h-full object-contain transition-opacity duration-300" />
      {imgs.length > 1 && (
        <>
          <button
            onClick={e => { e.preventDefault(); setIdx(i => (i - 1 + imgs.length) % imgs.length); }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full shadow flex items-center justify-center text-stone-600 opacity-0 group-hover:opacity-100 transition text-lg leading-none"
          >‹</button>
          <button
            onClick={e => { e.preventDefault(); setIdx(i => (i + 1) % imgs.length); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/90 rounded-full shadow flex items-center justify-center text-stone-600 opacity-0 group-hover:opacity-100 transition text-lg leading-none"
          >›</button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {imgs.map((_, i) => (
              <button key={i} onClick={e => { e.preventDefault(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? "bg-sauge-500" : "bg-stone-300"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ServiceCard({ service }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sauge-50 overflow-hidden hover:shadow-md transition">
      <ServiceCarousel service={service} />
      <div className="p-5">
        <p className="text-xs text-sauge-400 font-medium uppercase tracking-wider mb-1">{service.category}</p>
        <h3 className="font-semibold text-stone-800 text-lg leading-tight">{service.name}</h3>
        {service.description && (
          <p className="text-stone-500 text-sm mt-1 line-clamp-2">{service.description}</p>
        )}
        <div className="flex items-center justify-between mt-4">
          <span className="text-sauge-600 font-bold text-lg">{service.price.toFixed(2)} €</span>
          <span className="text-stone-400 text-sm">{service.duration_minutes} min</span>
        </div>
      </div>
    </div>
  );
}

function GalleryPreview({ photos }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {photos.slice(0, 6).map((p) => (
        <div key={p.id} className="relative group overflow-hidden rounded-xl bg-stone-100">
          <img
            src={p.url}
            alt={p.caption ?? ""}
            className="w-full h-full object-contain group-hover:scale-105 transition duration-500"
          />
          {p.caption && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-end p-3">
              <p className="text-white text-sm">{p.caption}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    api.get("/services").then(setServices).catch(() => {});
    api.get("/gallery").then(setPhotos).catch(() => {});
  }, []);

  const featured = services.slice(0, 3);

  return (
    <div>
      <Helmet>
        <title>Les Ongles de Doriane | Nail Artist à Guidel (56520)</title>
        <meta name="description" content="Salon de nail art à Guidel (56520). Pose d'ongles, nail art et soins sur rendez-vous avec Doriane. Réservez en ligne facilement." />
        <link rel="canonical" href="https://lesonglesdedorianne.fr/" />
      </Helmet>
      {/* ── Hero ── */}
      <section className="relative min-h-[540px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-sauge-900 via-sauge-700 to-sauge-600">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="relative text-center px-6 max-w-2xl">
          <p className="text-sauge-200 tracking-[0.3em] text-sm uppercase mb-4">Nail Artist</p>
          <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-4">
            Les ongles de doriane
          </h1>
          <p className="text-sauge-100 text-lg mb-8">
            Sublimez vos ongles avec soin et passion.<br />
            Pose, nail art & soins sur rendez-vous.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/reserver"
              className="bg-white text-sauge-600 hover:bg-sauge-50 font-semibold px-8 py-3 rounded-full transition shadow-lg"
            >
              Prendre rendez-vous
            </Link>
            <Link
              to="/prestations"
              className="border border-white/60 text-white hover:bg-white/10 px-8 py-3 rounded-full transition"
            >
              Voir les prestations
            </Link>
          </div>
        </div>
      </section>

      {/* ── À propos ── */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <p className="text-sauge-400 text-sm tracking-widest uppercase mb-3">À propos</p>
        <h2 className="text-3xl font-bold text-stone-800 mb-4">
          L'art du soin des ongles
        </h2>
        <p className="text-stone-500 text-lg leading-relaxed max-w-2xl mx-auto">
          Passionnée de nail art, Doriane met tout son talent et sa créativité à votre service.
          Dans un cadre doux et élégant, profitez de prestations personnalisées pour des ongles
          beaux, soignés et qui vous ressemblent.
        </p>
      </section>

      {/* ── Nos prestations (aperçu) ── */}
      {featured.length > 0 && (
        <section className="bg-sauge-50 py-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-10">
              <p className="text-sauge-400 text-sm tracking-widest uppercase mb-2">Nos prestations</p>
              <h2 className="text-3xl font-bold text-stone-800">Des soins pour chaque envie</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {featured.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
            <div className="text-center mt-10">
              <Link
                to="/prestations"
                className="inline-block border border-sauge-300 text-sauge-600 hover:bg-sauge-600 hover:text-white px-8 py-3 rounded-full font-medium transition"
              >
                Toutes les prestations →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Galerie aperçu ── */}
      {photos.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="text-center mb-10">
            <p className="text-sauge-400 text-sm tracking-widest uppercase mb-2">Galerie</p>
            <h2 className="text-3xl font-bold text-stone-800">Nos réalisations</h2>
          </div>
          <GalleryPreview photos={photos} />
          <div className="text-center mt-8">
            <Link
              to="/galerie"
              className="inline-block border border-sauge-300 text-sauge-600 hover:bg-sauge-600 hover:text-white px-8 py-3 rounded-full font-medium transition"
            >
              Voir toute la galerie →
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}
