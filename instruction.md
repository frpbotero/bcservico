# Especificação Funcional e Técnica
## Sistema de Cautelas, Orçamentos e Recibos

**Versão:** 1.1  
**Data:** Maio de 2025  
**Status:** Rascunho para Validação

---

## Histórico de Revisões

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | Mai/2025 | Versão inicial |
| 1.1 | Mai/2025 | Cautela redefinida como documento de entrega definitiva com ateste formal; adição de destinatário individual; declaração "conferi e recebi"; PDF em duas etapas; envio por e-mail |

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Geral](#2-arquitetura-geral)
3. [Módulo 1 — Desktop Windows](#3-módulo-1--desktop-windows)
   - 3.1 Configuração da Empresa Emissora
   - 3.2 Gestão de Usuários e Perfis
   - 3.3 Cadastro de Clientes
   - 3.4 Cadastro de Produtos
   - 3.5 Cautela
   - 3.6 Orçamento
   - 3.7 Recibo de Venda
   - 3.8 Tabela de Preços
   - 3.9 Sincronização com o Backend
4. [Módulo 2 — Backend Web (API REST)](#4-módulo-2--backend-web-api-rest)
5. [Módulo 3 — PWA Mobile (Assinatura)](#5-módulo-3--pwa-mobile-assinatura)
6. [Fluxos de Negócio](#6-fluxos-de-negócio)
7. [Geração de PDF — Padrão de Layout](#7-geração-de-pdf--padrão-de-layout)
8. [Backlog Priorizado — MVP](#8-backlog-priorizado--mvp)
9. [Riscos e Mitigações](#9-riscos-e-mitigações)
10. [Glossário](#10-glossário)

---

## 1. Visão Geral do Sistema

O sistema é uma plataforma de gestão operacional voltada para empresas que precisam:

- Emitir e registrar formalmente entregas de materiais com ateste do recebedor (**Cautelas**)
- Emitir propostas comerciais formais para clientes (**Orçamentos**)
- Registrar e formalizar a conclusão de vendas (**Recibos de Venda**)
- Publicar a lista de preços de seus produtos (**Tabela de Preços**)

O sistema é composto por **três módulos integrados** com responsabilidades distintas e complementares:

| Módulo | Plataforma | Função principal |
|--------|------------|-----------------|
| Desktop | Windows (app instalado) | Cadastros, emissão de documentos, administração, envio de e-mail |
| Backend | Web (API REST) | Espelho dos dados, autenticação central, integração entre módulos |
| PWA | Mobile (navegador) | Coleta de assinatura digital e ateste nas cautelas de entrega |

---

## 2. Arquitetura Geral

```
┌─────────────────────────────────────────────────────────┐
│                  DESKTOP (Windows)                      │
│                                                         │
│  ┌────────────┐  ┌───────────┐  ┌────────────────────┐  │
│  │ Cadastros  │  │Documentos │  │ Usuários / Config  │  │
│  └────────────┘  └───────────┘  └────────────────────┘  │
│                                                         │
│           Banco local: SQLite (fonte da verdade)        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │  Sincronização assíncrona (API REST / HTTPS)
                       │  Push: Desktop → Backend
                       │  Pull: Backend → Desktop (assinaturas)
                       ▼
┌─────────────────────────────────────────────────────────┐
│               BACKEND WEB (API REST)                    │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Autenticação │  │  Sincronismo │  │  Assinaturas  │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│           Banco espelho: PostgreSQL                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │  Acesso via HTTPS (autenticado)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  PWA MOBILE                             │
│                                                         │
│  ┌───────────────────┐  ┌───────────────────────────┐   │
│  │ Lista de Cautelas │  │  Coleta de Assinatura     │   │
│  └───────────────────┘  └───────────────────────────┘   │
│                                                         │
│           Sem banco local — depende de conexão          │
└─────────────────────────────────────────────────────────┘
```

### Premissas de Arquitetura

- O **Desktop é a fonte da verdade**. Toda criação e edição de dados nasce no desktop.
- O **backend é um espelho** — recebe dados do desktop e serve o PWA. Nunca origina dados.
- O **PWA é somente leitura + coleta de assinatura** — não cria cadastros nem documentos.
- O desktop opera **100% offline**. A ausência de conexão não bloqueia nenhuma operação.
- A sincronização acontece **em background**, sem interromper o uso do sistema.

---

## 3. Módulo 1 — Desktop Windows

### 3.1 Configuração da Empresa Emissora

Acessível apenas para o perfil **Administrador**, na tela de Configurações.

Esses dados são usados automaticamente no cabeçalho e rodapé de todos os documentos gerados.

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| Razão Social | Texto | Obrigatório |
| Nome Fantasia | Texto | Opcional |
| CNPJ | Texto (máscara + validação) | Obrigatório |
| Endereço completo | Texto | Obrigatório |
| Telefone(s) | Texto | Opcional |
| E-mail | Texto | Obrigatório (usado para envio de PDFs) |
| Logotipo | Upload PNG/JPG (máx. 2MB) | Opcional |
| Texto de rodapé dos documentos | Texto longo | Opcional |
| Configuração de e-mail (SMTP) | Host, porta, usuário, senha | Obrigatório para envio de e-mail |

**Regras:**
- Apenas um registro de empresa emissora por instalação.
- O logotipo é redimensionado automaticamente para o cabeçalho do PDF.
- Alterações na empresa emissora afetam apenas documentos emitidos **após** a alteração.
- As credenciais SMTP são armazenadas localmente de forma segura (criptografadas no SQLite).

---

### 3.2 Gestão de Usuários e Perfis

#### Perfis de Acesso

| Perfil | Descrição |
|--------|-----------|
| **Administrador** | Acesso total: cadastros, documentos, usuários, configurações e sincronização |
| **Operador** | Cria e emite documentos (cautela, orçamento, recibo). Não acessa configurações nem gerencia usuários |
| **Consulta** | Visualiza documentos e cadastros. Sem permissão de criação, edição ou exclusão |

#### Campos do Usuário

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| Nome completo | Texto | Obrigatório |
| Login (nome de usuário) | Texto único | Obrigatório |
| Senha | Hash (bcrypt) | Obrigatório |
| Perfil | Seleção (Admin / Operador / Consulta) | Obrigatório |
| Status | Ativo / Inativo | Obrigatório |
| E-mail | Texto | Opcional |

**Regras:**
- Login deve ser único no sistema.
- Senha nunca armazenada em texto puro — sempre como hash bcrypt.
- Usuário inativo não consegue logar, mas seu histórico é preservado.
- O primeiro usuário cadastrado na instalação é automaticamente Administrador.
- Toda ação no sistema registra o usuário responsável (log de auditoria).

---

### 3.3 Cadastro de Clientes

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| Razão Social / Nome | Texto | Obrigatório |
| CNPJ / CPF | Texto (máscara + validação) | Obrigatório |
| Endereço | Texto (logradouro, nº, bairro, cidade, UF, CEP) | Obrigatório |
| Telefone(s) | Texto | Opcional |
| E-mail | Texto | Opcional |
| Nome do contato responsável | Texto | Opcional |
| Observações | Texto longo | Opcional |
| Status | Ativo / Inativo | Obrigatório |

**Regras:**
- CNPJ/CPF deve ser único no sistema.
- Cliente inativo não aparece nas buscas ao emitir documentos.
- Cliente não pode ser excluído se houver documentos vinculados — apenas inativado.

---

### 3.4 Cadastro de Produtos

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| Nome | Texto | Obrigatório |
| Código interno | Texto único | Recomendado |
| Descrição | Texto longo | Opcional |
| Unidade de medida | Seleção (Un, Kg, m², L, m, cx, etc.) | Obrigatório |
| Preço de referência | Numérico (R$) | Recomendado |
| Status | Ativo / Inativo | Obrigatório |

**Regras:**
- Produto inativo não aparece nas buscas ao emitir documentos.
- Produto não pode ser excluído se houver documentos vinculados — apenas inativado.
- O preço de referência é sugerido automaticamente ao adicionar o produto em orçamentos e recibos, mas pode ser editado no momento da emissão.

---

### 3.5 Cautela

#### Descrição

A Cautela é o **documento formal de entrega definitiva de materiais** (ex: crachás, cordões, uniformes, kits) para uma empresa cliente. Funciona como comprovante de entrega com ateste legal do recebedor, registrando quem recebeu, o que foi recebido, em que quantidade e quando.

A entrega é **definitiva** — não há devolução prevista. O documento encerra o ciclo após a coleta da assinatura.

O documento possui **duas etapas de existência**:

| Etapa | Descrição | PDF disponível |
|-------|-----------|---------------|
| **Emissão** | Cautela criada no desktop, pronta para entrega | PDF parcial (sem assinatura) |
| **Ateste** | Assinatura coletada pelo PWA pelo recebedor | PDF final (com declaração + assinatura) |

#### Campos do Documento

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| Número da cautela | Auto (sequencial: CAU-AAAA-NNNNN) | Automático |
| Data de emissão | Data | Obrigatório (default: hoje) |
| Empresa / Cliente | Busca vinculada | Obrigatório |
| CNPJ do cliente | Texto | Preenchido automaticamente |
| Endereço do cliente | Texto | Preenchido automaticamente |
| Nome do destinatário | Texto | Obrigatório — pessoa física que vai receber |
| Cargo / função do destinatário | Texto | Opcional |
| Usuário emissor | Referência | Preenchido automaticamente |
| Itens (lista) | — | Mínimo 1 item obrigatório |
| → Produto | Busca vinculada | Obrigatório por item |
| → Quantidade | Numérico | Obrigatório por item |
| → Observação do item | Texto | Opcional por item |
| Observação geral | Texto longo | Opcional |
| Status | Ver estados abaixo | Automático |

#### Estados da Cautela

```
Rascunho
    └─→ Aguardando Entrega   (cautela finalizada, pronta para entrega física)
             └─→ Entregue / Assinada   (assinatura e ateste coletados pelo PWA — ENCERRADA)
```

> A cautela **não possui estado de devolução**. A entrega é definitiva e o ciclo encerra com o ateste.

#### Declaração "Conferi e Recebi"

O PDF final (após assinatura) deve incluir um bloco de declaração formal antes da assinatura:

> *"Declaro que recebi os materiais descritos neste documento em perfeitas condições, conferindo as quantidades e especificações acima relacionadas."*

Esse texto é fixo no layout do documento. Abaixo dele aparecem: nome do assinante, cargo, data/hora da coleta e a imagem da assinatura digital.

#### Envio por E-mail (PDF Final)

Após a assinatura ser sincronizada ao desktop, o usuário pode enviar o PDF final diretamente pelo sistema:

| Campo | Comportamento |
|-------|--------------|
| Destinatário | Preenchido automaticamente com o e-mail do cliente (editável) |
| Assunto | Preenchido automaticamente: "Cautela de Entrega Nº CAU-AAAA-NNNNN" (editável) |
| Corpo do e-mail | Texto padrão configurável nas configurações (editável antes de enviar) |
| Anexo | PDF final da cautela com assinatura incorporada |

**Regras:**
- O envio por e-mail só está disponível para cautelas com status **"Entregue / Assinada"**.
- O sistema registra data, hora e usuário que realizou o envio.
- O envio utiliza as configurações SMTP definidas na empresa emissora.

#### Regras Gerais da Cautela

- Uma cautela pode conter **múltiplos produtos**.
- Apenas cautelas com status **"Aguardando Entrega"** aparecem no PWA.
- Cautelas "Aguardando Entrega" devem ter destaque visual na listagem do desktop.
- A numeração sequencial não pode ser editada manualmente.
- Cautelas finalizadas (Entregue/Assinada) não podem ser editadas — apenas canceladas com registro do motivo.

---

### 3.6 Orçamento

#### Descrição
Proposta comercial formal enviada ao cliente, com itens, valores, prazo de entrega, condições de pagamento e validade.

#### Campos do Documento

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| Número do orçamento | Auto (sequencial: ORC-AAAA-NNNNN) | Automático |
| Data de emissão | Data | Obrigatório (default: hoje) |
| Validade do orçamento | Data | Obrigatório |
| Cliente | Busca vinculada | Obrigatório |
| Usuário emissor | Referência | Automático |
| Itens (lista) | — | Mínimo 1 item obrigatório |
| → Produto | Busca vinculada | Obrigatório por item |
| → Quantidade | Numérico | Obrigatório por item |
| → Valor unitário | Numérico (R$) | Obrigatório por item |
| → Desconto por item | Numérico (% ou R$) | Opcional |
| → Subtotal do item | Calculado | Automático |
| Desconto geral | Numérico (% ou R$) | Opcional |
| Total geral | Calculado | Automático |
| Prazo de entrega | Texto livre | Opcional (ex: "15 dias úteis") |
| Condições de pagamento | Texto livre | Opcional (ex: "50% entrada + 50% na entrega") |
| Observações | Texto longo | Opcional |
| Status | Ver estados abaixo | Controlado pelo usuário |

#### Estados do Orçamento

```
Rascunho
    └─→ Enviado         (proposta enviada ao cliente)
             ├─→ Aprovado       (cliente aceitou)
             │        └─→ Convertido em Recibo   (opcional)
             ├─→ Recusado       (cliente não aceitou)
             └─→ Expirado       (data de validade ultrapassada — automático)
```

**Regras:**
- O total geral é **recalculado automaticamente** ao adicionar, editar ou remover itens.
- Orçamentos com validade vencida são sinalizados automaticamente como **Expirado**.
- Um orçamento **Aprovado** pode ser convertido em Recibo de Venda com pré-preenchimento automático.

---

### 3.7 Recibo de Venda

#### Descrição
Documento que formaliza a conclusão de uma venda. Pode ser criado manualmente ou gerado a partir de um Orçamento aprovado.

#### Campos do Documento

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| Número do recibo | Auto (sequencial: REC-AAAA-NNNNN) | Automático |
| Data | Data | Obrigatório (default: hoje) |
| Origem | Manual / Convertido do Orçamento Nº | Rastreabilidade |
| Cliente | Busca vinculada | Obrigatório |
| Usuário emissor | Referência | Automático |
| Itens (lista) | — | Mínimo 1 item obrigatório |
| → Produto | Busca vinculada | Obrigatório por item |
| → Quantidade | Numérico | Obrigatório por item |
| → Valor unitário | Numérico (R$) | Obrigatório por item |
| → Valor total do item | Calculado | Automático |
| Total geral | Calculado | Automático |
| Valor por extenso | Texto gerado | Automático |
| Forma de pagamento | Seleção | Obrigatório |
| Observações | Texto | Opcional |

#### Formas de Pagamento (seleção)
- Dinheiro
- PIX
- Cartão de Débito
- Cartão de Crédito
- Boleto Bancário
- Transferência Bancária
- Outro (campo texto livre)

**Regras:**
- Valor por extenso é gerado automaticamente a partir do total geral.
- Recibo **não pode ser editado** após emissão. Para correção: cancelar e emitir novo.
- Recibo cancelado mantém registro no histórico com indicação de cancelamento.
- Recibo gerado a partir de orçamento mantém referência ao número do orçamento de origem.

---

### 3.8 Tabela de Preços

#### Descrição
Visão consolidada de todos os produtos ativos com seus preços, exportável em PDF para uso comercial.

#### Funcionalidades

| Funcionalidade | Descrição |
|----------------|-----------|
| Listagem | Exibe todos os produtos com status Ativo |
| Filtro | Por nome ou código do produto |
| Edição rápida | Permite atualizar o preço diretamente na tabela |
| Exportar PDF | Gera PDF formatado com data de referência e dados da empresa emissora |
| Impressão | Layout A4 otimizado para impressão direta |

#### Campos exibidos na tabela

| Coluna | Descrição |
|--------|-----------|
| Código | Código interno do produto |
| Nome | Nome do produto |
| Descrição | Resumo da descrição |
| Unidade | Unidade de medida |
| Preço | Preço de referência atual |

---

### 3.9 Sincronização Desktop → Backend

#### Estratégia

A sincronização é **assíncrona e em background**, sem bloquear o uso do sistema. O desktop opera normalmente offline e as alterações são enviadas ao backend quando a conexão estiver disponível.

#### Fluxo de Sincronização

```
Ação local (criar / editar / finalizar cautela)
     ↓
Salva no SQLite com status: "pendente_sync"
     ↓
Worker em background tenta enviar ao backend via API REST
     ↓
  ┌─────────────────────────────────────────┐
  │ Sucesso                │ Falha          │
  │ Marca: "sincronizado"  │ Mantém:        │
  │ Registra timestamp     │ "pendente_sync"│
  │                        │ Tentativa em   │
  │                        │ X minutos      │
  └─────────────────────────────────────────┘
```

#### Indicador Visual de Status

O desktop deve exibir permanentemente o status de sincronização na barra inferior da aplicação:

| Status | Indicador |
|--------|-----------|
| Sincronizado | Ícone verde — "Sincronizado em HH:MM" |
| Pendente | Ícone amarelo — "X itens aguardando sincronização" |
| Erro de conexão | Ícone vermelho — "Sem conexão — trabalhando offline" |

#### Regras de Sincronização

- Conflitos priorizam sempre a versão do desktop (fonte da verdade).
- Cada entidade possui UUID gerado no desktop para garantir unicidade sem depender do servidor.
- Soft delete: exclusões não apagam fisicamente os registros — apenas marcam `deletado_em`.
- Assinaturas coletadas pelo PWA são recebidas do backend via **pull** e aplicadas às cautelas locais.
- Backup automático do SQLite deve ser realizado antes de cada ciclo de sincronização.

#### Campos de Controle de Sincronização (por entidade)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Gerado no desktop |
| `criado_em` | Timestamp | Data/hora de criação |
| `atualizado_em` | Timestamp | Data/hora da última alteração |
| `deletado_em` | Timestamp (nullable) | Soft delete |
| `sync_status` | Enum | pendente_sync / sincronizado / erro |
| `sync_at` | Timestamp | Data/hora da última sincronização bem-sucedida |
| `criado_por` | UUID (usuário) | Usuário responsável pela ação |

---

## 4. Módulo 2 — Backend Web (API REST)

### 4.1 Responsabilidades

- Receber e armazenar o espelho dos dados enviados pelo desktop
- Servir dados ao PWA mobile (leitura de cautelas pendentes de assinatura)
- Receber assinaturas digitais e ateste do PWA e associá-los às cautelas
- Notificar o desktop (via pull) quando uma assinatura for coletada
- Gerenciar autenticação centralizada via tokens JWT

### 4.2 Principais Endpoints

| Método | Rota | Acesso | Descrição |
|--------|------|--------|-----------|
| `POST` | `/auth/login` | Público | Autenticação — retorna JWT |
| `POST` | `/auth/logout` | Autenticado | Invalida token |
| `POST` | `/sync/push` | Desktop | Envia lote de alterações do desktop |
| `GET` | `/sync/pull` | Desktop | Busca novidades (assinaturas coletadas) |
| `GET` | `/cautelas/pendentes` | PWA | Lista cautelas com status "Aguardando Entrega" |
| `GET` | `/cautelas/:id` | PWA | Detalhe completo de uma cautela |
| `POST` | `/cautelas/:id/assinatura` | PWA | Envia assinatura + dados do ateste |
| `GET` | `/health` | Público | Verificação de disponibilidade da API |

### 4.3 Autenticação

- Autenticação via **JWT (JSON Web Token)**
- Token expira em 8 horas (configurável)
- Refresh token com validade de 30 dias
- O mesmo cadastro de usuários do desktop é utilizado — sincronizado via `/sync/push`

### 4.4 Banco de Dados (Backend)

- **PostgreSQL** como banco principal do backend
- Estrutura espelho das entidades do desktop
- Não é banco de origem — nunca aceita criação direta de entidades via API (exceto assinaturas)

---

## 5. Módulo 3 — PWA Mobile (Assinatura)

### 5.1 Responsabilidades

- Ser utilizado pelo entregador durante a entrega física dos materiais
- Exibir os dados completos da cautela (empresa, destinatário, itens) de forma clara
- Exibir a declaração formal "Conferi e Recebi" para ciência do recebedor
- Capturar a assinatura digital do recebedor via tela touch
- Enviar a assinatura e o ateste ao backend
- Confirmar a entrega visualmente ao operador

### 5.2 Requisitos Técnicos

- Funciona em qualquer smartphone moderno via navegador (Chrome, Safari)
- Não requer instalação de aplicativo
- Requer conexão de dados ativa (3G/4G/Wi-Fi) — não opera offline
- Layout responsivo otimizado para telas de 360px a 430px (smartphones)
- Suporte a entrada de assinatura via touch (canvas HTML5)

### 5.3 Telas do PWA

| Tela | Conteúdo |
|------|----------|
| **Login** | Campo de usuário e senha |
| **Lista de Cautelas** | Cautelas com status "Aguardando Entrega". Busca por número ou nome da empresa |
| **Detalhe da Cautela** | Empresa, CNPJ, endereço, nome do destinatário, data, lista de itens, observações |
| **Ateste e Assinatura** | Declaração "Conferi e Recebi" + campo de nome do assinante + cargo + canvas para assinatura touch |
| **Confirmação** | Feedback de sucesso (assinatura enviada) ou erro (orientação para tentar novamente) |

### 5.4 Fluxo de Uso do PWA

```
[Entregador abre o PWA no smartphone]
     ↓
[Login com credencial de Operador ou Administrador]
     ↓
[Visualiza lista de cautelas "Aguardando Entrega"]
     ↓
[Seleciona a cautela referente à entrega em andamento]
     ↓
[Confere os dados: empresa, destinatário, itens, quantidades]
     ↓
[Tela de ateste exibe a declaração "Conferi e Recebi"]
     ↓
[Recebedor preenche nome e cargo (opcional)]
     ↓
[Recebedor assina na tela com o dedo]
     ↓
[Confirmação e envio ao backend]
     ↓
[Tela: "Assinatura registrada com sucesso"]
     ↓
[Backend atualiza status da cautela para "Entregue / Assinada"]
     ↓
[Desktop recebe a atualização na próxima sincronização (pull)]
     ↓
[PDF final da cautela passa a incluir declaração + assinatura digital]
     ↓
[Desktop permite envio do PDF final por e-mail ao cliente]
```

### 5.5 Dados do Ateste Coletado

| Campo | Tipo | Obrigatoriedade |
|-------|------|----------------|
| Assinatura | Imagem PNG (base64, gerada do canvas) | Obrigatório |
| Nome do assinante | Texto | Obrigatório |
| Cargo / função | Texto | Opcional |
| Texto da declaração exibida | Texto fixo (salvo junto ao ateste para auditoria) | Automático |
| Data e hora da coleta | Timestamp automático (servidor) | Automático |
| Geolocalização | Lat/Long | Opcional (solicita permissão ao dispositivo) |
| ID do operador que coletou | Referência ao usuário logado | Automático |

---

## 6. Fluxos de Negócio

### 6.1 Fluxo Completo — Cautela (Entrega com Ateste)

```
[Desktop] Criar cautela com destinatário → Status: Rascunho
     ↓
[Desktop] Finalizar cautela → Status: Aguardando Entrega
     ↓
[Desktop] PDF parcial disponível (sem assinatura) para conferência interna
     ↓
[Desktop → Backend] Sincronização da cautela
     ↓
[PWA] Entregador visualiza a cautela na lista
     ↓
[PWA] Entregador apresenta o dispositivo ao recebedor
     ↓
[PWA] Recebedor lê a declaração "Conferi e Recebi", preenche nome e assina
     ↓
[PWA → Backend] Envio da assinatura + ateste → Status: Entregue / Assinada
     ↓
[Backend → Desktop] Desktop recebe assinatura via pull de sincronização
     ↓
[Desktop] Cautela encerrada com assinatura, nome, cargo e carimbo de data/hora
     ↓
[Desktop] PDF final disponível com declaração + assinatura incorporada
     ↓
[Desktop] Usuário envia PDF final por e-mail ao cliente (opcional)
```

### 6.2 Fluxo Completo — Orçamento

```
[Desktop] Criar orçamento → Status: Rascunho
     ↓
[Desktop] Finalizar → Status: Enviado
     ↓
[Desktop] Cliente aprova → Status: Aprovado
     ↓
[Desktop] Opção: Converter em Recibo de Venda (pré-preenchimento automático)
     ↓
[Desktop] Gerar PDF do orçamento para envio ao cliente
```

### 6.3 Fluxo Completo — Recibo de Venda

```
[Desktop] Criar recibo manualmente OU converter de orçamento aprovado
     ↓
[Desktop] Preencher / confirmar itens, valores e forma de pagamento
     ↓
[Desktop] Emitir recibo → Status: Emitido
     ↓
[Desktop] PDF gerado com valor por extenso e dados completos
     ↓
[Desktop] Recibo sincronizado com backend
```

---

## 7. Geração de PDF — Padrão de Layout

Todos os documentos seguem o mesmo padrão de layout, garantindo identidade visual consistente.

### Layout Geral (todos os documentos)

```
┌──────────────────────────────────────────────────┐
│  [LOGO]      RAZÃO SOCIAL DA EMPRESA EMISSORA    │
│              CNPJ: XX.XXX.XXX/XXXX-XX            │
│              Endereço | Telefone | E-mail         │
├──────────────────────────────────────────────────┤
│  CAUTELA / ORÇAMENTO / RECIBO       Nº: XXX-0001 │
│  Data de emissão: XX/XX/XXXX                     │
├──────────────────────────────────────────────────┤
│  DADOS DO CLIENTE                                │
│  Empresa: ...  CNPJ: ...  Endereço: ...          │
│  Destinatário: ...  Cargo: ...   (só Cautela)    │
├──────────────────────────────────────────────────┤
│  ITENS                                           │
│  ┌────────────────┬──────┬──────────┬──────────┐ │
│  │ Produto        │ Qtd  │ Vl. Unit │ Subtotal │ │
│  ├────────────────┼──────┼──────────┼──────────┤ │
│  │ ...            │ ...  │ ...      │ ...      │ │
│  └────────────────┴──────┴──────────┴──────────┘ │
├──────────────────────────────────────────────────┤
│  TOTAL GERAL: R$ X.XXX,XX   (Orçamento, Recibo)  │
│  VALOR POR EXTENSO: ...     (somente Recibo)     │
├──────────────────────────────────────────────────┤
│  *** BLOCO EXCLUSIVO DA CAUTELA (após assinatura)│
│                                                  │
│  "Declaro que recebi os materiais descritos      │
│  neste documento em perfeitas condições,         │
│  conferindo as quantidades e especificações       │
│  acima relacionadas."                            │
│                                                  │
│  Nome: ______________________________            │
│  Cargo: _____________________________            │
│                                                  │
│  [imagem da assinatura digital]                  │
│                                                  │
│  Data/hora do ateste: XX/XX/XXXX HH:MM           │
├──────────────────────────────────────────────────┤
│  Observações: ...                                │
├──────────────────────────────────────────────────┤
│  [texto de rodapé configurado pela empresa]      │
└──────────────────────────────────────────────────┘
```

### PDFs da Cautela — Dois Momentos

| Momento | Conteúdo | Quando disponível |
|---------|----------|------------------|
| **PDF Parcial** | Cabeçalho + dados do cliente + destinatário + itens + campo de assinatura em branco | Após finalizar a cautela no desktop |
| **PDF Final** | Tudo acima + declaração "Conferi e Recebi" + nome + cargo + imagem da assinatura + data/hora | Após sincronização da assinatura coletada pelo PWA |

---

## 8. Backlog Priorizado — MVP

### 🔴 Fase 1 — Fundação (Desktop)

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F1.1 | Configuração da empresa emissora | Logo, CNPJ, endereço, rodapé, SMTP |
| F1.2 | Gestão de usuários e perfis | Admin, Operador, Consulta |
| F1.3 | Login com autenticação local | Senha com hash, sessão |
| F1.4 | Cadastro de clientes | CRUD completo |
| F1.5 | Cadastro de produtos | CRUD completo com preço de referência |
| F1.6 | Emissão de cautela com destinatário | Múltiplos itens, PDF parcial |
| F1.7 | Sincronização básica Desktop → Backend | Usuários, clientes, produtos, cautelas |

### 🟡 Fase 2 — Comercial (Desktop)

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F2.1 | Emissão de orçamento | Múltiplos itens, desconto, PDF |
| F2.2 | Controle de status do orçamento | Rascunho → Enviado → Aprovado / Recusado / Expirado |
| F2.3 | Emissão de recibo de venda | Valor por extenso, PDF |
| F2.4 | Conversão de orçamento em recibo | Pré-preenchimento automático |
| F2.5 | Tabela de preços | Listagem e exportação em PDF |

### 🟢 Fase 3 — Assinatura Digital (Backend + PWA)

| ID | Funcionalidade | Descrição |
|----|---------------|-----------|
| F3.1 | Backend: autenticação JWT | Login centralizado |
| F3.2 | Backend: recebimento de sincronização | Endpoint `/sync/push` |
| F3.3 | Backend: cautelas pendentes | Endpoint `/cautelas/pendentes` |
| F3.4 | Backend: recebimento de assinatura e ateste | Endpoint `/cautelas/:id/assinatura` |
| F3.5 | Desktop: pull de assinaturas | Receber e aplicar assinaturas coletadas |
| F3.6 | PWA: login + lista de cautelas | Tela inicial do mobile |
| F3.7 | PWA: detalhe da cautela | Visualização completa com destinatário |
| F3.8 | PWA: tela de ateste | Declaração "Conferi e Recebi" + nome + cargo |
| F3.9 | PWA: coleta de assinatura touch | Canvas touch + envio ao backend |
| F3.10 | PDF final com assinatura incorporada | Cautela encerrada com ateste completo |
| F3.11 | Desktop: envio do PDF final por e-mail | Envio via SMTP configurado |

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Desktop offline por longos períodos | Média | Médio | Fila de sincronização com retry automático e log de erros visível ao usuário |
| Dois usuários editando o mesmo documento simultaneamente | Baixa | Alto | Lock otimista: bloquear edição de documento já aberto por outro usuário |
| Assinatura coletada com falha de rede no PWA | Média | Médio | Retry automático no PWA ao recuperar conexão antes de fechar a tela |
| Perda do banco SQLite local | Baixa | Alto | Backup automático do SQLite antes de cada ciclo de sincronização |
| Tamanho da imagem de assinatura impactar a sincronização | Baixa | Baixo | Comprimir imagem PNG para máximo de 100KB antes de enviar |
| Validade jurídica da assinatura digital | Alta (relevância) | Médio | Documentar que a assinatura é de caráter operacional, sem valor de certificado ICP-Brasil |
| Token JWT expirado durante uso do PWA em campo | Média | Baixo | Exibir mensagem clara e redirecionar para login sem perder a assinatura já digitada |
| Falha no envio de e-mail por configuração SMTP incorreta | Média | Baixo | Validar configuração SMTP nas configurações antes de salvar; exibir log de erros de envio |

---

## 10. Glossário

| Termo | Definição |
|-------|-----------|
| **Cautela** | Documento formal de entrega definitiva de materiais (ex: crachás, cordões, uniformes) para uma empresa ou destinatário específico. Funciona como comprovante de entrega com ateste do recebedor. |
| **Ateste** | Declaração formal do recebedor de que conferiu e recebeu os materiais listados na cautela, registrada com assinatura digital, nome, cargo e data/hora. |
| **Destinatário** | Pessoa física que recebe fisicamente os materiais da cautela. Registrado pelo nome e cargo. |
| **PDF Parcial** | Versão do PDF da cautela gerada antes da assinatura. Contém todos os dados da entrega, mas sem assinatura e sem a declaração de ateste preenchida. |
| **PDF Final** | Versão do PDF da cautela gerada após a coleta da assinatura. Contém a declaração "Conferi e Recebi" preenchida, imagem da assinatura e carimbo de data/hora. |
| **Orçamento** | Proposta comercial com validade, itens, valores e condições de pagamento. |
| **Recibo de Venda** | Documento que formaliza a conclusão de uma venda, com valor total e valor por extenso. |
| **Tabela de Preços** | Lista consolidada de produtos ativos com preços de referência, exportável em PDF. |
| **Empresa Emissora** | Empresa proprietária do sistema, cujos dados aparecem no cabeçalho de todos os documentos gerados. |
| **Soft Delete** | Estratégia de exclusão onde o registro não é fisicamente removido do banco, apenas marcado com a data de exclusão. Garante rastreabilidade. |
| **UUID** | Identificador único universal gerado no desktop para cada entidade, garantindo unicidade sem depender do servidor. |
| **JWT** | JSON Web Token — padrão de autenticação seguro baseado em token, usado para comunicação entre desktop/PWA e backend. |
| **PWA** | Progressive Web App — aplicação web que funciona como aplicativo no smartphone, acessada pelo navegador sem necessidade de instalação. |
| **Sincronização Pull** | Operação onde o desktop consulta o backend buscando novidades (ex: assinaturas coletadas). |
| **Sincronização Push** | Operação onde o desktop envia alterações locais ao backend. |
| **Lock Otimista** | Mecanismo que impede dois usuários de editarem o mesmo registro simultaneamente. |
| **SMTP** | Protocolo de envio de e-mails. Configurado na empresa emissora para permitir o envio de PDFs por e-mail diretamente pelo sistema. |

---

*Documento gerado em Maio de 2025 — versão 1.1 para validação interna.*