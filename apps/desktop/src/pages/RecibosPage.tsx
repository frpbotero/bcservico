import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, FileDown, XCircle, Loader2 } from "lucide-react";
import { listRecibos, getReciboCompleto, cancelarRecibo, type ReciboListItem } from "@/lib/db";
import { getEmpresa } from "@/lib/db";
import { gerarPdfRecibo } from "@/lib/pdf";
import { valorPorExtenso, formatarData, formatarMoeda, formasPagamentoLabel, cn } from "@/lib/utils";
import { useSyncStore } from "@/store/syncStore";

const STATUS_STYLE: Record<string, string> = {
  emitido: "bg-green-100 text-green-700",
  cancelado: "bg-slate-100 text-slate-500 line-through",
};

export default function RecibosPage() {
  const navigate = useNavigate();
  const { verificarPendentes } = useSyncStore();
  const [recibos, setRecibos] = useState<ReciboListItem[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      setRecibos(await listRecibos());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const filtrados = recibos.filter((r) => {
    const q = busca.toLowerCase();
    return r.numero.toLowerCase().includes(q) || r.cliente_razao_social.toLowerCase().includes(q);
  });

  async function handleGerarPdf(id: string) {
    setGerandoPdf(id);
    try {
      const [recibo, empresa] = await Promise.all([getReciboCompleto(id), getEmpresa()]);
      if (!recibo || !empresa) { toast.error("Dados incompletos para gerar PDF"); return; }
      const caminho = await gerarPdfRecibo(recibo, empresa, valorPorExtenso(recibo.total_geral));
      if (caminho) toast.success(`PDF salvo em ${caminho}`);
    } catch (e) {
      toast.error("Erro ao gerar PDF: " + String(e));
    } finally {
      setGerandoPdf(null);
    }
  }

  async function handleCancelar(id: string, numero: string) {
    const motivo = window.prompt(`Motivo do cancelamento do Recibo ${numero}:`);
    if (motivo === null) return;
    if (!motivo.trim()) { toast.error("Informe o motivo do cancelamento"); return; }
    setCancelando(id);
    try {
      await cancelarRecibo(id, motivo.trim());
      await verificarPendentes();
      toast.success("Recibo cancelado");
      carregar();
    } catch (e) {
      toast.error("Erro ao cancelar: " + String(e));
    } finally {
      setCancelando(null);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-900">Recibos de Venda</h1>
        <button
          onClick={() => navigate("/recibos/novo")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90"
        >
          <Plus size={16} /> Novo Recibo
        </button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por número ou cliente…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full max-w-sm border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
          <Loader2 size={18} className="animate-spin" /> Carregando…
        </div>
      ) : filtrados.length === 0 ? (
        <p className="text-center py-20 text-slate-400 text-sm">
          {busca ? "Nenhum recibo encontrado." : "Nenhum recibo emitido ainda."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Número</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Data</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Pagamento</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map((r) => (
                <tr
                  key={r.id}
                  className={cn("hover:bg-slate-50 transition-colors", r.status === "cancelado" && "opacity-60")}
                >
                  <td className="px-4 py-3 font-mono font-medium text-slate-800">{r.numero}</td>
                  <td className="px-4 py-3 text-slate-600">{formatarData(r.data)}</td>
                  <td className="px-4 py-3 text-slate-700">{r.cliente_razao_social}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formasPagamentoLabel(r.forma_pagamento, r.forma_pagamento_outro)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-800">
                    {formatarMoeda(r.total_geral)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full", STATUS_STYLE[r.status] ?? "bg-slate-100 text-slate-600")}>
                      {r.status === "emitido" ? "Emitido" : "Cancelado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleGerarPdf(r.id)}
                        disabled={gerandoPdf === r.id}
                        title="Gerar PDF"
                        className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 disabled:opacity-40"
                      >
                        {gerandoPdf === r.id ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                      </button>
                      {r.status === "emitido" && (
                        <button
                          onClick={() => handleCancelar(r.id, r.numero)}
                          disabled={cancelando === r.id}
                          title="Cancelar recibo"
                          className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 disabled:opacity-40"
                        >
                          {cancelando === r.id ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
