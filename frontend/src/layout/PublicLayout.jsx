import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { isTokenValid, getSessionInfo, logout } from "../utils/auth";

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const session = getSessionInfo();
  const loggedIn = isTokenValid();

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
      <footer className="bg-stone-900 text-stone-400 text-sm py-8 mt-auto">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-4">
          <div>
            <p className="text-white font-semibold text-base mb-1">Les ongles de doriane</p>
            <p>Nail Artist — Pose, Soin & Nail Art</p>
          </div>
          <div className="space-y-1">
            <p>📍 Votre adresse, Ville</p>
            <p>📞 06 XX XX XX XX</p>
            <p>✉️ contact@les-ongles-de-doriane.fr</p>
          </div>
          <div className="space-y-1">
            <p className="text-white font-medium mb-1">Horaires</p>
            <p>Lundi – Vendredi : 9h – 19h</p>
            <p>Samedi : 9h – 18h</p>
            <p>Dimanche : Fermé</p>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-6 text-xs text-stone-600">
          <span>© {new Date().getFullYear()} Fontaine Doriane</span>
          <Link to="/mentions-legales" className="hover:text-stone-400 underline">Mentions légales</Link>
          <Link to="/confidentialite" className="hover:text-stone-400 underline">Confidentialité</Link>
        </div>
      </footer>
    </div>
  );
}
