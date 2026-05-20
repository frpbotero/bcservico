import { CheckCircle2, XCircle } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

interface LocationState {
  sucesso: boolean;
}

export function ConfirmacaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const sucesso = state?.sucesso ?? false;

  if (sucesso) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50">
        <div className="max-w-sm w-full text-center space-y-6">
          <CheckCircle2 size={72} className="mx-auto text-emerald-500" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">Assinatura Registrada</h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              A assinatura foi enviada com sucesso. A cautela foi encerrada e o desktop
              receberá a atualização na próxima sincronização.
            </p>
          </div>
          <button
            onClick={() => navigate('/cautelas', { replace: true })}
            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-semibold hover:bg-slate-700 active:bg-slate-900 transition-colors"
          >
            Voltar à Lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-slate-50">
      <div className="max-w-sm w-full text-center space-y-6">
        <XCircle size={72} className="mx-auto text-red-500" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">Falha no Envio</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Não foi possível registrar a assinatura. Verifique a conexão de dados e tente novamente.
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => navigate(`/cautelas/${id}/ateste`, { replace: true })}
            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-semibold hover:bg-slate-700 active:bg-slate-900 transition-colors"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => navigate('/cautelas', { replace: true })}
            className="w-full text-slate-600 py-3 rounded-2xl font-medium hover:bg-slate-100 transition-colors"
          >
            Voltar à Lista
          </button>
        </div>
      </div>
    </div>
  );
}
