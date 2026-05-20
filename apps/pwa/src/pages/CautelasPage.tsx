import { LogOut, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCautelasPendentes } from '../api';
import { useAuth } from '../context/AuthContext';
import type { CautelaPendente } from '../types';

function formatData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR');
}

export function CautelasPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [cautelas, setCautelas] = useState<CautelaPendente[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  async function carregar() {
    setErro('');
    setCarregando(true);
    try {
      const dados = await apiCautelasPendentes();
      setCautelas(dados);
    } catch {
      setErro('Erro ao carregar cautelas. Verifique a conexão.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const filtradas = cautelas.filter((c) => {
    const q = busca.toLowerCase();
    return (
      c.numero.toLowerCase().includes(q) ||
      c.cliente.razao_social.toLowerCase().includes(q) ||
      c.nome_destinatario.toLowerCase().includes(q)
    );
  });

  function handleLogout() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-slate-800 text-white px-4 py-4 safe-top">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="font-semibold text-base">Cautelas Pendentes</h1>
            <p className="text-slate-400 text-xs mt-0.5">{user?.nome_completo}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={carregar}
              className="p-2 rounded-lg hover:bg-slate-700 active:bg-slate-600 transition-colors"
              aria-label="Atualizar"
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-slate-700 active:bg-slate-600 transition-colors"
              aria-label="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="px-4 py-3 max-w-lg mx-auto w-full">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Buscar por número, cliente ou destinatário…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        {carregando && (
          <div className="text-center py-16 text-slate-500 text-sm">Carregando…</div>
        )}

        {!carregando && erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {erro}
            <button onClick={carregar} className="block mt-2 font-medium underline">
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && filtradas.length === 0 && (
          <div className="text-center py-16 text-slate-500 text-sm">
            {busca ? 'Nenhuma cautela encontrada.' : 'Não há cautelas aguardando entrega.'}
          </div>
        )}

        {!carregando && !erro && filtradas.length > 0 && (
          <ul className="space-y-3">
            {filtradas.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate(`/cautelas/${c.id}`)}
                  className="w-full text-left bg-white rounded-2xl shadow-sm border border-slate-100 p-4 hover:border-slate-300 active:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 text-sm">{c.numero}</span>
                    <span className="text-xs text-slate-500">{formatData(c.data_emissao)}</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">{c.cliente.razao_social}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {c.nome_destinatario}
                    {c.cargo_destinatario && ` — ${c.cargo_destinatario}`}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {c.cliente.cidade}/{c.cliente.uf}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
