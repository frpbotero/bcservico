import { getDb } from "./db";

export interface SyncConfig {
  backend_url: string;
  backend_login: string;
  backend_senha: string;
  last_pull_at: string;
}

interface SyncQueueRow {
  id: string;
  entidade: string;
  entidade_id: string;
  operacao: "create" | "update" | "delete";
  payload: string;
  tentativas: number;
}

// Token em memória — persiste durante a sessão, limpa ao reiniciar o app
let cachedToken: string | null = null;
let tokenExpiry = 0;

const ENTITY_TABLE: Record<string, string> = {
  empresa_emissora: "empresa_emissora",
  usuarios: "usuarios",
  clientes: "clientes",
  produtos: "produtos",
  cautelas: "cautelas",
  recibos: "recibos",
  // cautela_itens e recibo_itens não têm sync_status — omitidos intencionalmente
};

// ---------- CONFIG ----------

export async function getSyncConfig(): Promise<SyncConfig | null> {
  const db = await getDb();
  const rows = await db.select<SyncConfig[]>(
    `SELECT backend_url, backend_login, backend_senha, last_pull_at
     FROM sync_config WHERE id='default' LIMIT 1`
  );
  const cfg = rows[0];
  if (!cfg || !cfg.backend_url) return null;
  return cfg;
}

export async function saveSyncConfig(
  config: Pick<SyncConfig, "backend_url" | "backend_login" | "backend_senha">
): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE sync_config SET backend_url=?, backend_login=?, backend_senha=? WHERE id='default'`,
    [config.backend_url.trim(), config.backend_login.trim(), config.backend_senha]
  );
  // Invalida token cacheado ao trocar credenciais
  cachedToken = null;
  tokenExpiry = 0;
}

// ---------- AUTH ----------

async function getToken(config: SyncConfig): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${config.backend_url}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: config.backend_login, senha: config.backend_senha }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Autenticação falhou (${res.status})`);
  }

  const data = await res.json() as { access_token: string };
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + 7 * 3600 * 1000; // 7h (antes do token expirar em 8h)
  return cachedToken;
}

export async function testarConexao(
  url: string,
  login: string,
  senha: string
): Promise<void> {
  const res = await fetch(`${url.trim()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: login.trim(), senha }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Erro ${res.status}`);
  }
}

// ---------- PUSH ----------

export interface PushResult {
  enviados: number;
  erros: string[];
}

export async function executarPush(config: SyncConfig): Promise<PushResult> {
  const db = await getDb();

  const items = await db.select<SyncQueueRow[]>(
    `SELECT id, entidade, entidade_id, operacao, payload, tentativas
     FROM sync_queue WHERE status = 'pendente' ORDER BY criado_em LIMIT 100`
  );

  if (items.length === 0) return { enviados: 0, erros: [] };

  const ids = items.map((i) => i.id);
  const ph = ids.map(() => "?").join(",");

  await db.execute(
    `UPDATE sync_queue SET status='processando' WHERE id IN (${ph})`,
    ids
  );

  let token: string;
  try {
    token = await getToken(config);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro de autenticação";
    await db.execute(
      `UPDATE sync_queue SET status='pendente', tentativas=tentativas+1, erro=? WHERE id IN (${ph})`,
      [msg, ...ids]
    );
    throw e;
  }

  const operacoes = items.map((item) => ({
    entidade: item.entidade,
    entidade_id: item.entidade_id,
    operacao: item.operacao,
    payload: JSON.parse(item.payload) as Record<string, unknown>,
  }));

  const res = await fetch(`${config.backend_url}/sync/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ operacoes }),
  });

  if (!res.ok) {
    if (res.status === 401) { cachedToken = null; tokenExpiry = 0; }
    const msg = `HTTP ${res.status}`;
    await db.execute(
      `UPDATE sync_queue SET status='pendente', tentativas=tentativas+1, erro=? WHERE id IN (${ph})`,
      [msg, ...ids]
    );
    throw new Error(`Push falhou: ${msg}`);
  }

  const result = await res.json() as { ok: number; errors: string[] };

  // Marca como concluído e atualiza sync_status das entidades
  await db.execute(
    `UPDATE sync_queue SET status='concluido', atualizado_em=datetime('now') WHERE id IN (${ph})`,
    ids
  );

  for (const item of items) {
    if (item.operacao !== "delete") {
      const table = ENTITY_TABLE[item.entidade];
      if (table) {
        await db.execute(
          `UPDATE ${table} SET sync_status='sincronizado', sync_at=datetime('now') WHERE id=?`,
          [item.entidade_id]
        );
      }
    }
  }

  return { enviados: result.ok, erros: result.errors };
}

// ---------- PULL ----------

interface AssinaturaPull {
  id: string;
  assinatura_nome: string;
  assinatura_cargo: string | null;
  assinatura_imagem: string;
  assinatura_coletada_em: string;
}

export interface PullResult {
  assinaturasRecebidas: number;
}

export async function executarPull(config: SyncConfig): Promise<PullResult> {
  const token = await getToken(config);

  const res = await fetch(
    `${config.backend_url}/sync/pull?since=${encodeURIComponent(config.last_pull_at)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    if (res.status === 401) { cachedToken = null; tokenExpiry = 0; }
    throw new Error(`Pull falhou: HTTP ${res.status}`);
  }

  const data = await res.json() as { cautelas: AssinaturaPull[] };
  const db = await getDb();

  for (const c of data.cautelas) {
    await db.execute(
      `UPDATE cautelas SET
         status='entregue_assinada',
         assinatura_nome=?, assinatura_cargo=?,
         assinatura_imagem=?, assinatura_coletada_em=?,
         sync_status='sincronizado', sync_at=datetime('now')
       WHERE id=? AND status='aguardando_entrega'`,
      [
        c.assinatura_nome,
        c.assinatura_cargo ?? null,
        c.assinatura_imagem,
        c.assinatura_coletada_em,
        c.id,
      ]
    );
  }

  if (data.cautelas.length > 0) {
    const latest = data.cautelas.reduce((a, b) =>
      a.assinatura_coletada_em > b.assinatura_coletada_em ? a : b
    );
    await db.execute(
      `UPDATE sync_config SET last_pull_at=? WHERE id='default'`,
      [latest.assinatura_coletada_em]
    );
  }

  return { assinaturasRecebidas: data.cautelas.length };
}

// ---------- SYNC COMPLETO ----------

export async function executarSync(): Promise<{ push: PushResult; pull: PullResult }> {
  const config = await getSyncConfig();
  if (!config) throw new Error("Backend não configurado em Configurações");

  const push = await executarPush(config);
  const pull = await executarPull(config);
  return { push, pull };
}
