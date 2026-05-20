import Database from "@tauri-apps/plugin-sql";
import { v4 as uuidv4 } from "uuid";
import type {
  EmpresaEmissora,
  Usuario,
  Cliente,
  Produto,
  Cautela,
  CautelaItem,
  CautelaCompleta,
} from "@cautelas/shared";

let db: Database | null = null;
let dbLoading: Promise<Database> | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;
  if (!dbLoading) {
    dbLoading = Database.load("sqlite:cautelas.db").then((d) => {
      db = d;
      dbLoading = null;
      return d;
    });
  }
  return dbLoading;
}

const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS empresa_emissora (
  id TEXT PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  logradouro TEXT NOT NULL DEFAULT '',
  numero TEXT NOT NULL DEFAULT '',
  complemento TEXT,
  bairro TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  uf TEXT NOT NULL DEFAULT '',
  cep TEXT NOT NULL DEFAULT '',
  telefones TEXT,
  email TEXT,
  logotipo TEXT,
  texto_rodape TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  deletado_em TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pendente_sync',
  sync_at TEXT,
  criado_por TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK(perfil IN ('admin','operador','consulta')),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','inativo')),
  email TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  deletado_em TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pendente_sync',
  sync_at TEXT,
  criado_por TEXT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS clientes (
  id TEXT PRIMARY KEY,
  razao_social TEXT NOT NULL,
  cnpj_cpf TEXT NOT NULL UNIQUE,
  logradouro TEXT NOT NULL DEFAULT '',
  numero TEXT NOT NULL DEFAULT '',
  complemento TEXT,
  bairro TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  uf TEXT NOT NULL DEFAULT '',
  cep TEXT NOT NULL DEFAULT '',
  telefones TEXT,
  email TEXT,
  nome_contato TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','inativo')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  deletado_em TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pendente_sync',
  sync_at TEXT,
  criado_por TEXT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS produtos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  codigo_interno TEXT UNIQUE,
  descricao TEXT,
  unidade_medida TEXT NOT NULL DEFAULT 'Un',
  preco_referencia REAL,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','inativo')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  deletado_em TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pendente_sync',
  sync_at TEXT,
  criado_por TEXT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS cautelas (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  data_emissao TEXT NOT NULL,
  cliente_id TEXT NOT NULL REFERENCES clientes(id),
  nome_destinatario TEXT NOT NULL,
  cargo_destinatario TEXT,
  usuario_emissor_id TEXT NOT NULL REFERENCES usuarios(id),
  observacao_geral TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho'
    CHECK(status IN ('rascunho','aguardando_entrega','entregue_assinada','devolucao_parcial','encerrada')),
  assinatura_nome TEXT,
  assinatura_cargo TEXT,
  assinatura_imagem TEXT,
  assinatura_coletada_em TEXT,
  assinatura_operador_id TEXT REFERENCES usuarios(id),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  deletado_em TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pendente_sync',
  sync_at TEXT,
  criado_por TEXT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS cautela_itens (
  id TEXT PRIMARY KEY,
  cautela_id TEXT NOT NULL REFERENCES cautelas(id) ON DELETE CASCADE,
  produto_id TEXT NOT NULL REFERENCES produtos(id),
  quantidade REAL NOT NULL CHECK(quantidade > 0),
  observacao TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  criado_por TEXT REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  entidade TEXT NOT NULL,
  entidade_id TEXT NOT NULL,
  operacao TEXT NOT NULL CHECK(operacao IN ('create','update','delete')),
  payload TEXT NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK(status IN ('pendente','processando','concluido','erro')),
  erro TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sequencias (
  tipo TEXT PRIMARY KEY,
  ano INTEGER NOT NULL,
  ultimo_numero INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_cautelas_status ON cautelas(status);
CREATE INDEX IF NOT EXISTS idx_cautelas_cliente ON cautelas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cautela_itens_cautela ON cautela_itens(cautela_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj_cpf ON clientes(cnpj_cpf);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo_interno);
CREATE INDEX IF NOT EXISTS idx_usuarios_login ON usuarios(login);
`;

export async function initDb(): Promise<void> {
  const database = await getDb();
  await database.execute(SCHEMA_SQL);
}

// ---------- SYNC QUEUE ----------

export async function enqueueSync(
  entidade: string,
  entidade_id: string,
  operacao: "create" | "update" | "delete",
  payload: object
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `INSERT INTO sync_queue (id, entidade, entidade_id, operacao, payload) VALUES (?, ?, ?, ?, ?)`,
    [uuidv4(), entidade, entidade_id, operacao, JSON.stringify(payload)]
  );
}

export async function countSyncPendentes(): Promise<number> {
  const database = await getDb();
  const result = await database.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM sync_queue WHERE status = 'pendente'`
  );
  return result[0]?.count ?? 0;
}

// ---------- EMPRESA EMISSORA ----------

export async function getEmpresa(): Promise<EmpresaEmissora | null> {
  const database = await getDb();
  const rows = await database.select<EmpresaEmissora[]>(
    `SELECT * FROM empresa_emissora WHERE deletado_em IS NULL LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function saveEmpresa(
  data: Omit<EmpresaEmissora, "id" | "criado_em" | "atualizado_em" | "sync_status" | "sync_at">,
  usuarioId: string
): Promise<void> {
  const database = await getDb();
  const existing = await getEmpresa();
  if (existing) {
    await database.execute(
      `UPDATE empresa_emissora SET
        razao_social=?, nome_fantasia=?, cnpj=?, logradouro=?, numero=?,
        complemento=?, bairro=?, cidade=?, uf=?, cep=?, telefones=?,
        email=?, logotipo=?, texto_rodape=?, sync_status='pendente_sync'
       WHERE id=?`,
      [
        data.razao_social, data.nome_fantasia ?? null, data.cnpj, data.logradouro,
        data.numero, data.complemento ?? null, data.bairro, data.cidade, data.uf,
        data.cep, data.telefones ?? null, data.email ?? null, data.logotipo ?? null,
        data.texto_rodape ?? null, existing.id,
      ]
    );
    await enqueueSync("empresa_emissora", existing.id, "update", { ...data, id: existing.id });
  } else {
    const id = uuidv4();
    await database.execute(
      `INSERT INTO empresa_emissora
        (id, razao_social, nome_fantasia, cnpj, logradouro, numero, complemento,
         bairro, cidade, uf, cep, telefones, email, logotipo, texto_rodape, criado_por)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, data.razao_social, data.nome_fantasia ?? null, data.cnpj, data.logradouro,
        data.numero, data.complemento ?? null, data.bairro, data.cidade, data.uf,
        data.cep, data.telefones ?? null, data.email ?? null, data.logotipo ?? null,
        data.texto_rodape ?? null, usuarioId,
      ]
    );
    await enqueueSync("empresa_emissora", id, "create", { ...data, id });
  }
}

// ---------- USUÁRIOS ----------

export async function countUsuarios(): Promise<number> {
  const database = await getDb();
  const rows = await database.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM usuarios WHERE deletado_em IS NULL`
  );
  return rows[0]?.count ?? 0;
}

export async function getUsuarioByLogin(login: string): Promise<Usuario | null> {
  const database = await getDb();
  const rows = await database.select<Usuario[]>(
    `SELECT * FROM usuarios WHERE login = ? AND deletado_em IS NULL LIMIT 1`,
    [login]
  );
  return rows[0] ?? null;
}

export async function getUsuarioById(id: string): Promise<Usuario | null> {
  const database = await getDb();
  const rows = await database.select<Usuario[]>(
    `SELECT * FROM usuarios WHERE id = ? AND deletado_em IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listUsuarios(busca?: string): Promise<Usuario[]> {
  const database = await getDb();
  const q = busca ? `%${busca}%` : "%";
  return database.select<Usuario[]>(
    `SELECT * FROM usuarios WHERE deletado_em IS NULL AND (nome_completo LIKE ? OR login LIKE ?) ORDER BY nome_completo`,
    [q, q]
  );
}

export async function createUsuario(
  data: { nome_completo: string; login: string; senha_hash: string; perfil: string; email?: string },
  criadoPor: string | null
): Promise<Usuario> {
  const database = await getDb();
  const id = uuidv4();
  await database.execute(
    `INSERT INTO usuarios (id, nome_completo, login, senha_hash, perfil, status, email, criado_por)
     VALUES (?,?,?,?,?,?,?,?)`,
    [id, data.nome_completo, data.login, data.senha_hash, data.perfil, "ativo", data.email ?? null, criadoPor]
  );
  const usuario = await getUsuarioById(id);
  await enqueueSync("usuarios", id, "create", usuario!);
  return usuario!;
}

export async function updateUsuario(
  id: string,
  data: { nome_completo: string; perfil: string; status: string; email?: string; senha_hash?: string }
): Promise<void> {
  const database = await getDb();
  if (data.senha_hash) {
    await database.execute(
      `UPDATE usuarios SET nome_completo=?, perfil=?, status=?, email=?, senha_hash=?, sync_status='pendente_sync' WHERE id=?`,
      [data.nome_completo, data.perfil, data.status, data.email ?? null, data.senha_hash, id]
    );
  } else {
    await database.execute(
      `UPDATE usuarios SET nome_completo=?, perfil=?, status=?, email=?, sync_status='pendente_sync' WHERE id=?`,
      [data.nome_completo, data.perfil, data.status, data.email ?? null, id]
    );
  }
  const updated = await getUsuarioById(id);
  await enqueueSync("usuarios", id, "update", updated!);
}

// ---------- CLIENTES ----------

export async function listClientes(filtro?: { busca?: string; status?: string }): Promise<Cliente[]> {
  const database = await getDb();
  const q = filtro?.busca ? `%${filtro.busca}%` : "%";
  const statusFilter = filtro?.status ? filtro.status : null;
  if (statusFilter) {
    return database.select<Cliente[]>(
      `SELECT * FROM clientes WHERE deletado_em IS NULL AND status=? AND (razao_social LIKE ? OR cnpj_cpf LIKE ?) ORDER BY razao_social`,
      [statusFilter, q, q]
    );
  }
  return database.select<Cliente[]>(
    `SELECT * FROM clientes WHERE deletado_em IS NULL AND (razao_social LIKE ? OR cnpj_cpf LIKE ?) ORDER BY razao_social`,
    [q, q]
  );
}

export async function getClienteById(id: string): Promise<Cliente | null> {
  const database = await getDb();
  const rows = await database.select<Cliente[]>(
    `SELECT * FROM clientes WHERE id=? AND deletado_em IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function checkCnpjCpfExiste(cnpj_cpf: string, excludeId?: string): Promise<boolean> {
  const database = await getDb();
  const rows = await database.select<{ count: number }[]>(
    excludeId
      ? `SELECT COUNT(*) as count FROM clientes WHERE cnpj_cpf=? AND id!=? AND deletado_em IS NULL`
      : `SELECT COUNT(*) as count FROM clientes WHERE cnpj_cpf=? AND deletado_em IS NULL`,
    excludeId ? [cnpj_cpf, excludeId] : [cnpj_cpf]
  );
  return (rows[0]?.count ?? 0) > 0;
}

export async function createCliente(
  data: Omit<Cliente, "id" | "criado_em" | "atualizado_em" | "sync_status" | "sync_at">,
  usuarioId: string
): Promise<Cliente> {
  const database = await getDb();
  const id = uuidv4();
  await database.execute(
    `INSERT INTO clientes (id, razao_social, cnpj_cpf, logradouro, numero, complemento,
      bairro, cidade, uf, cep, telefones, email, nome_contato, observacoes, status, criado_por)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, data.razao_social, data.cnpj_cpf, data.logradouro, data.numero,
      data.complemento ?? null, data.bairro, data.cidade, data.uf, data.cep,
      data.telefones ?? null, data.email ?? null, data.nome_contato ?? null,
      data.observacoes ?? null, data.status ?? "ativo", usuarioId,
    ]
  );
  const cliente = await getClienteById(id);
  await enqueueSync("clientes", id, "create", cliente!);
  return cliente!;
}

export async function updateCliente(
  id: string,
  data: Omit<Cliente, "id" | "criado_em" | "atualizado_em" | "sync_status" | "sync_at">,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE clientes SET razao_social=?, cnpj_cpf=?, logradouro=?, numero=?, complemento=?,
      bairro=?, cidade=?, uf=?, cep=?, telefones=?, email=?, nome_contato=?, observacoes=?,
      status=?, sync_status='pendente_sync' WHERE id=?`,
    [
      data.razao_social, data.cnpj_cpf, data.logradouro, data.numero,
      data.complemento ?? null, data.bairro, data.cidade, data.uf, data.cep,
      data.telefones ?? null, data.email ?? null, data.nome_contato ?? null,
      data.observacoes ?? null, data.status ?? "ativo", id,
    ]
  );
  const updated = await getClienteById(id);
  await enqueueSync("clientes", id, "update", updated!);
}

export async function deleteCliente(id: string): Promise<"ok" | "tem_vinculos"> {
  const database = await getDb();
  const rows = await database.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM cautelas WHERE cliente_id=? AND deletado_em IS NULL`,
    [id]
  );
  if ((rows[0]?.count ?? 0) > 0) return "tem_vinculos";
  await database.execute(
    `UPDATE clientes SET deletado_em=datetime('now'), sync_status='pendente_sync' WHERE id=?`,
    [id]
  );
  await enqueueSync("clientes", id, "delete", { id });
  return "ok";
}

