import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { isTokenValid, getSessionInfo, logout } from "../utils/auth";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const session = getSessionInfo();
  const loggedIn = isTokenValid();

  const [business, setBusiness] = useState(null);
  const [workingHours, setWorkingHours] = useState([]);
  // backend: 0=Lun…6=Dim  |  JS getDay(): 0=Dim,1=Lun…6=Sam
  const todayDow = (new Date().getDay() - 1 + 7) % 7;

  useEffect(() => {
    fetch("/api/settings/business")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBusiness(data); })
      .catch(() => {});
    fetch("/api/calendar/working-hours")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setWorkingHours(data); })
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const navLinks = [
    { to: "/", label: "Accueil", end: true },
    { to: "/galerie", label: "Galerie" },
    { to: "/prestations", label: "Prestations" },
    { to: "/reserver", label: "Réserver" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* ── Top bar ── */}
      <header className="bg-white border-b border-sauge-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-wide text-sauge-600">
              Les ongles de doriane
            </span>
            <span className="hidden sm:inline text-stone-400 text-sm">✦ Nail Artist</span>
          </Link>
          <a
            href="https://www.instagram.com/les_ongles_de_dorianne/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-stone-400 hover:text-sauge-500 transition text-xs ml-2"
            aria-label="Instagram"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
            </svg>
            @les_ongles_de_dorianne
          </a>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium transition ${
                    isActive
                      ? "bg-sauge-50 text-sauge-600"
                      : "text-stone-600 hover:text-sauge-500 hover:bg-sauge-50"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Actions desktop */}
          <div className="hidden md:flex items-center gap-2">
            {loggedIn ? (
              <>
                {session?.role === "admin" && (
                  <Link
                    to="/admin/rendez-vous"
                    className="text-sm text-stone-500 hover:text-sauge-500 px-3 py-1"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/profil"
                  className="text-sm text-stone-600 hover:text-sauge-500 px-3 py-1"
                >
                  {session?.first_name ?? "Mon profil"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm text-stone-400 hover:text-sauge-400 px-3 py-1"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/connexion"
                  className="text-sm text-stone-600 hover:text-sauge-500 px-4 py-2"
                >
                  Connexion
                </Link>
                <Link
                  to="/reserver"
                  className="text-sm bg-sauge-500 hover:bg-sauge-600 text-white px-4 py-2 rounded-full font-medium transition"
                >
                  Prendre RDV
                </Link>
              </>
            )}
          </div>

          {/* Burger mobile */}
          <button
            className="md:hidden p-2 text-stone-600"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Menu mobile */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-sauge-50 px-4 pb-4 space-y-1">
            {navLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm font-medium ${
                    isActive ? "bg-sauge-50 text-sauge-600" : "text-stone-600"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
            <div className="border-t border-sauge-50 pt-2 mt-2">
              {loggedIn ? (
                <>
                  {session?.role === "admin" && (
                    <Link to="/admin/rendez-vous" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-stone-500">Admin</Link>
                  )}
                  <Link to="/profil" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-stone-600">Mon profil</Link>
                  <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="block px-4 py-2 text-sm text-sauge-400">Déconnexion</button>
                </>
              ) : (
                <>
                  <Link to="/connexion" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-stone-600">Connexion</Link>
                  <Link to="/inscription" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-stone-600">Créer un compte</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Contenu ── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ── */}
      <footer className="bg-stone-900 text-stone-400 text-sm mt-auto">

        {/* Bande CTA + horaires */}
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">

          {/* Gauche — CTA */}
          <div className="flex-1 flex flex-col justify-center gap-4">
            <p className="text-sauge-400 text-xs tracking-widest uppercase">Rendez-vous</p>
            <p className="text-white text-2xl font-bold leading-snug">Prête pour de beaux ongles ?</p>
            <p className="text-stone-400">Réservez en ligne en quelques clics, c'est simple et rapide.</p>
            <Link
              to="/reserver"
              className="self-start bg-sauge-500 hover:bg-sauge-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition"
            >
              Réserver maintenant
            </Link>
          </div>

          {/* Séparateur */}
          <div className="hidden md:block w-px bg-stone-800" />

          {/* Droite — horaires */}
          <div className="shrink-0">
            <p className="text-white font-medium mb-2 text-xs uppercase tracking-wider">Horaires & lieux</p>
            <div className="space-y-1.5">
              {workingHours.length > 0
                ? [...workingHours].sort((a, b) => a.day_of_week - b.day_of_week).map(wh => {
                    const isToday = wh.day_of_week === todayDow;
                    const hrs = wh.is_open && wh.open_time && wh.close_time
                      ? `${wh.open_time.slice(0, 5)} – ${wh.close_time.slice(0, 5)}`
                      : "Fermé";
                    return (
                      <div key={wh.day_of_week} className={`flex items-baseline gap-3 ${isToday ? "text-sauge-400 font-semibold" : ""}`}>
                        <span className="w-8 shrink-0">{DAY_LABELS[wh.day_of_week]}</span>
                        <span className="w-24 shrink-0">{hrs}</span>
                        {wh.is_open && wh.address && (
                          <span className="text-xs opacity-60">📍 {wh.address}</span>
                        )}
                      </div>
                    );
                  })
                : <>
                    <p>Lun – Ven : 9h – 19h</p>
                    <p>Sam : 9h – 18h</p>
                    <p>Dim : Fermé</p>
                  </>
              }
            </div>
          </div>
        </div>

        {/* Barre bas */}
        <div className="border-t border-stone-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3 text-xs text-stone-600">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-stone-500 font-medium">Les ongles de doriane</span>
              <span>📍 {business?.address ?? "Guidel, 56520"}</span>
              {business?.phone && <span>📞 {business.phone}</span>}
              <a
                href="https://www.instagram.com/les_ongles_de_dorianne/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-stone-400 transition"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
                @les_ongles_de_dorianne
              </a>
            </div>
            <div className="flex gap-4">
              <span>© {new Date().getFullYear()}</span>
              <Link to="/mentions-legales" className="hover:text-stone-400 transition">Mentions légales</Link>
              <Link to="/confidentialite" className="hover:text-stone-400 transition">Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
