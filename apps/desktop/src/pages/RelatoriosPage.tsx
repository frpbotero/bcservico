import { useState, useEffect, useCallback } from "react";
import { Search, FileBarChart2, Loader2, ClipboardList, Receipt } from "lucide-react";
import {
  listClientes,
  getRelatorioCliente,
  getRelatorioRecibos,
  type RelatorioCliente,
  type RelatorioRecibos,
} from "@/lib/db";
import { formatarData, formatarMoeda, statusCautelaLabel, formasPagamentoLabel, cn } from "@/lib/utils";
import type { Cliente } from "@cautelas/shared";

const hoje = new Date().toISOString().slice(0, 10);
const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  .toISOString()
  .slice(0, 10);

type TipoRelatorio = "cautelas" | "recibos";

export default function RelatoriosPage() {
  const [tipo, setTipo] = useState<TipoRelatorio>("cautelas");
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busca, setBusca] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [dataInicio, setDataInicio] = useState(inicioMes);
  const [dataFim, setDataFim] = useState(hoje);
  const [loading, setLoading] = useState(false);
  const [relatorioCautelas, setRelatorioCautelas] = useState<RelatorioCliente | null>(null);
  const [relatorioRecibos, setRelatorioRecibos] = useState<RelatorioRecibos | null>(null);

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
    setRelatorioCautelas(null);
    setRelatorioRecibos(null);
  }

  function trocarTipo(t: TipoRelatorio) {
    setTipo(t);
    setRelatorioCautelas(null);
    setRelatorioRecibos(null);
  }

  async function gerar() {
    if (!clienteSelecionado) return;
    setLoading(true);
    try {
      if (tipo === "cautelas") {
        setRelatorioCautelas(await getRelatorioCliente(clienteSelecionado.id, dataInicio, dataFim));
        setRelatorioRecibos(null);
      } else {
        setRelatorioRecibos(await getRelatorioRecibos(clienteSelecionado.id, dataInicio, dataFim));
        setRelatorioCautelas(null);
      }
    } finally {
      setLoading(false);
    }
  }

  const totalItensCautelas = relatorioCautelas?.itens.reduce((s, i) => s + Number(i.quantidade_total), 0) ?? 0;

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <FileBarChart2 size={22} className="text-primary" />
        <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
      </div>

      {/* Seletor de tipo */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => trocarTipo("cautelas")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
            tipo === "cautelas"
              ? "bg-primary text-white border-primary"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
        >
          <ClipboardList size={15} /> Cautelas
        </button>
        <button
          onClick={() => trocarTipo("recibos")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
            tipo === "recibos"
              ? "bg-primary text-white border-primary"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          )}
        >
          <Receipt size={15} /> Recibos de Venda
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border p-5 mb-6 space-y-4">
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
                setRelatorioCautelas(null);
                setRelatorioRecibos(null);
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

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data início</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={dataInicio}
              onChange={(e) => { setDataInicio(e.target.value); setRelatorioCautelas(null); setRelatorioRecibos(null); }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Data fim</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={dataFim}
              onChange={(e) => { setDataFim(e.target.value); setRelatorioCautelas(null); setRelatorioRecibos(null); }}
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

      {/* ── RESULTADO: CAUTELAS ── */}
      {relatorioCautelas && (
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
            <p className="font-semibold text-slate-800 text-base">{clienteSelecionado?.razao_social}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Período: {formatarData(dataInicio)} a {formatarData(dataFim)}
              <span className="mx-2">·</span>
              {relatorioCautelas.cautelas.length} cautela{relatorioCautelas.cautelas.length !== 1 ? "s" : ""}
              <span className="mx-2">·</span>
              {relatorioCautelas.itens.length} produto{relatorioCautelas.itens.length !== 1 ? "s" : ""} distintos
            </p>
          </div>

          {relatorioCautelas.itens.length === 0 ? (
            <div className="bg-white rounded-xl border py-12 text-center text-slate-400 text-sm">
              Nenhuma cautela encontrada neste período
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Itens entregues</h2>
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
                      {relatorioCautelas.itens.map((item) => (
                        <tr key={item.produto_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{item.produto_nome}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{item.codigo_interno ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{item.unidade_medida}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {Number(item.quantidade_total).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">{item.num_cautelas}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-700">Total geral</td>
                        <td className="px-4 py-3 text-right font-bold text-primary text-base">
                          {totalItensCautelas.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Cautelas no período</h2>
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
                      {relatorioCautelas.cautelas.map((c) => (
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

      {/* ── RESULTADO: RECIBOS ── */}
      {relatorioRecibos && (
        <div className="space-y-6">
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
            <p className="font-semibold text-slate-800 text-base">{clienteSelecionado?.razao_social}</p>
            <p className="text-sm text-slate-500 mt-0.5">
              Período: {formatarData(dataInicio)} a {formatarData(dataFim)}
              <span className="mx-2">·</span>
              {relatorioRecibos.recibos.filter((r) => r.status === "emitido").length} recibo{relatorioRecibos.recibos.length !== 1 ? "s" : ""}
              <span className="mx-2">·</span>
              Total: <span className="font-semibold text-slate-700">{formatarMoeda(relatorioRecibos.total_periodo)}</span>
            </p>
          </div>

          {relatorioRecibos.itens.length === 0 ? (
            <div className="bg-white rounded-xl border py-12 text-center text-slate-400 text-sm">
              Nenhum recibo emitido neste período
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Produtos vendidos</h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Produto</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Unid.</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">Qtd. Total</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">Total (R$)</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">Nº Recibos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {relatorioRecibos.itens.map((item) => (
                        <tr key={item.produto_id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800">{item.produto_nome}</td>
                          <td className="px-4 py-3 text-slate-600">{item.unidade_medida}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {Number(item.quantidade_total).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {formatarMoeda(Number(item.valor_total))}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">{item.num_recibos}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-700">Total do período</td>
                        <td className="px-4 py-3 text-right font-bold text-primary text-base">
                          {formatarMoeda(relatorioRecibos.total_periodo)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-2">Recibos no período</h2>
                <div className="bg-white rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Número</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Data</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Pagamento</th>
                        <th className="text-right px-4 py-3 font-medium text-slate-600">Total</th>
                        <th className="text-left px-4 py-3 font-medium text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {relatorioRecibos.recibos.map((r) => (
                        <tr key={r.id} className={cn("hover:bg-slate-50", r.status === "cancelado" && "opacity-50")}>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-800">{r.numero}</td>
                          <td className="px-4 py-3 text-slate-600">{formatarData(r.data)}</td>
                          <td className="px-4 py-3 text-slate-600">{formasPagamentoLabel(r.forma_pagamento, r.forma_pagamento_outro)}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-800">{formatarMoeda(r.total_geral)}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              r.status === "cancelado" ? "bg-slate-100 text-slate-500" : "bg-green-100 text-green-700"
                            )}>
                              {r.status === "cancelado" ? "Cancelado" : "Emitido"}
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
