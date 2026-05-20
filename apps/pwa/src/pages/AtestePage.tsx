import { ArrowLeft, Eraser } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRegistrarAssinatura } from '../api';

const DECLARACAO =
  'Declaro que recebi os materiais descritos neste documento em perfeitas condições, ' +
  'conferindo as quantidades e especificações acima relacionadas.';

export function AtestePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [vazio, setVazio] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState('');

  // Configura o canvas e os event listeners de toque/mouse
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Captura explicitamente como não-nulo para uso seguro dentro das closures
    const el: HTMLCanvasElement = canvas;

    const ctx = el.getContext('2d')!;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e: TouchEvent | MouseEvent): { x: number; y: number } {
      const rect = el.getBoundingClientRect();
      const scaleX = el.width / rect.width;
      const scaleY = el.height / rect.height;
      if ('touches' in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }

    function onStart(e: TouchEvent | MouseEvent) {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }

    function onMove(e: TouchEvent | MouseEvent) {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setVazio(false);
    }

    function onEnd() {
      isDrawingRef.current = false;
    }

    canvas.addEventListener('touchstart', onStart, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onEnd);
    canvas.addEventListener('mousedown', onStart);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onEnd);
    canvas.addEventListener('mouseleave', onEnd);

    return () => {
      canvas.removeEventListener('touchstart', onStart);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onEnd);
      canvas.removeEventListener('mousedown', onStart);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('mouseleave', onEnd);
    };
  }, []);

  function limparCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setVazio(true);
  }

  function getImagemBase64(): string {
    const canvas = canvasRef.current!;
    // Cria canvas com fundo branco para o PNG final
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const outCtx = out.getContext('2d')!;
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, out.width, out.height);
    outCtx.drawImage(canvas, 0, 0);
    return out.toDataURL('image/png');
  }

  async function handleConfirmar() {
    if (!id) return;
    setErroEnvio('');
    setEnviando(true);
    try {
      await apiRegistrarAssinatura(id, {
        assinatura_imagem: getImagemBase64(),
        assinatura_nome: nome.trim(),
        assinatura_cargo: cargo.trim() || undefined,
      });
      navigate(`/cautelas/${id}/confirmacao`, {
        replace: true,
        state: { sucesso: true },
      });
    } catch {
      setErroEnvio('Falha ao enviar a assinatura. Verifique a conexão e tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  const podeCofirmar = nome.trim().length > 0 && !vazio && !enviando;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
          <h1 className="font-semibold text-base">Ateste e Assinatura</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-5 pb-32">
        {/* Declaração */}
        <section className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <h2 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">
            Declaração — Conferi e Recebi
          </h2>
          <p className="text-sm text-blue-900 leading-relaxed italic">"{DECLARACAO}"</p>
        </section>

        {/* Dados do assinante */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Dados do Recebedor
          </h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="nome">
              Nome completo <span className="text-red-500">*</span>
            </label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome de quem está recebendo"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700" htmlFor="cargo">
              Cargo / Função <span className="text-slate-400 text-xs font-normal">(opcional)</span>
            </label>
            <input
              id="cargo"
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex: Almoxarife, Supervisor…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>
        </section>

        {/* Canvas assinatura */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Assinatura <span className="text-red-500">*</span>
            </h2>
            <button
              onClick={limparCanvas}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 active:text-slate-900 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <Eraser size={13} />
              Limpar
            </button>
          </div>
          <div className="relative mx-4 mb-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
            {vazio && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-slate-400 text-sm">Assine aqui com o dedo</p>
              </div>
            )}
            <canvas
              ref={canvasRef}
              width={600}
              height={200}
              className="w-full touch-none"
              style={{ height: '180px' }}
            />
          </div>
        </section>

        {erroEnvio && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            {erroEnvio}
          </div>
        )}
      </main>

      {/* CTA fixo */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 safe-bottom">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleConfirmar}
            disabled={!podeCofirmar}
            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-semibold text-base hover:bg-slate-700 active:bg-slate-900 disabled:opacity-40 transition-colors"
          >
            {enviando ? 'Enviando…' : 'Confirmar Assinatura'}
          </button>
          {(!nome.trim() || vazio) && (
            <p className="text-center text-xs text-slate-400 mt-2">
              {!nome.trim() && vazio
                ? 'Preencha o nome e assine para continuar'
                : !nome.trim()
                ? 'Preencha o nome para continuar'
                : 'Assine no campo acima para continuar'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
