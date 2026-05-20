import { create } from "zustand";
import { countSyncPendentes } from "@/lib/db";

type SyncStatus = "sincronizado" | "pendente" | "erro" | "sem_conexao";

interface SyncState {
  status: SyncStatus;
  itensPendentes: number;
  ultimaSincronizacao: Date | null;
  erroDescricao: string | null;
  verificarPendentes: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  status: "sincronizado",
  itensPendentes: 0,
  ultimaSincronizacao: null,
  erroDescricao: null,
  verificarPendentes: async () => {
    try {
      const count = await countSyncPendentes();
      set({
        itensPendentes: count,
        status: count > 0 ? "pendente" : "sincronizado",
        erroDescricao: null,
      });
    } catch {
      set({ status: "erro", erroDescricao: "Erro ao verificar fila de sincronização" });
    }
  },
}));