// ---------- PRODUTOS ----------

export async function listProdutos(filtro?: { busca?: string; status?: string }): Promise<Produto[]> {
  const database = await getDb();
  const q = filtro?.busca ? `%${filtro.busca}%` : "%";
  const statusFilter = filtro?.status ?? null;
  if (statusFilter) {
    return database.select<Produto[]>(
      `SELECT * FROM produtos WHERE deletado_em IS NULL AND status=? AND (nome LIKE ? OR codigo_interno LIKE ?) ORDER BY nome`,
      [statusFilter, q, q]
    );
  }
  return database.select<Produto[]>(
    `SELECT * FROM produtos WHERE deletado_em IS NULL AND (nome LIKE ? OR codigo_interno LIKE ?) ORDER BY nome`,
    [q, q]
  );
}

export async function getProdutoById(id: string): Promise<Produto | null> {
  const database = await getDb();
  const rows = await database.select<Produto[]>(
    `SELECT * FROM produtos WHERE id=? AND deletado_em IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function checkCodigoInternoExiste(codigo: string, excludeId?: string): Promise<boolean> {
  const database = await getDb();
  const rows = await database.select<{ count: number }[]>(
    excludeId
      ? `SELECT COUNT(*) as count FROM produtos WHERE codigo_interno=? AND id!=? AND deletado_em IS NULL`
      : `SELECT COUNT(*) as count FROM produtos WHERE codigo_interno=? AND deletado_em IS NULL`,
    excludeId ? [codigo, excludeId] : [codigo]
  );
  return (rows[0]?.count ?? 0) > 0;
}

export async function createProduto(
  data: Omit<Produto, "id" | "criado_em" | "atualizado_em" | "sync_status" | "sync_at">,
  usuarioId: string
): Promise<Produto> {
  const database = await getDb();
  const id = uuidv4();
  await database.execute(
    `INSERT INTO produtos (id, nome, codigo_interno, descricao, unidade_medida, preco_referencia, status, criado_por)
     VALUES (?,?,?,?,?,?,?,?)`,
    [
      id, data.nome, data.codigo_interno ?? null, data.descricao ?? null,
      data.unidade_medida, data.preco_referencia ?? null, data.status ?? "ativo", usuarioId,
    ]
  );
  const produto = await getProdutoById(id);
  await enqueueSync("produtos", id, "create", produto!);
  return produto!;
}

export async function updateProduto(
  id: string,
  data: Omit<Produto, "id" | "criado_em" | "atualizado_em" | "sync_status" | "sync_at">,
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE produtos SET nome=?, codigo_interno=?, descricao=?, unidade_medida=?,
      preco_referencia=?, status=?, sync_status='pendente_sync' WHERE id=?`,
    [
      data.nome, data.codigo_interno ?? null, data.descricao ?? null,
      data.unidade_medida, data.preco_referencia ?? null, data.status ?? "ativo", id,
    ]
  );
  const updated = await getProdutoById(id);
  await enqueueSync("produtos", id, "update", updated!);
}

