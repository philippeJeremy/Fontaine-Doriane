import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { isTokenValid, getSessionInfo, restoreSession } from "./utils/auth";

import PublicLayout from "./layout/PublicLayout";
import DashboardLayout from "./layout/DashboardLayout";

import Home from "./pages/Home";
import Galerie from "./pages/Galerie";
import Prestations from "./pages/Prestations";
import Reservation from "./pages/Reservation";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MonProfil from "./pages/MonProfil";
import MentionsLegales from "./pages/MentionsLegales";
import Confidentialite from "./pages/Confidentialite";

import AdminRendezVous from "./pages/admin/AdminRendezVous";
import AdminPrestations from "./pages/admin/AdminPrestations";
import AdminGalerie from "./pages/admin/AdminGalerie";
import AdminCalendrier from "./pages/admin/AdminCalendrier";
import AdminPlanning from "./pages/admin/AdminPlanning";
import AdminFactures from "./pages/admin/AdminFactures";
import AdminUtilisateurs from "./pages/admin/AdminUtilisateurs";
import MotDePasseOublie from "./pages/MotDePasseOublie";
import ReinitialiserMdp from "./pages/ReinitialiserMdp";

// ── Garde : authentification requise ─────────────────────────────────────────
function PrivateRoute({ children }) {
  const location = useLocation();
  if (!isTokenValid()) {
    return <Navigate to={`/connexion?retour=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return children;
}

// ── Garde : rôle admin requis ─────────────────────────────────────────────────
function AdminRoute({ children }) {
  if (!isTokenValid()) return <Navigate to="/connexion" replace />;
  if (getSessionInfo()?.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

// ── Restauration de session au démarrage ──────────────────────────────────────
function AuthInit({ children }) {
  const [ready, setReady] = useState(isTokenValid());
  useEffect(() => {
    if (!ready) restoreSession().finally(() => setReady(true));
  }, []);
  if (!ready) return null;
  return children;
}

// ── Application ───────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthInit>
        <Routes>
          {/* ── Pages publiques (avec top bar) ── */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/galerie" element={<Galerie />} />
            <Route path="/prestations" element={<Prestations />} />
            <Route path="/connexion" element={<Login />} />
            <Route path="/inscription" element={<Register />} />
            <Route
              path="/reserver"
              element={
                <PrivateRoute>
                  <Reservation />
                </PrivateRoute>
              }
            />
            <Route
              path="/profil"
              element={
                <PrivateRoute>
                  <MonProfil />
                </PrivateRoute>
              }
            />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/confidentialite" element={<Confidentialite />} />
            <Route path="/mot-de-passe-oublie" element={<MotDePasseOublie />} />
            <Route path="/reinitialiser-mdp" element={<ReinitialiserMdp />} />
          </Route>

          {/* ── Pages admin (avec sidebar) ── */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <DashboardLayout />
              </AdminRoute>
            }
          >
            <Route index element={<Navigate to="/admin/rendez-vous" replace />} />
            <Route path="rendez-vous" element={<AdminRendezVous />} />
            <Route path="planning" element={<AdminPlanning />} />
            <Route path="factures" element={<AdminFactures />} />
            <Route path="utilisateurs" element={<AdminUtilisateurs />} />
            <Route path="prestations" element={<AdminPrestations />} />
            <Route path="galerie" element={<AdminGalerie />} />
            <Route path="calendrier" element={<AdminCalendrier />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthInit>
    </BrowserRouter>
  );
}
