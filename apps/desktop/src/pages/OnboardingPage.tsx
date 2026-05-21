import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Building2,
  Package,
  Users,
  ArrowRight,
  Loader2,
  AlertCircle,
  ClipboardList,
  Receipt,
  HelpCircle,
  Rocket,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { getEmpresa, listProdutos, listClientes, getAppConfig, setAppConfig } from "@/lib/db";
import { getSyncConfig } from "@/lib/sync";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

// ─── TOUR (4 passos) ────────────────────────────────────────────────────────

interface TourStep {
  icone: React.ReactNode;
  titulo: string;
  subtitulo: string;
  descricao: string;
  dicas: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    icone: <Rocket className="w-12 h-12 text-primary" />,
    titulo: "Bem-vindo ao App Cautelas",
    subtitulo: "Veja o que você pode fazer",
    descricao:
      "O App Cautelas centraliza o controle de cessão de equipamentos e o registro de pagamentos da sua empresa. Tudo funciona offline, com sincronização opcional para a nuvem.",
    dicas: [
      "Cautelas registram empréstimos de bens e equipamentos com assinatura digital",
      "Recibos documentam pagamentos e serviços prestados",
      "Relatórios consolidam o histórico por cliente e período",
    ],
  },
  {
    icone: <ClipboardList className="w-12 h-12 text-purple-500" />,
    titulo: "Cautelas",
    subtitulo: "Controle de cessão temporária de bens",
    descricao:
      "Emita uma Cautela para registrar a entrega de equipamentos a um cliente ou destinatário. O fluxo completo garante rastreabilidade — do rascunho até a devolução.",
    dicas: [
      "Fluxo: Rascunho → Aguardando Entrega → Entregue c/ Assinatura → Encerrada",
      "A assinatura digital é coletada na própria tela, com mouse ou tela tátil",
      "Gera PDF pronto para impressão ou envio por e-mail",
    ],
  },
  {
    icone: <Receipt className="w-12 h-12 text-teal-500" />,
    titulo: "Recibos",
    subtitulo: "Registro de pagamentos",
    descricao:
      "Emita Recibos para documentar pagamentos recebidos. O sistema calcula os totais automaticamente e gera um PDF com os valores por extenso.",
    dicas: [
      "Formas de pagamento: Dinheiro, PIX, Cartão, Transferência, Boleto",
      "Recibos cancelados ficam no histórico com o motivo registrado",
      "Os Relatórios consolidam os valores por cliente e período",
    ],
  },
  {
    icone: <HelpCircle className="w-12 h-12 text-sky-500" />,
    titulo: "Precisa de ajuda?",
    subtitulo: "Consulte a documentação a qualquer momento",
    descricao:
      "A seção Ajuda no menu lateral contém a documentação completa de todos os módulos. Você pode consultá-la a qualquer momento sem sair do sistema.",
    dicas: [
      "Clique em 'Ajuda' no menu lateral para acessar a documentação",
      "Cada módulo tem uma seção explicando fluxos, campos e dicas",
      "Administradores podem reiniciar este tour em Ajuda → Primeiros Passos",
    ],
  },
];

// ─── SETUP (checklist) ───────────────────────────────────────────────────────

interface SetupStatus {
  empresa: boolean;
  backend: boolean;
  produtos: number;
  clientes: number;
}

// ─── COMPONENTE PRINCIPAL ────────────────────────────────────────────────────