export async function deleteProduto(id: string): Promise<"ok" | "tem_vinculos"> {
  const database = await getDb();
  const rows = await database.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM cautela_itens ci
      JOIN cautelas c ON c.id = ci.cautela_id
      WHERE ci.produto_id=? AND c.deletado_em IS NULL`,
    [id]
  );
  if ((rows[0]?.count ?? 0) > 0) return "tem_vinculos";
  await database.execute(
    `UPDATE produtos SET deletado_em=datetime('now'), sync_status='pendente_sync' WHERE id=?`,
    [id]
  );
  await enqueueSync("produtos", id, "delete", { id });
  return "ok";
}

// ---------- CAUTELAS ----------

export interface CautelaListItem extends Cautela {
  cliente_razao_social: string;
  cliente_cnpj_cpf: string;
}

export async function listCautelas(filtro?: {
  status?: string;
  busca?: string;
}): Promise<CautelaListItem[]> {
  const database = await getDb();
  const q = filtro?.busca ? `%${filtro.busca}%` : "%";
  const statusFilter = filtro?.status ?? null;
  if (statusFilter) {
    return database.select<CautelaListItem[]>(
      `SELECT c.*, cl.razao_social as cliente_razao_social, cl.cnpj_cpf as cliente_cnpj_cpf
       FROM cautelas c JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.deletado_em IS NULL AND c.status=? AND (c.numero LIKE ? OR cl.razao_social LIKE ?)
       ORDER BY c.criado_em DESC`,
      [statusFilter, q, q]
    );
  }
  return database.select<CautelaListItem[]>(
    `SELECT c.*, cl.razao_social as cliente_razao_social, cl.cnpj_cpf as cliente_cnpj_cpf
     FROM cautelas c JOIN clientes cl ON cl.id = c.cliente_id
     WHERE c.deletado_em IS NULL AND (c.numero LIKE ? OR cl.razao_social LIKE ?)
     ORDER BY c.criado_em DESC`,
    [q, q]
  );
}

export async function getCautelaCompleta(id: string): Promise<CautelaCompleta | null> {
  const database = await getDb();
  const cautelas = await database.select<Cautela[]>(
    `SELECT * FROM cautelas WHERE id=? AND deletado_em IS NULL LIMIT 1`,
    [id]
  );
  if (!cautelas[0]) return null;
  const cautela = cautelas[0];
  const cliente = await getClienteById(cautela.cliente_id);
  const itens = await database.select<(CautelaItem & { produto_nome: string; produto_unidade: string })[]>(
    `SELECT ci.*, p.nome as produto_nome, p.unidade_medida as produto_unidade
     FROM cautela_itens ci JOIN produtos p ON p.id = ci.produto_id
     WHERE ci.cautela_id=?`,
    [id]
  );
  return { ...cautela, cliente: cliente!, itens };
}

export async function proximoNumeroCautela(): Promise<string> {
  const database = await getDb();
  const ano = new Date().getFullYear();
  const rows = await database.select<{ ultimo_numero: number; ano: number }[]>(
    `SELECT ultimo_numero, ano FROM sequencias WHERE tipo='cautela'`
  );
  const existing = rows[0];
  let proximo: number;
  if (!existing || existing.ano !== ano) {
    proximo = 1;
    await database.execute(
      `INSERT OR REPLACE INTO sequencias (tipo, ano, ultimo_numero) VALUES ('cautela',?,?)`,
      [ano, 1]
    );
  } else {
    proximo = existing.ultimo_numero + 1;
    await database.execute(
      `UPDATE sequencias SET ultimo_numero=? WHERE tipo='cautela'`,
      [proximo]
    );
  }
  return `CAU-${ano}-${String(proximo).padStart(5, "0")}`;
}

export async function createCautela(
  data: {
    cliente_id: string;
    nome_destinatario: string;
    cargo_destinatario?: string;
    data_emissao: string;
    observacao_geral?: string;
    itens: { produto_id: string; quantidade: number; observacao?: string }[];
  },
  usuarioId: string
): Promise<Cautela> {
  const database = await getDb();
  const numero = await proximoNumeroCautela();
  const id = uuidv4();
  await database.execute(
    `INSERT INTO cautelas (id, numero, data_emissao, cliente_id, nome_destinatario,
      cargo_destinatario, usuario_emissor_id, observacao_geral, status, criado_por)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      id, numero, data.data_emissao, data.cliente_id, data.nome_destinatario,
      data.cargo_destinatario ?? null, usuarioId, data.observacao_geral ?? null,
      "rascunho", usuarioId,
    ]
  );
  for (const item of data.itens) {
    await database.execute(
      `INSERT INTO cautela_itens (id, cautela_id, produto_id, quantidade, observacao, criado_por)
       VALUES (?,?,?,?,?,?)`,
      [uuidv4(), id, item.produto_id, item.quantidade, item.observacao ?? null, usuarioId]
    );
  }
  const cautela = (await database.select<Cautela[]>(`SELECT * FROM cautelas WHERE id=?`, [id]))[0];
  await enqueueSync("cautelas", id, "create", cautela);
  return cautela;
}

