import { useEffect } from "react";
import { useSyncStore } from "@/store/syncStore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw } from "lucide-react";

const SYNC_INTERVAL_MS = 60_000; // 60 segundos

export default function SyncStatusBar() {
  const { status, itensPendentes, ultimaSincronizacao, erroDescricao, sincronizar, verificarPendentes } =
    useSyncStore();

  useEffect(() => {
    // Verifica pendentes imediatamente ao montar
    verificarPendentes();
    // Tenta sincronizar em loop periódico
    const interval = setInterval(sincronizar, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sincronizar, verificarPendentes]);

  const isSyncing = status === "sincronizando";

  const dot = cn("w-2 h-2 rounded-full flex-shrink-0", {
    "bg-green-400": status === "sincronizado",
    "bg-amber-400 animate-pulse": status === "pendente" || status === "sincronizando",
    "bg-red-400": status === "erro" || status === "sem_conexao",
  });

  const label = (() => {
    if (isSyncing) return "Sincronizando…";
    if (status === "pendente") return `${itensPendentes} item(s) aguardando sincronização`;
    if (status === "erro") return erroDescricao ?? "Erro de sincronização";
    if (status === "sem_conexao") return erroDescricao ?? "Sem conexão — trabalhando offline";
    if (ultimaSincronizacao)
      return `Sincronizado em ${format(ultimaSincronizacao, "HH:mm", { locale: ptBR })}`;
    return "Sincronizado";
  })();

  return (
    <div className="fixed bottom-0 left-0 right-0 h-6 bg-slate-950 flex items-center px-3 gap-2 z-50">
      <span className={dot} />
      <span className="text-xs text-slate-400 flex-1 truncate">{label}</span>
      <button
        onClick={sincronizar}
        disabled={isSyncing}
        title="Sincronizar agora"
        className="text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
      >
        <RefreshCw size={12} className={cn({ "animate-spin": isSyncing })} />
      </button>
    </div>
  );
}
