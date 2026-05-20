import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList, Users, Package, Clock } from "lucide-react";
import { listCautelas } from "@/lib/db";
import { useAuthStore } from "@/store/authStore";
import { formatarData, statusCautelaLabel } from "@/lib/utils";
import type { CautelaListItem } from "@/lib/db";

export default function DashboardPage() {
  const { usuario } = useAuthStore();
  const navigate = useNavigate();
  const [pendentes, setPendentes] = useState<CautelaListItem[]>([]);

  useEffect(() => {
    listCautelas({ status: "aguardando_entrega" }).then(setPendentes);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bom dia, {usuario?.nome_completo.split(" ")[0]}!</h1>
        <p className="text-sm text-slate-500 mt-1">Bem-vindo ao App Cautelas</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate("/cautelas")}
          className="bg-white border rounded-xl p-5 text-left hover:shadow-sm transition-shadow"
        >
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <ClipboardList size={20} className="text-blue-600" />
          </div>
          <p className="font-semibold text-slate-800">Cautelas</p>
          <p className="text-xs text-slate-500 mt-0.5">Empréstimo de materiais</p>
        </button>
        <button
          onClick={() => navigate("/clientes")}
          className="bg-white border rounded-xl p-5 text-left hover:shadow-sm transition-shadow"
        >
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mb-3">
            <Users size={20} className="text-green-600" />
          </div>
          <p className="font-semibold text-slate-800">Clientes</p>
          <p className="text-xs text-slate-500 mt-0.5">Cadastro de empresas e pessoas</p>
        </button>
        <button
          onClick={() => navigate("/produtos")}
          className="bg-white border rounded-xl p-5 text-left hover:shadow-sm transition-shadow"
        >
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
            <Package size={20} className="text-purple-600" />
          </div>
          <p className="font-semibold text-slate-800">Produtos</p>
          <p className="text-xs text-slate-500 mt-0.5">Catálogo de materiais</p>
        </button>
      </div>

      {pendentes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <h2 className="font-semibold text-slate-800 text-sm">
              {pendentes.length} cautela(s) aguardando entrega
            </h2>
          </div>
          <div className="space-y-2">
            {pendentes.map((c) => (
              <button
                key={c.id}
                onClick={() => navigate("/cautelas")}
                className="w-full bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-left hover:bg-amber-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{c.numero}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{c.cliente_razao_social}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-amber-700 font-medium">{statusCautelaLabel(c.status)}</span>
                    <p className="text-xs text-slate-500 mt-0.5">{formatarData(c.data_emissao)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
