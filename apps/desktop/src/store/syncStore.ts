import { create } from "zustand";
import { countSyncPendentes } from "@/lib/db";
import { executarSync } from "@/lib/sync";

type SyncStatus = "sincronizado" | "pendente" | "sincronizando" | "erro" | "sem_conexao";

interface SyncState {
  status: SyncStatus;
  itensPendentes: number;
  ultimaSincronizacao: Date | null;
  erroDescricao: string | null;
  verificarPendentes: () => Promise<void>;
  sincronizar: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: "sincronizado",
  itensPendentes: 0,
  ultimaSincronizacao: null,
  erroDescricao: null,

  verificarPendentes: async () => {
    try {
      const count = await countSyncPendentes();
      if (get().status !== "sincronizando") {
        set({
          itensPendentes: count,
          status: count > 0 ? "pendente" : "sincronizado",
          erroDescricao: null,
        });
      }
    } catch {
      set({ status: "erro", erroDescricao: "Erro ao verificar fila de sincronização" });
    }
  },

  sincronizar: async () => {
    if (get().status === "sincronizando") return;

    set({ status: "sincronizando", erroDescricao: null });
    try {
      await executarSync();
      const count = await countSyncPendentes();
      set({
        status: count > 0 ? "pendente" : "sincronizado",
        itensPendentes: count,
        ultimaSincronizacao: new Date(),
        erroDescricao: null,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro de sincronização";
      const count = await countSyncPendentes().catch(() => get().itensPendentes);
      set({ status: "sem_conexao", erroDescricao: msg, itensPendentes: count });
    }
  },
}));
