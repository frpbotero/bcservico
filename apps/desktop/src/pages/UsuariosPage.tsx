import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Search } from "lucide-react";
import { listUsuarios, updateUsuario } from "@/lib/db";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { perfilLabel } from "@/lib/utils";
import { toast } from "sonner";
import type { Usuario } from "@cautelas/shared";

export default function UsuariosPage() {
  const navigate = useNavigate();
  const { usuario: logado } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    const data = await listUsuarios(busca || undefined);
    setUsuarios(data);
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  async function handleToggleStatus(u: Usuario) {
    if (u.id === logado?.id) {
      toast.error("Você não pode inativar o próprio usuário");
      return;
    }
    const novoStatus = u.status === "ativo" ? "inativo" : "ativo";
    await updateUsuario(u.id, { ...u, email: u.email ?? undefined, status: novoStatus });
    await verificarPendentes();
    carregar();
    toast.success(`Usuário ${novoStatus === "ativo" ? "ativado" : "inativado"}`);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
        <button
          onClick={() => navigate("/usuarios/novo")}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Buscar por nome ou login…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Login</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Perfil</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {usuarios.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Nenhum usuário encontrado</td></tr>
            )}
            {usuarios.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {u.nome_completo}
                  {u.id === logado?.id && <span className="ml-2 text-xs text-slate-400">(você)</span>}
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.login}</td>
                <td className="px-4 py-3 text-slate-600">{perfilLabel(u.perfil)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.status === "ativo" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => navigate(`/usuarios/${u.id}/editar`)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Editar">
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      disabled={u.id === logado?.id}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 text-xs disabled:opacity-40"
                    >
                      {u.status === "ativo" ? "Inativar" : "Ativar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
