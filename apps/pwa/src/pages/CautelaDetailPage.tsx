import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiCautelaDetalhe } from '../api';
import type { CautelaCompleta } from '../types';

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatQtd(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function CautelaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cautela, setCautela] = useState<CautelaCompleta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!id) return;
    apiCautelaDetalhe(id)
      .then(setCautela)
      .catch(() => setErro('Erro ao carregar cautela.'))
      .finally(() => setCarregando(false));
  }, [id]);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 text-sm">
        Carregando…
      </div>
    );
  }

  if (erro || !cautela) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-red-600 text-sm">{erro || 'Cautela não encontrada.'}</p>
        <button onClick={() => navigate(-1)} className="text-slate-600 underline text-sm">
          Voltar
        </button>
      </div>
    );
  }

  const c = cautela;
  const endereco = [c.cliente.logradouro, c.cliente.numero, c.cliente.bairro]
    .filter(Boolean)
    .join(', ');
  const cidadeUF = `${c.cliente.cidade}/${c.cliente.uf} — CEP ${c.cliente.cep}`;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800 text-white px-4 py-4 safe-top sticky top-0 z-10">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-700 active:bg-slate-600 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-semibold text-base">{c.numero}</h1>
            <p className="text-slate-400 text-xs">{formatData(c.data_emissao)}</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        {/* Cliente */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-1">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cliente</h2>
          <p className="font-semibold text-slate-800">{c.cliente.razao_social}</p>
          <p className="text-sm text-slate-600">CNPJ/CPF: {c.cliente.cnpj_cpf}</p>
          {endereco && <p className="text-sm text-slate-600">{endereco}</p>}
          <p className="text-sm text-slate-600">{cidadeUF}</p>
        </section>

        {/* Destinatário */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-1">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Destinatário</h2>
          <p className="font-semibold text-slate-800">{c.nome_destinatario}</p>
          {c.cargo_destinatario && (
            <p className="text-sm text-slate-600">{c.cargo_destinatario}</p>
          )}
        </section>

        {/* Itens */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 pt-4 pb-2">
            Itens ({c.itens.length})
          </h2>
          <ul className="divide-y divide-slate-100">
            {c.itens.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm">{item.produto.nome}</p>
                    {item.produto.codigo_interno && (
                      <p className="text-xs text-slate-400">{item.produto.codigo_interno}</p>
                    )}
                    {item.observacao && (
                      <p className="text-xs text-slate-500 mt-0.5">{item.observacao}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                    {formatQtd(item.quantidade)} {item.produto.unidade_medida}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Observações */}
        {c.observacao_geral && (
          <section className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Observações</h2>
            <p className="text-sm text-amber-900">{c.observacao_geral}</p>
          </section>
        )}
      </main>

      {/* CTA fixo */}
      {c.status === 'aguardando_entrega' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-bottom">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => navigate(`/cautelas/${c.id}/ateste`)}
              className="w-full bg-slate-800 text-white py-4 rounded-2xl font-semibold text-base hover:bg-slate-700 active:bg-slate-900 transition-colors"
            >
              Iniciar Ateste e Assinatura
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
