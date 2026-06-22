import { useEffect, useState } from "react";
import { api } from "../../utils/api";

export default function AdminUtilisateurs() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [query, setQuery]       = useState("");
  const [actionId, setActionId] = useState(null);
  const [tempPwd, setTempPwd]   = useState(null); // { name, pwd }

  useEffect(() => {
    load();
  }, []);

  async function load(q = "") {
    setLoading(true);
    const url = q ? `/auth/admin/users?q=${encodeURIComponent(q)}` : "/auth/admin/users";
    api.get(url)
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  function handleSearch(e) {
    e.preventDefault();
    load(query);
  }

  async function toggleBan(u) {
    setActionId(u.id);
    try {
      const action = u.is_active ? "ban" : "unban";
      const updated = await api.patch(`/auth/admin/users/${u.id}/${action}`, {});
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function resetPassword(u) {
    if (!window.confirm(`Réinitialiser le mot de passe de ${u.first_name || u.email} ?`)) return;
    setActionId(u.id);
    try {
      const data = await api.post(`/auth/admin/users/${u.id}/reset-password`, {});
      setTempPwd({ name: u.first_name || u.email, pwd: data.temp_password });
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  async function deleteUser(u) {
    if (!window.confirm(`Supprimer définitivement le compte de ${u.first_name || u.email} ?\nTous ses rendez-vous seront aussi supprimés.`)) return;
    setActionId(u.id);
    try {
      await api.delete(`/auth/admin/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (e) { alert(e.message); }
    finally { setActionId(null); }
  }

  const btnBase = "text-xs px-3 py-1.5 rounded-full border transition disabled:opacity-40";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-stone-800">Utilisateurs</h1>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher par nom ou email…"
            className="border border-stone-200 rounded-full px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-sauge-300"
          />
          <button
            type="submit"
            className="bg-sauge-500 hover:bg-sauge-600 text-white text-sm font-medium px-4 py-2 rounded-full transition"
          >
            Chercher
          </button>
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); load(""); }}
              className="border border-stone-200 text-stone-500 text-sm px-4 py-2 rounded-full hover:bg-stone-50 transition"
            >
              Tous
            </button>
          )}
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-sauge-200 border-t-sauge-500 rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-stone-100 text-stone-400">
          Aucun utilisateur trouvé.
        </div>
      ) : (
        <div className="space-y-2">
          {users.map(u => {
            const busy = actionId === u.id;
            const name = [u.first_name, u.last_name].filter(Boolean).join(" ") || "—";
            return (
              <div
                key={u.id}
                className={`bg-white rounded-xl border shadow-sm p-4 ${
                  u.is_active ? "border-stone-100" : "border-red-100 bg-red-50/30"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {/* Rôle */}
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                    u.role === "admin"
                      ? "bg-sauge-50 text-sauge-600 border-sauge-200"
                      : "bg-stone-100 text-stone-500 border-stone-200"
                  }`}>
                    {u.role === "admin" ? "Admin" : "Client"}
                  </span>

                  {/* Statut */}
                  {!u.is_active && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full border bg-red-50 text-red-500 border-red-200">
                      Banni
                    </span>
                  )}
                  {u.must_change_password && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-500 border-amber-200">
                      MDP temporaire
                    </span>
                  )}

                  <span className="font-medium text-stone-800 text-sm">{name}</span>
                  <span className="text-stone-400 text-sm flex-1 truncate">{u.email}</span>
                  {u.phone && (
                    <span className="text-stone-400 text-xs">{u.phone}</span>
                  )}
                  <span className="text-stone-300 text-xs shrink-0">
                    Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {u.role !== "admin" && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      onClick={() => toggleBan(u)}
                      disabled={busy}
                      className={`${btnBase} ${
                        u.is_active
                          ? "border-red-200 text-red-500 hover:bg-red-50"
                          : "border-green-200 text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {busy ? "…" : u.is_active ? "Bannir" : "Réactiver"}
                    </button>
                    <button
                      onClick={() => resetPassword(u)}
                      disabled={busy}
                      className={`${btnBase} border-amber-200 text-amber-600 hover:bg-amber-50`}
                    >
                      {busy ? "…" : "Réinitialiser MDP"}
                    </button>
                    <button
                      onClick={() => deleteUser(u)}
                      disabled={busy}
                      className={`${btnBase} border-stone-200 text-stone-400 hover:bg-stone-50`}
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal mot de passe temporaire */}
      {tempPwd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="font-semibold text-stone-800 text-lg">Mot de passe temporaire</h2>
            <p className="text-stone-500 text-sm">
              Communiquez ce mot de passe à <strong>{tempPwd.name}</strong>.<br/>
              L'utilisateur devra le changer à sa prochaine connexion.
            </p>
            <div className="flex items-center gap-2 bg-stone-50 rounded-xl px-4 py-3">
              <code className="flex-1 font-mono text-lg tracking-widest text-stone-800 select-all">
                {tempPwd.pwd}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(tempPwd.pwd)}
                className="text-xs text-sauge-500 hover:underline shrink-0"
              >
                Copier
              </button>
            </div>
            <button
              onClick={() => setTempPwd(null)}
              className="w-full bg-sauge-500 hover:bg-sauge-600 text-white text-sm font-medium py-2.5 rounded-full transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
