import { useState, useEffect, useCallback } from "react";
import { Search, FileBarChart2, Loader2 } from "lucide-react";
import { listClientes, getRelatorioCliente, type RelatorioCliente } from "@/lib/db";
import { formatarData, statusCautelaLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Cliente } from "@cautelas/shared";

const hoje = new Date().toISOString().slice(0, 10);
const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

export default function RelatoriosPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [dataInicio, setDataInicio] = useState(inicioMes);
  const [dataFim, setDataFim] = useState(hoje);
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState<RelatorioCliente | null>(null);

  const carregarClientes = useCallback(async () => {
    const data = await listClientes({ busca: busca || undefined, status: "ativo" });
    setClientes(data);
  }, [busca]);

  useEffect(() => {
    const t = setTimeout(carregarClientes, 200);
    return () => clearTimeout(t);
  }, [carregarClientes]);

  function selecionarCliente(c: Cliente) {
    setClienteSelecionado(c);
    setBusca(c.razao_social);
    setMostrarDropdown(false);
    setRelatorio(null);
  }

  async function gerar() {
    if (!clienteSelecionado) return;
    setLoading(true);
    try {
      const data = await getRelatorioCliente(clienteSelecionado.id, dataInicio, dataFim);
      setRelatorio(data);
    } finally {
      setLoading(false);
    }
  }

  const totalItens = relatorio?.itens.reduce((s, i) => s + Number(i.quantidade_total), 0) ?? 0;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <FileBarChart2 size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-slate-900">Relatório por Cliente</h1>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border p-5 mb-6 space-y-4">
        {/* Seletor de cliente */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setClienteSelecionado(null);
                setMostrarDropdown(true);
                setRelatorio(null);
              }}
              onFocus={() => setMostrarDropdown(true)}
              onBlur={() => setTimeout(() => setMostrarDropdown(false), 150)}
            />
            {mostrarDropdown && clientes.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                {clientes.map((c) => (
                  <button
                    key={c.id}
                    onMouseDown={() => selecionarCliente(c)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 border-b last:border-b-0"
                  >
                    <span className="font-medium text-slate-800">{c.razao_social}</span>
                    <span className="ml-2 text-xs text-slate-400 font-mono">{c.cnpj_cpf}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Período */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data início</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setRelatorio(null); }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data fim</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setRelatorio(null); }}
            />
          </div>
          <button
            onClick={gerar}
            disabled={!clienteSelecionado || loading}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <FileBarChart2 size={15} />}
            Gerar
          </button>
        </div>
      </div>

      {/* Resultados */}
      {relatorio && (
        <div className="space-y-6">
          {/* Cabeçalho do relatório */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
            <p className="font-semibold text-slate-800 text-base">{clienteSelecionado?.razao_social}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Período: {formatarData(dataInicio)} a {formatarData(dataFim)}
              <span className="mx-2">·</span>
              {relatorio.cautelas.length} cautela{relatorio.cautelas.length !== 1 ? "s" : ""}
              <span className="mx-2">·</span>
              {relatorio.itens.length} produto{relatorio.itens.length !== 1 ? "s" : ""} distintos
            </p>
          </div>

          {relatorio.itens.length === 0 ? (
            <div className="bg-white rounded-xl border py-12 text-center text-slate-400 text-sm">
              Nenhuma cautela finalizada encontrada neste período
            </div>
          ) : (
            <>
              {/* Tabela de itens agrupados */}
              <div>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  Itens entregues
                </h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Produto</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Cód. Interno</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Unid.</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">Qtd. Total</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">Nº Cautelas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {relatorio.itens.map((item) => (
                        <tr key={item.produto_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{item.produto_nome}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                            {item.codigo_interno ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{item.unidade_medida}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {Number(item.quantidade_total).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">{item.num_cautelas}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-700">
                          Total geral
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary text-base">
                          {totalItens.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Lista de cautelas do período */}
              <div>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">
                  Cautelas no período
                </h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Número</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Destinatário</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Data emissão</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {relatorio.cautelas.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">{c.numero}</td>
                          <td className="px-4 py-3 text-slate-600">{c.nome_destinatario}</td>
                          <td className="px-4 py-3 text-slate-600">{formatarData(c.data_emissao)}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              c.status === "encerrada" ? "bg-slate-100 text-slate-500" :
                              c.status === "devolucao_parcial" ? "bg-blue-100 text-blue-700" :
                              "bg-green-100 text-green-700"
                            )}>
                              {statusCautelaLabel(c.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
