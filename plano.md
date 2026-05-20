# Plano: App Cautelas — Construção da Aplicação

## Contexto

Sistema de gestão de Cautelas, Orçamentos e Recibos de Venda especificado em `instruction.md`. Projeto greenfield (pasta vazia). O usuário escolheu Tauri v2 + React para o desktop, NestJS + Prisma para o backend, React PWA para mobile — organizados em monorepo Turborepo com pnpm workspaces.

**Foco atual:** implementar apenas a Fase 1 (Desktop), que inclui F1.1 a F1.7. Backend e PWA ficam como stubs.

---

## Pré-requisitos (instalar antes de começar)

```powershell
npm install -g pnpm@9
winget install Rustlang.Rustup        # Fechar/reabrir terminal após
# Visual Studio Build Tools com "Desktop development with C++"
cargo install tauri-cli --version "^2.0"
```

---

## Estrutura do Monorepo

```
App_cautelas/
├── package.json            # root: workspaces + scripts turbo
├── pnpm-workspace.yaml
├── turbo.json
├── .npmrc                  # shamefully-hoist=true (obrigatório Tauri)
├── .gitignore
├── apps/
│   ├── desktop/            # Tauri v2 + React (IMPLEMENTAR FASE 1)
│   │   ├── src/            # Frontend React
│   │   │   ├── lib/        # db.ts, auth.ts, pdf.ts, validators.ts, masks.ts
│   │   │   ├── store/      # authStore.ts, syncStore.ts (Zustand)
│   │   │   ├── hooks/      # useAuth.ts, useDb.ts, useSync.ts
│   │   │   ├── components/
│   │   │   │   ├── layout/ # AppShell.tsx, Sidebar.tsx, SyncStatusBar.tsx
│   │   │   │   ├── ui/     # shadcn/ui components
│   │   │   │   └── shared/ # DataTable, StatusBadge, MaskedInput, ConfirmDialog
│   │   │   └── pages/      # LoginPage, Dashboard, Configuracoes, Usuarios,
│   │   │                   # Clientes, Produtos, Cautelas (form + list)
│   │   └── src-tauri/
│   │       ├── Cargo.toml
│   │       ├── tauri.conf.json
│   │       └── src/
│   │           ├── lib.rs          # registrar plugins e commands
│   │           └── commands/
│   │               ├── auth.rs     # hash_password, verify_password
│   │               ├── pdf.rs      # generate_pdf (printpdf)
│   │               └── sync.rs     # trigger_sync (stub Fase 1)
│   ├── backend/            # NestJS stub (implementar Fase 3)
│   └── pwa/                # React PWA stub (implementar Fase 3)
└── packages/
    └── shared/             # @cautelas/shared — tipos TS compartilhados
```

---

## Schema SQLite (Desktop)

**Tabelas:** `empresa_emissora`, `usuarios`, `clientes`, `produtos`, `cautelas`, `cautela_itens`, `sync_queue`, `sequencias`

Campos comuns de controle em todas as entidades:
- `id TEXT PRIMARY KEY` — UUID v4 gerado no desktop
- `criado_em`, `atualizado_em` — Timestamps ISO
- `deletado_em` — Soft delete (nullable)
- `sync_status` — `pendente_sync | sincronizado | erro`
- `sync_at`, `criado_por`

Triggers `AFTER UPDATE` atualizam `atualizado_em` automaticamente.

Numeração de documentos via tabela `sequencias` (tipo, ano, ultimo_numero) com transação SQLite.

Formato do número: `CAU-AAAA-NNNNN` (ex: CAU-2025-00001)

---

## Dependências Chave

### Frontend (apps/desktop)
- `react` + `react-dom` ^18.3
- `react-router-dom` ^6 — usar **MemoryRouter** (não BrowserRouter — Tauri usa `tauri://`)
- `zustand` ^5 — estado global
- `react-hook-form` + `@hookform/resolvers` + `zod` — formulários
- `@tauri-apps/plugin-sql` ^2 — acesso SQLite
- `@tauri-apps/plugin-fs` ^2 — salvar PDFs
- `@tauri-apps/plugin-dialog` ^2 — seletor de arquivo nativo
- `imask` + `react-imask` — máscaras CPF/CNPJ/telefone
- `lucide-react` — ícones
- `date-fns` — formatação de datas
- `uuid` — geração de UUIDs
- **shadcn/ui** — button, input, form, table, dialog, badge, select, tabs, sonner

### Rust (src-tauri/Cargo.toml)
- `tauri` 2 + plugins (sql, fs, dialog, shell)
- `bcrypt` 0.15 — hash de senhas
- `printpdf` 0.7 — geração de PDF
- `serde` + `serde_json` — serialização
- `uuid` 1 (features: v4)
- `tokio` 1 (features: full) — async

---

## Sequência de Implementação