export async function updateCautela(
  id: string,
  data: {
    cliente_id: string;
    nome_destinatario: string;
    cargo_destinatario?: string;
    data_emissao: string;
    observacao_geral?: string;
    itens: { produto_id: string; quantidade: number; observacao?: string }[];
  },
  usuarioId: string
): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE cautelas SET cliente_id=?, nome_destinatario=?, cargo_destinatario=?,
      data_emissao=?, observacao_geral=?, sync_status='pendente_sync' WHERE id=?`,
    [
      data.cliente_id, data.nome_destinatario, data.cargo_destinatario ?? null,
      data.data_emissao, data.observacao_geral ?? null, id,
    ]
  );
  await database.execute(`DELETE FROM cautela_itens WHERE cautela_id=?`, [id]);
  for (const item of data.itens) {
    await database.execute(
      `INSERT INTO cautela_itens (id, cautela_id, produto_id, quantidade, observacao, criado_por)
       VALUES (?,?,?,?,?,?)`,
      [uuidv4(), id, item.produto_id, item.quantidade, item.observacao ?? null, usuarioId]
    );
  }
  const updated = (await database.select<Cautela[]>(`SELECT * FROM cautelas WHERE id=?`, [id]))[0];
  await enqueueSync("cautelas", id, "update", updated);
}

export interface RelatorioItemLinha {
  produto_id: string;
  produto_nome: string;
  codigo_interno: string | null;
  unidade_medida: string;
  quantidade_total: number;
  num_cautelas: number;
}

export interface RelatorioClienteCautela {
  id: string;
  numero: string;
  data_emissao: string;
  status: string;
  nome_destinatario: string;
}

export interface RelatorioCliente {
  itens: RelatorioItemLinha[];
  cautelas: RelatorioClienteCautela[];
}

export async function getRelatorioCliente(
  clienteId: string,
  dataInicio: string,
  dataFim: string
): Promise<RelatorioCliente> {
  const database = await getDb();
  const itens = await database.select<RelatorioItemLinha[]>(
    `SELECT p.id as produto_id, p.nome as produto_nome, p.codigo_interno, p.unidade_medida,
            SUM(ci.quantidade) as quantidade_total,
            COUNT(DISTINCT c.id) as num_cautelas
     FROM cautela_itens ci
     JOIN cautelas c ON c.id = ci.cautela_id
     JOIN produtos p ON p.id = ci.produto_id
     WHERE c.cliente_id = ?
       AND c.data_emissao >= ? AND c.data_emissao <= ?
       AND c.deletado_em IS NULL AND c.status != 'rascunho'
       AND ci.deletado_em IS NULL
     GROUP BY p.id, p.nome, p.codigo_interno, p.unidade_medida
     ORDER BY p.nome`,
    [clienteId, dataInicio, dataFim]
  );
  const cautelas = await database.select<RelatorioClienteCautela[]>(
    `SELECT id, numero, data_emissao, status, nome_destinatario
     FROM cautelas
     WHERE cliente_id = ? AND data_emissao >= ? AND data_emissao <= ?
       AND deletado_em IS NULL AND status != 'rascunho'
     ORDER BY data_emissao DESC`,
    [clienteId, dataInicio, dataFim]
  );
  return { itens, cautelas };
}

export async function finalizarCautela(id: string, usuarioId: string): Promise<void> {
  const database = await getDb();
  await database.execute(
    `UPDATE cautelas SET status='aguardando_entrega', sync_status='pendente_sync' WHERE id=? AND status='rascunho'`,
    [id]
  );
  const updated = (await database.select<Cautela[]>(`SELECT * FROM cautelas WHERE id=?`, [id]))[0];
  await enqueueSync("cautelas", id, "update", updated);
  void usuarioId;
}
