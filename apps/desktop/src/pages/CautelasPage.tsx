import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileText, CheckCircle } from "lucide-react";
import { listCautelas, finalizarCautela, getCautelaCompleta, getEmpresa, type CautelaListItem } from "@/lib/db";
import { useAuthStore } from "@/store/authStore";
import { useSyncStore } from "@/store/syncStore";
import { formatarData, statusCautelaLabel } from "@/lib/utils";
import { gerarPdfCautela } from "@/lib/pdf";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "rascunho", label: "Rascunho" },
  { value: "aguardando_entrega", label: "Aguardando Entrega" },
  { value: "entregue_assinada", label: "Entregue / Assinada" },
  { value: "devolucao_parcial", label: "Devolução Parcial" },
  { value: "encerrada", label: "Encerrada" },
];

function StatusBadge({ status }: { status: string }) {
  const cls = cn("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", {
    "bg-slate-100 text-slate-600": status === "rascunho",
    "bg-amber-100 text-amber-700": status === "aguardando_entrega",
    "bg-green-100 text-green-700": status === "entregue_assinada",
    "bg-blue-100 text-blue-700": status === "devolucao_parcial",
    "bg-slate-200 text-slate-500": status === "encerrada",
  });
  return <span className={cls}>{statusCautelaLabel(status)}</span>;
}

export default function CautelasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const { verificarPendentes } = useSyncStore();
  const [cautelas, setCautelas] = useState<CautelaListItem[]>([]);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const isConsulta = usuario?.perfil === "consulta";

  const carregar = useCallback(async () => {
    const data = await listCautelas({ busca: busca || undefined, status: statusFiltro || undefined });
    setCautelas(data);
  }, [busca, statusFiltro]);

  useEffect(() => {
    const t = setTimeout(carregar, 250);
    return () => clearTimeout(t);
  }, [carregar]);

  async function handleFinalizar(c: CautelaListItem) {
    if (!confirm(`Finalizar cautela ${c.numero}? Ela ficará disponível para assinatura no campo.`)) return;
    await finalizarCautela(c.id, usuario!.id);
    await verificarPendentes();
    carregar();
    toast.success(`Cautela ${c.numero} finalizada — aguardando entrega`);
  }

  async function handlePdf(c: CautelaListItem) {
    try {
      const [cautela, empresa] = await Promise.all([
        getCautelaCompleta(c.id),
        getEmpresa(),
      ]);
      if (!cautela) {
        toast.error("Cautela não encontrada");
        return;
      }
      if (!empresa) {
        toast.error("Configure os dados da empresa antes de gerar o PDF (Configurações)");
        return;
      }
      const caminho = await gerarPdfCautela({ cautela, empresa });
      if (caminho) {
        toast.success(`PDF salvo em ${caminho}`);
      }
    } catch (err) {
      toast.error(`Erro ao gerar PDF: ${String(err)}`);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Cautelas</h1>
        {!isConsulta && (
          <button
            onClick={() => navigate("/cautelas/nova")}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus size={16} /> Nova cautela
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Buscar por número ou cliente…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {cautelas.length === 0 && (
          <div className="bg-white rounded-xl border py-12 text-center text-slate-400 text-sm">
            Nenhuma cautela encontrada
          </div>
        )}
        {cautelas.map((c) => (
          <div
            key={c.id}
            className={cn(
              "bg-white rounded-xl border px-5 py-4 flex items-center gap-4",
              c.status === "aguardando_entrega" && "border-amber-300 bg-amber-50"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-mono text-sm font-semibold text-slate-800">{c.numero}</span>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-sm text-slate-700 truncate">{c.cliente_razao_social}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {c.nome_destinatario} {c.cargo_destinatario ? `· ${c.cargo_destinatario}` : ""} · Emitida em {formatarData(c.data_emissao)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!isConsulta && c.status === "rascunho" && (
                <>
                  <button
                    onClick={() => navigate(`/cautelas/${c.id}/editar`)}
                    className="text-xs text-slate-500 hover:text-slate-800 border rounded-lg px-3 py-1.5 hover:bg-slate-50"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleFinalizar(c)}
                    className="text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg px-3 py-1.5 flex items-center gap-1"
                  >
                    <CheckCircle size={13} /> Finalizar
                  </button>
                </>
              )}
              <button
                onClick={() => handlePdf(c)}
                className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5 flex items-center gap-1 bg-blue-50 hover:bg-blue-100"
              >
                <FileText size={13} /> PDF
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
