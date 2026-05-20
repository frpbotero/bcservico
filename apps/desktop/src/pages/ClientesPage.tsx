import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, UserX, UserCheck, Search } from "lucide-react";
import { listClientes, deleteCliente, updateCliente } from "@/lib/db";
import { useSyncStore } from "@/store/syncStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import type { Cliente } from "@cautelas/shared";

export default function ClientesPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"" | "ativo" | "inativo">("");
  const isAdmin = usuario?.perfil === "admin";
  const isConsulta = usuario?.perfil === "consulta";

  const carregar = useCallback(async () => {
    const data = await listClientes({ busca: busca || undefined, status: statusFiltro || undefined });
    setClientes(data);
  }, [busca, statusFiltro]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  async function handleToggleStatus(c: Cliente) {
    const novoStatus = c.status === "ativo" ? "inativo" : "ativo";
    await updateCliente(c.id, { ...c, status: novoStatus });
    await verificarPendentes();
    carregar();
    toast.success(`Cliente ${novoStatus === "ativo" ? "ativado" : "inativado"}`);
  }

  async function handleDelete(c: Cliente) {
    const result = await deleteCliente(c.id);
    if (result === "tem_vinculos") {
      toast.error("Cliente possui cautelas vinculadas. Inative-o em vez de excluir.");
      return;
    }
    await verificarPendentes();
    carregar();
    toast.success("Cliente removido");
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
        {!isConsulta && (
          <button
            onClick={() => navigate("/clientes/novo")}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus size={16} /> Novo cliente
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Buscar por nome ou CNPJ/CPF…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value as "" | "ativo" | "inativo")}
        >
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Razão Social</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">CNPJ / CPF</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Cidade / UF</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Contato</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              {!isConsulta && <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {clientes.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                  Nenhum cliente encontrado
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{c.razao_social}</td>
                <td className="px-4 py-3 text-slate-600">{c.cnpj_cpf}</td>
                <td className="px-4 py-3 text-slate-600">{c.cidade && c.uf ? `${c.cidade} / ${c.uf}` : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{c.nome_contato || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c.status === "ativo" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {c.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                {!isConsulta && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => navigate(`/clientes/${c.id}/editar`)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                        title="Editar"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                        title={c.status === "ativo" ? "Inativar" : "Ativar"}
                      >
                        {c.status === "ativo" ? <UserX size={15} /> : <UserCheck size={15} />}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600"
                          title="Excluir"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
