import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { api } from "../utils/api";

function ServiceCarousel({ service }) {
  const [idx, setIdx] = useState(0);
  const imgs = [service.image_url, service.image_url_2, service.image_url_3].filter(Boolean);

  if (imgs.length === 0) {
    return (
      <div className="w-full aspect-square bg-gradient-to-br from-sauge-100 to-sauge-50 flex items-center justify-center text-5xl">
        💅
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square bg-stone-50 overflow-hidden group">
      <img
        key={idx}
        src={imgs[idx]}
        alt={service.name}
        className="w-full h-full object-contain transition-opacity duration-300"
      />
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
              <button
                key={i}
                onClick={e => { e.preventDefault(); setIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition ${i === idx ? "bg-sauge-500" : "bg-stone-300"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ServiceCard({ service }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden flex flex-col">
      <ServiceCarousel service={service} />
      <div className="p-5 flex flex-col flex-1">
        <p className="text-xs text-sauge-400 font-medium uppercase tracking-wider mb-1">
          {service.category}
        </p>
        <h3 className="font-semibold text-stone-800 text-lg">{service.name}</h3>
        {service.description && (
          <p className="text-stone-500 text-sm mt-1 flex-1">{service.description}</p>
        )}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-100">
          <div>
            <span className="text-sauge-600 font-bold text-xl">{service.price.toFixed(2)} €</span>
            <span className="text-stone-400 text-sm ml-2">· {service.duration_minutes} min</span>
          </div>
          <Link
            to={`/reserver?service=${service.id}`}
            className="bg-sauge-500 hover:bg-sauge-600 text-white text-sm font-medium px-4 py-2 rounded-full transition"
          >
            Réserver
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Prestations() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/services")
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Grouper par catégorie
  const categories = [...new Set(services.map((s) => s.category))];

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <Helmet>
        <title>Nos Prestations | Les Ongles de Doriane — Nail Art à Guidel</title>
        <meta name="description" content="Découvrez toutes les prestations de nail art à Guidel : pose gel, nail art, soins des ongles. Tarifs et réservation en ligne." />
        <link rel="canonical" href="https://les-ongles-de-doriane.fr/prestations" />
      </Helmet>
      <div className="text-center mb-12">
        <p className="text-sauge-400 text-sm tracking-widest uppercase mb-2">Menu</p>
        <h1 className="text-4xl font-bold text-stone-800">Nos prestations</h1>
        <p className="text-stone-500 mt-2">Choisissez parmi nos soins et prenez rendez-vous en ligne</p>
      </div>

      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
        </div>
      )}

      {!loading && services.length === 0 && (
        <p className="text-center text-stone-400 py-20">
          Aucune prestation disponible pour le moment.
        </p>
      )}

      {!loading &&
        categories.map((cat) => (
          <section key={cat} className="mb-14">
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-2xl font-bold text-stone-800">{cat}</h2>
              <div className="flex-1 h-px bg-sauge-100" />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services
                .filter((s) => s.category === cat)
                .map((s) => (
                  <ServiceCard key={s.id} service={s} />
                ))}
            </div>
          </section>
        ))}

      {!loading && services.length > 0 && (
        <div className="text-center mt-4 py-10 bg-sauge-50 rounded-2xl">
          <p className="text-stone-600 mb-4">Envie de plusieurs prestations ? Réservez un forfait !</p>
          <Link
            to="/reserver"
            className="inline-block bg-sauge-500 hover:bg-sauge-600 text-white font-semibold px-8 py-3 rounded-full transition"
          >
            Créer mon rendez-vous →
          </Link>
        </div>
      )}
    </div>
  );
}
