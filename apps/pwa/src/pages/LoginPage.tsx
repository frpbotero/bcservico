import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin } from '../api';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isAuthenticated } = useAuth();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  if (isAuthenticated) {
    navigate('/cautelas', { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const res = await apiLogin(login.trim(), senha);
      signIn(res.access_token, res.user);
      navigate('/cautelas', { replace: true });
    } catch {
      setErro('Usuário ou senha inválidos.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-800">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">App Cautelas</h1>
          <p className="text-slate-400 text-sm mt-1">Assinatura Digital</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="login">
              Usuário
            </label>
            <input
              id="login"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-600"
              required
            />
          </div>

          {erro && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-slate-800 text-white py-3 rounded-lg font-medium hover:bg-slate-700 active:bg-slate-900 disabled:opacity-50 transition-colors"
          >
            {carregando ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
