import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Search } from "lucide-react";
import { listProdutos, updateProduto, deleteProduto } from "@/lib/db";
import { useSyncStore } from "@/store/syncStore";
import { useAuthStore } from "@/store/authStore";
import { formatarMoeda } from "@/lib/utils";
import { toast } from "sonner";
import type { Produto } from "@cautelas/shared";

export default function ProdutosPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<"" | "ativo" | "inativo">("");
  const isConsulta = usuario?.perfil === "consulta";

  const carregar = useCallback(async () => {
    const data = await listProdutos({ busca: busca || undefined, status: statusFiltro || undefined });
    setProdutos(data);
  }, [busca, statusFiltro]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  async function handleToggleStatus(p: Produto) {
    const novoStatus = p.status === "ativo" ? "inativo" : "ativo";
    await updateProduto(p.id, { ...p, status: novoStatus });
    await verificarPendentes();
    carregar();
    toast.success(`Produto ${novoStatus === "ativo" ? "ativado" : "inativado"}`);
  }

  async function handleDelete(p: Produto) {
    const result = await deleteProduto(p.id);
    if (result === "tem_vinculos") {
      toast.error("Produto está em cautelas. Inative-o em vez de excluir.");
      return;
    }
    await verificarPendentes();
    carregar();
    toast.success("Produto removido");
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Produtos</h1>
        {!isConsulta && (
          <button
            onClick={() => navigate("/produtos/novo")}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus size={16} /> Novo produto
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Buscar por nome ou código…"
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
              <th className="text-left px-4 py-3 font-medium text-slate-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Unidade</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Preço Ref.</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
              {!isConsulta && <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {produtos.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">Nenhum produto encontrado</td>
              </tr>
            )}
            {produtos.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.codigo_interno || "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.nome}</td>
                <td className="px-4 py-3 text-slate-600">{p.unidade_medida}</td>
                <td className="px-4 py-3 text-slate-600">{formatarMoeda(p.preco_referencia)}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "ativo" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                    {p.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                {!isConsulta && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/produtos/${p.id}/editar`)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Editar">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleToggleStatus(p)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 text-xs">
                        {p.status === "ativo" ? "Inativar" : "Ativar"}
                      </button>
                      {usuario?.perfil === "admin" && (
                        <button onClick={() => handleDelete(p)} className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-600">×</button>
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