type Modo = "carregando" | "setup" | "aguardando_setup" | "tour";

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { usuario, logout } = useAuthStore();

  const [modo, setModo] = useState<Modo>("carregando");
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [tourStep, setTourStep] = useState(0);
  const [concluindo, setConcluindo] = useState(false);

  useEffect(() => {
    inicializar();
  }, []);

  async function inicializar() {
    const completo = await getAppConfig("onboarding_completo");
    if (completo !== "1") {
      setModo(usuario?.perfil === "admin" ? "setup" : "aguardando_setup");
      if (usuario?.perfil === "admin") await carregarSetupStatus();
    } else {
      setModo("tour");
    }
  }

  async function carregarSetupStatus() {
    const [empresa, syncCfg, backendOk, produtos, clientes] = await Promise.all([
      getEmpresa(),
      getSyncConfig(),
      getAppConfig("sync_backend_ok"),
      listProdutos(),
      listClientes(),
    ]);
    setSetupStatus({
      empresa: empresa !== null,
      backend:
        backendOk === "1" &&
        (syncCfg?.backend_login ?? "").trim() !== "" &&
        (syncCfg?.backend_senha ?? "").trim() !== "",
      produtos: produtos.length,
      clientes: clientes.length,
    });
  }

  async function verificarSetup() {
    setSetupStatus(null);
    await carregarSetupStatus();
  }

  async function concluirSetup() {
    await setAppConfig("onboarding_completo", "1");
    setModo("tour");
  }

  async function concluirTour() {
    if (!usuario) return;
    setConcluindo(true);
    await setAppConfig(`onboarding_visto_${usuario.id}`, "1");
    navigate("/", { replace: true });
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // ─── RENDER ────────────────────────────────────────────────────────────────

  if (modo === "carregando") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (modo === "aguardando_setup") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-100 rounded-2xl mb-4">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Sistema em Configuração</h1>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            O administrador ainda está finalizando a configuração inicial do sistema.
            Aguarde e tente novamente em instantes.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={inicializar}
              className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Verificar novamente
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modo === "setup") {
    const tudo_completo =
      setupStatus !== null &&
      setupStatus.empresa &&
      setupStatus.backend &&
      setupStatus.produtos > 0 &&
      setupStatus.clientes > 0;

    const passos = setupStatus
      ? [
          {
            completo: setupStatus.empresa,
            icone: <Building2 className="w-5 h-5" />,
            titulo: "Empresa Emissora",
            descPendente:
              "Informe razão social, CNPJ, endereço e logotipo. Aparecem no cabeçalho de todos os documentos.",
            descCompleto: "Dados da empresa configurados.",
            rota: "/configuracoes",
            textoAcao: setupStatus.empresa ? "Editar" : "Configurar agora",
          },
          {
            completo: setupStatus.backend,
            icone: <RefreshCw className="w-5 h-5" />,
            titulo: "Sincronização / Backup",
            descPendente:
              "Configure URL, login e senha do servidor. Clique em 'Testar conexão' e depois salve. Necessário para backup automático.",
            descCompleto: "Servidor configurado e conexão verificada.",
            rota: "/configuracoes",
            textoAcao: setupStatus.backend ? "Editar" : "Configurar agora",
          },
          {
            completo: setupStatus.produtos > 0,
            icone: <Package className="w-5 h-5" />,
            titulo: "Produtos",
            descPendente:
              "Cadastre pelo menos um produto ou equipamento para usar em Cautelas e Recibos.",
            descCompleto: `${setupStatus.produtos} produto${setupStatus.produtos !== 1 ? "s" : ""} cadastrado${setupStatus.produtos !== 1 ? "s" : ""}.`,
            rota: "/produtos/novo",
            textoAcao: setupStatus.produtos > 0 ? "Adicionar mais" : "Cadastrar agora",
          },
          {
            completo: setupStatus.clientes > 0,
            icone: <Users className="w-5 h-5" />,
            titulo: "Clientes",
            descPendente:
              "Cadastre pelo menos um cliente para emitir Cautelas e Recibos.",
            descCompleto: `${setupStatus.clientes} cliente${setupStatus.clientes !== 1 ? "s" : ""} cadastrado${setupStatus.clientes !== 1 ? "s" : ""}.`,
            rota: "/clientes/novo",
            textoAcao: setupStatus.clientes > 0 ? "Adicionar mais" : "Cadastrar agora",
          },
        ]
      : [];

    const pendentes = passos.filter((p) => !p.completo).length;

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
        <div className="max-w-lg w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
              <AlertCircle className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Configuração Inicial</h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
              Complete os 4 passos abaixo antes de usar o sistema.
            </p>
          </div>

          {setupStatus === null ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6">
                {passos.map((passo, i) => (
                  <div
                    key={i}
                    className={cn(
                      "bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 transition-colors",
                      passo.completo ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                        passo.completo
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-500"
                      )}
                    >
                      {passo.completo ? <CheckCircle2 className="w-5 h-5" /> : <span>{i + 1}</span>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{passo.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {passo.completo ? passo.descCompleto : passo.descPendente}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate(passo.rota)}
                      className={cn(
                        "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                        passo.completo
                          ? "text-slate-500 border border-slate-200 hover:bg-slate-100"
                          : "text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      {passo.textoAcao}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={tudo_completo ? concluirSetup : undefined}
                disabled={!tudo_completo}
                className={cn(
                  "w-full py-3 text-sm font-semibold rounded-xl transition-all",
                  tudo_completo
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                {tudo_completo
                  ? "Configuração completa — Continuar →"
                  : `${pendentes} passo${pendentes !== 1 ? "s" : ""} restante${pendentes !== 1 ? "s" : ""} para continuar`}
              </button>

              {!tudo_completo && (
                <p className="text-center text-xs text-muted-foreground mt-3">
                  Após configurar cada item, clique em{" "}
                  <button
                    onClick={verificarSetup}
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Verificar novamente
                  </button>{" "}
                  para atualizar o status.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // modo === "tour"
  const step = TOUR_STEPS[tourStep];
  const isLast = tourStep === TOUR_STEPS.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Barra de progresso */}
      <div className="w-full bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">Introdução ao sistema</span>
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 items-center">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === tourStep ? "w-6 bg-primary" : i < tourStep ? "w-2 bg-primary/40" : "w-2 bg-slate-200"
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {tourStep + 1} / {TOUR_STEPS.length}
          </span>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-xl w-full">
          <div className="flex justify-center mb-6">
            <div className="p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
              {step.icone}
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">{step.titulo}</h1>
            <p className="text-sm text-muted-foreground">{step.subtitulo}</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 mb-6">
            <p className="text-slate-700 leading-relaxed text-sm mb-5">{step.descricao}</p>
            <div className="space-y-2.5">
              {step.dicas.map((dica, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span className="text-sm text-slate-600">{dica}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setTourStep((s) => s - 1)}
              disabled={tourStep === 0}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← Anterior
            </button>

            <button
              onClick={isLast ? concluirTour : () => setTourStep((s) => s + 1)}
              disabled={concluindo}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-70"
            >
              {concluindo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLast ? (
                <>
                  Ir para o Dashboard
                  <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