### Sprint 0 — Infraestrutura (~2 dias)
1. Criar arquivos raiz do monorepo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.gitignore`)
2. `pnpm create tauri-app` em `apps/desktop` (React + TypeScript + Vite)
3. Configurar Tailwind CSS + shadcn/ui
4. Configurar `MemoryRouter` + rotas placeholder
5. Criar `lib/db.ts` com `initDb()` que executa o schema SQL ao montar o app
6. Registrar `tauri-plugin-sql` no `lib.rs` com permissões no `tauri.conf.json`
7. Criar `packages/shared` com tipos TypeScript das entidades
8. Criar stubs de `apps/backend` (NestJS) e `apps/pwa` (React PWA)

**Arquivo crítico:** `tauri.conf.json` — declarar capabilities:
```json
"permissions": ["sql:allow-execute","sql:allow-load","sql:allow-select",
                 "fs:allow-read-file","fs:allow-write-file","dialog:allow-open","dialog:allow-save"]
```

### Sprint 1 — F1.3 Login (~1 dia)
- Commands Rust async: `hash_password(password)` e `verify_password(password, hash)`
  - **Usar `spawn_blocking`** — bcrypt leva ~300ms e bloquearia o thread principal
- `authStore.ts` (Zustand, sem persistência — sessão expira ao fechar)
- `LoginPage.tsx`: se 0 usuários no banco → criar primeiro Admin; senão → formulário de login
- `AuthGuard` componente para rotas protegidas

### Sprint 2 — F1.1 Empresa + F1.2 Usuários (~2 dias)
- `ConfiguracoesPage.tsx` (só Admin): formulário completo + upload de logotipo via `plugin-dialog` + `plugin-fs`
- `UsuariosPage.tsx` + `UsuarioFormPage.tsx`: CRUD com bcrypt ao criar/alterar senha
- `AppShell.tsx` com Sidebar filtrando itens por perfil

### Sprint 3 — F1.4 Clientes (~1 dia)
- `lib/validators.ts`: algoritmos CPF e CNPJ (dígitos verificadores)
- `lib/masks.ts`: máscaras IMask para CPF/CNPJ (detecção automática), telefone, CEP
- CRUD completo; `deleteProduto` retorna erro se há cautelas vinculadas (soft delete)
- `ClientesPage.tsx` + `ClienteFormPage.tsx`

### Sprint 4 — F1.5 Produtos (~1 dia)
- CRUD com select de unidade de medida
- Validação de `codigo_interno` único (verificar no banco antes de salvar)
- `ProdutosPage.tsx` + `ProdutoFormPage.tsx`

### Sprint 5 — F1.6 Cautelas + PDF (~3 dias)
- `lib/db.ts`: `proximoNumeroCautela()` usando transação SQLite
- `CautelasPage.tsx`: lista com **destaque visual amber** para `aguardando_entrega`
- `CautelaFormPage.tsx`: Combobox de cliente, lista dinâmica de itens (produto + qtd + obs), Salvar Rascunho vs Finalizar
- Command Rust `generate_pdf`: gerar PDF A4 com printpdf (coordenadas em mm, origem canto inferior esquerdo)
  - Cabeçalho: logotipo + dados empresa
  - Corpo: dados cliente, tabela de itens, área de assinatura em branco
  - Rodapé: texto configurado
- `lib/pdf.ts`: invocar command + salvar arquivo via `plugin-dialog` (choose folder) + `plugin-fs`

### Sprint 6 — F1.7 Sync Queue + Status Bar (~1 dia)
- Helper `enqueueSync()` chamado após cada CREATE/UPDATE/DELETE bem-sucedido
- `syncStore.ts` (Zustand): status, contador, última sincronização
- Command Rust `trigger_sync()`: stub que retorna `Ok(())` (implementar na Fase 3)
- `SyncStatusBar.tsx`: fixado no rodapé, indicador verde/amarelo/vermelho, polling a cada 30s

---

## Riscos Técnicos Importantes

| Risco | Mitigação |
|-------|-----------|
| MemoryRouter vs BrowserRouter | Usar `MemoryRouter` — Tauri usa protocolo `tauri://` |
| bcrypt bloqueando thread | Commands Rust devem ser `async` com `spawn_blocking` |
| Path do SQLite no Windows | Usar `app_data_dir()` do Tauri — nunca path hardcoded |
| Transações SQLite no plugin-sql | Executar `BEGIN/COMMIT` como uma única chamada `db.execute()` |
| Permissões ACL do Tauri v2 | Declarar todas as permissões no `capabilities` do `tauri.conf.json` |
| Instalador sem assinatura | SmartScreen alerta — aceitável para uso interno/familiar |
| printpdf coordenadas | Origem no canto inferior esquerdo (Y cresce para cima) |
| Primeira compilação Rust lenta | `incremental = true` no `.cargo/config.toml` |

---

## Verificação (como testar cada sprint)

- **Sprint 0:** `pnpm dev:desktop` abre janela do app; banco inicializado sem erros no console
- **Sprint 1:** Login com credenciais inválidas → erro; primeiro uso → cria Admin; login correto → redireciona para Dashboard
- **Sprint 2:** Salvar empresa emissora com logo → persistido; criar usuário Operador → não vê menu de Configurações
- **Sprint 3:** CPF inválido rejeitado; CNPJ duplicado bloqueado; cliente com cautela → não pode excluir
- **Sprint 4:** Código interno duplicado rejeitado; produto inativo não aparece na busca da cautela
- **Sprint 5:** Emitir cautela → PDF salvo em pasta escolhida; cautela `aguardando_entrega` → row destacada em amber; Rascunho → sem destaque
- **Sprint 6:** Criar cliente → sync_queue tem 1 item pendente; barra inferior mostra amarelo com contador