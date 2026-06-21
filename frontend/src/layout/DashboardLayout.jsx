import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "../utils/auth";

const links = [
  { to: "/admin/planning",    label: "Planning",    icon: "📆" },
  { to: "/admin/rendez-vous", label: "Rendez-vous", icon: "📋" },
  { to: "/admin/prestations", label: "Prestations", icon: "💅" },
  { to: "/admin/galerie",     label: "Galerie",     icon: "🖼️" },
  { to: "/admin/calendrier",  label: "Calendrier",  icon: "🗓️" },
];

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const navCls = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive
        ? "bg-sauge-50 text-sauge-600"
        : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
    }`;

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-stone-100">
        <p className="text-sauge-600 font-semibold text-base">Fontaine Doriane</p>
        <p className="text-stone-400 text-xs mt-0.5">Administration</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={navCls} onClick={() => setOpen(false)}>
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-stone-100 space-y-1">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-500 hover:bg-stone-50"
          onClick={() => setOpen(false)}
        >
          ← Site public
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-sauge-400 hover:bg-sauge-50"
        >
          Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-stone-100">

      {/* ── Sidebar desktop (md+) ── */}
      <aside className="hidden md:flex w-56 bg-white border-r border-stone-200 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* ── Overlay sidebar mobile ── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-stone-200 flex flex-col z-50 transition-transform duration-200 md:hidden ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        <SidebarContent />
      </aside>

      {/* ── Contenu principal ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Topbar mobile uniquement */}
        <header className="md:hidden bg-white border-b border-stone-200 px-4 h-14 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100"
            aria-label="Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sauge-600 font-semibold text-sm">Les ongles de Doriane — Admin</p>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
