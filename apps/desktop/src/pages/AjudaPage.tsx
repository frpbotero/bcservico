import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronDown,
  Building2,
  Package,
  Users,
  ClipboardList,
  Receipt,
  FileBarChart2,
  RefreshCw,
  UserCog,
  HelpCircle,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { setAppConfig } from "@/lib/db";

interface Secao {
  id: string;
  icone: React.ReactNode;
  titulo: string;
  conteudo: React.ReactNode;
}

function Topico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-sm font-medium text-slate-700 mb-1.5">{titulo}</p>
      <div className="text-sm text-slate-600 leading-relaxed space-y-1.5">{children}</div>
    </div>
  );
}

function Dica({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 mt-1">
      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export default function AjudaPage() {
  const navigate = useNavigate();
  const { usuario } = useAuthStore();
  const [aberto, setAberto] = useState<string | null>("empresa");

  function toggle(id: string) {
    setAberto((prev) => (prev === id ? null : id));
  }

  async function reiniciarOnboarding() {
    await setAppConfig("onboarding_completo", "0");
    navigate("/onboarding");
  }

  const secoes: Secao[] = [
    {
      id: "empresa",
      icone: <Building2 className="w-4 h-4 text-blue-500" />,
      titulo: "Empresa Emissora",
      conteudo: (
        <>
          <Topico titulo="O que é?">
            <p>
              A empresa emissora é a organização responsável pelos documentos gerados pelo sistema.
              Suas informações aparecem no cabeçalho de todas as Cautelas e Recibos.
            </p>
          </Topico>
          <Topico titulo="Como configurar">
            <Dica>Acesse Menu lateral → Configurações → aba Empresa</Dica>
            <Dica>Preencha razão social, CNPJ e endereço (obrigatórios para emissão)</Dica>
            <Dica>O logotipo deve ser PNG ou JPG — é redimensionado automaticamente</Dica>
            <Dica>O texto de rodapé aparece na parte inferior dos documentos (opcional)</Dica>
          </Topico>
          <Topico titulo="Importante">
            <p>
              Sem a empresa emissora configurada, as Cautelas e Recibos serão gerados sem
              identificação da empresa. Configure antes de emitir o primeiro documento.
            </p>
          </Topico>
        </>
      ),
    },
    {
      id: "produtos",
      icone: <Package className="w-4 h-4 text-orange-500" />,
      titulo: "Produtos",
      conteudo: (
        <>
          <Topico titulo="O que são?">
            <p>
              Produtos são os itens, equipamentos ou materiais que serão controlados pelo sistema —
              seja em Cautelas (empréstimo) ou Recibos (venda/serviço).
            </p>
          </Topico>
          <Topico titulo="Campos disponíveis">
            <Dica>
              <strong>Nome</strong> — identificação principal, aparece nos documentos
            </Dica>
            <Dica>
              <strong>Código Interno</strong> — código da empresa para busca rápida (opcional)
            </Dica>
            <Dica>
              <strong>Unidade de Medida</strong> — Un, Kg, L, m, m², caixa, etc.
            </Dica>
            <Dica>
              <strong>Preço de Referência</strong> — preço padrão sugerido nos Recibos (opcional)
            </Dica>
          </Topico>
          <Topico titulo="Status ativo / inativo">
            <p>
              Produtos inativos não aparecem na seleção ao criar novos documentos, mas mantêm o
              histórico de todos os lançamentos anteriores.
            </p>
          </Topico>
        </>
      ),
    },
    {
      id: "clientes",
      icone: <Users className="w-4 h-4 text-green-500" />,
      titulo: "Clientes",
      conteudo: (
        <>
          <Topico titulo="O que são?">
            <p>
              Clientes são os destinatários das Cautelas (quem recebe os equipamentos) e dos Recibos
              (quem realiza o pagamento). Podem ser pessoas físicas (CPF) ou jurídicas (CNPJ).
            </p>
          </Topico>
          <Topico titulo="Cadastro">
            <Dica>CNPJ/CPF é obrigatório e único — não podem existir dois clientes com o mesmo</Dica>
            <Dica>Pessoa física: CPF com 11 dígitos (sem pontuação)</Dica>
            <Dica>Pessoa jurídica: CNPJ com 14 dígitos (sem pontuação)</Dica>
            <Dica>Nome do Contato identifica a pessoa responsável na empresa</Dica>
          </Topico>
          <Topico titulo="Exclusão">
            <p>
              Clientes vinculados a Cautelas ou Recibos não podem ser excluídos — apenas inativados.
              Clientes inativos não aparecem na seleção de novos documentos.
            </p>
          </Topico>
        </>
      ),
    },
    {
      id: "cautelas",
      icone: <ClipboardList className="w-4 h-4 text-purple-500" />,
      titulo: "Cautelas",
      conteudo: (
        <>
          <Topico titulo="O que é uma Cautela?">
            <p>
              Uma Cautela é o documento que registra a cessão temporária de bens: quais itens foram
              entregues, para qual cliente e destinatário, em que data, e com a assinatura de quem
              recebeu.
            </p>
          </Topico>
          <Topico titulo="Fluxo de status">
            <Dica>
              <strong>Rascunho</strong> — cautela criada, ainda pode ser editada
            </Dica>
            <Dica>
              <strong>Aguardando Entrega</strong> — finalizada, aguardando entrega física dos itens
            </Dica>
            <Dica>
              <strong>Entregue c/ Assinatura</strong> — itens entregues e assinatura coletada
            </Dica>
            <Dica>
              <strong>Devolução Parcial</strong> — parte dos itens foi devolvida
            </Dica>
            <Dica>
              <strong>Encerrada</strong> — processo concluído
            </Dica>
          </Topico>
          <Topico titulo="Assinatura digital">
            <p>
              Após marcar como "Aguardando Entrega", clique em "Coletar Assinatura" para registrar
              a assinatura digital do destinatário diretamente na tela (com mouse ou tela tátil).
            </p>
          </Topico>
          <Topico titulo="Impressão">
            <p>
              O botão PDF gera o documento completo da cautela, incluindo cabeçalho com dados da
              empresa, lista de itens, dados do destinatário e campo de assinatura.
            </p>
          </Topico>
        </>
      ),
    },
    {
      id: "recibos",
      icone: <Receipt className="w-4 h-4 text-teal-500" />,
      titulo: "Recibos",
      conteudo: (
        <>
          <Topico titulo="O que é um Recibo?">
            <p>
              O Recibo documenta o recebimento de um pagamento ou a prestação de um serviço.
              Registra o cliente, os itens/serviços, os valores e a forma de pagamento.
            </p>
          </Topico>
          <Topico titulo="Formas de pagamento">
            <Dica>Dinheiro, PIX, Cartão de Crédito, Cartão de Débito</Dica>
            <Dica>Transferência Bancária, Boleto Bancário, Outro (com descrição livre)</Dica>
          </Topico>
          <Topico titulo="Cancelamento">
            <p>
              Recibos podem ser cancelados informando o motivo. Recibos cancelados ficam no histórico
              mas não são contabilizados nos Relatórios.
            </p>
          </Topico>
          <Topico titulo="Impressão">
            <p>
              O PDF do Recibo inclui todos os itens com quantidades, valores unitários, total por
              item, total geral e o valor por extenso em português.
            </p>
          </Topico>
        </>
      ),
    },
    {
      id: "relatorios",
      icone: <FileBarChart2 className="w-4 h-4 text-indigo-500" />,
      titulo: "Relatórios",
      conteudo: (
        <>
          <Topico titulo="O que está disponível?">
            <p>
              Os Relatórios consolidam os lançamentos por cliente e período. Você pode filtrar por
              cliente, data inicial e data final para ver o histórico de Cautelas e Recibos.
            </p>
          </Topico>
          <Topico titulo="Relatório de Cautelas">
            <Dica>Lista todas as cautelas do cliente no período selecionado</Dica>
            <Dica>Agrupa os produtos entregues com quantidade total por item</Dica>
            <Dica>Considera apenas cautelas com status diferente de "Rascunho"</Dica>
          </Topico>
          <Topico titulo="Relatório de Recibos">
            <Dica>Lista todos os recibos emitidos para o cliente no período</Dica>
            <Dica>Mostra total de cada produto vendido/prestado</Dica>
            <Dica>Calcula o total do período (apenas recibos ativos, não cancelados)</Dica>
          </Topico>
        </>
      ),
    },
    {
      id: "usuarios",
      icone: <UserCog className="w-4 h-4 text-slate-500" />,
      titulo: "Usuários e Permissões",
      conteudo: (
        <>
          <Topico titulo="Perfis disponíveis">
            <Dica>
              <strong>Admin</strong> — acesso total, incluindo Usuários e Configurações
            </Dica>
            <Dica>
              <strong>Operador</strong> — pode criar e gerenciar Cautelas e Recibos
            </Dica>
            <Dica>
              <strong>Consulta</strong> — somente leitura, sem permissão de criação
            </Dica>
          </Topico>
          <Topico titulo="Gerenciamento">
            <p>
              Somente administradores podem criar, editar e inativar usuários. O primeiro usuário
              do sistema sempre é criado como Admin.
            </p>
          </Topico>
          <Topico titulo="Segurança">
            <Dica>As senhas são armazenadas com hash — nunca em texto puro</Dica>
            <Dica>Usuários inativos não conseguem fazer login no sistema</Dica>
          </Topico>
        </>
      ),
    },
    {
      id: "sincronizacao",
      icone: <RefreshCw className="w-4 h-4 text-sky-500" />,
      titulo: "Sincronização com a Nuvem",
      conteudo: (
        <>
          <Topico titulo="Como funciona?">
            <p>
              O sistema funciona 100% offline — todos os dados ficam no banco de dados local da sua
              máquina. A sincronização envia as alterações para um servidor na nuvem, permitindo
              backup e acesso via aplicativo web.
            </p>
          </Topico>
          <Topico titulo="Configuração">
            <Dica>Acesse Configurações → aba Sincronização</Dica>
            <Dica>Informe a URL do servidor, login e senha</Dica>
            <Dica>Clique em "Testar Conexão" para validar antes de salvar</Dica>
          </Topico>
          <Topico titulo="Indicadores na barra de status">
            <Dica>
              <strong>Sincronizado</strong> — todos os dados estão na nuvem
            </Dica>
            <Dica>
              <strong>Pendente (N itens)</strong> — há alterações aguardando envio
            </Dica>
            <Dica>
              <strong>Sem conexão</strong> — servidor inacessível, dados ficam locais
            </Dica>
          </Topico>
        </>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ajuda</h1>
          <p className="text-sm text-muted-foreground">Documentação e referência rápida do sistema</p>
        </div>
      </div>

      {/* Card de primeiros passos */}
      {usuario?.perfil === "admin" && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Rocket className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-800">Primeiros Passos</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Rever o guia de introdução ao sistema com explicação de cada módulo
              </p>
            </div>
          </div>
          <button
            onClick={reiniciarOnboarding}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors flex-shrink-0"
          >
            Ver introdução
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Acordeão de seções */}
      <div className="space-y-2">
        {secoes.map((secao) => {
          const isOpen = aberto === secao.id;
          return (
            <div
              key={secao.id}
              className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggle(secao.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {secao.icone}
                  <span className="text-sm font-medium text-slate-800">{secao.titulo}</span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-50">
                  {secao.conteudo}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center mt-8">
        App Cautelas — versão 0.2
      </p>
    </div>
  );
}
