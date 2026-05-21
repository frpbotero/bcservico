import { useEffect, useState } from "react";
import { MemoryRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { initDb, getAppConfig } from "@/lib/db";
import { useAuthStore } from "@/store/authStore";
import AppShell from "@/components/layout/AppShell";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import ConfiguracoesPage from "@/pages/ConfiguracoesPage";
import UsuariosPage from "@/pages/UsuariosPage";
import UsuarioFormPage from "@/pages/UsuarioFormPage";
import ClientesPage from "@/pages/ClientesPage";
import ClienteFormPage from "@/pages/ClienteFormPage";
import ProdutosPage from "@/pages/ProdutosPage";
import ProdutoFormPage from "@/pages/ProdutoFormPage";
import CautelasPage from "@/pages/CautelasPage";
import CautelaFormPage from "@/pages/CautelaFormPage";
import RecibosPage from "@/pages/RecibosPage";
import ReciboFormPage from "@/pages/ReciboFormPage";
import RelatoriosPage from "@/pages/RelatoriosPage";
import OnboardingPage from "@/pages/OnboardingPage";
import AjudaPage from "@/pages/AjudaPage";

function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { usuario } = useAuthStore();
  if (!usuario) return <Navigate to="/login" replace />;
  if (adminOnly && usuario.perfil !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Rotas permitidas durante o setup (para o usuário configurar sem ser redirecionado de volta)
const SETUP_PATHS = ["/configuracoes", "/produtos", "/clientes"];

function OnboardingRedirect({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!usuario) { setChecked(true); return; }

    // Permite acesso às páginas de setup mesmo com onboarding pendente
    const emRotaSetup = SETUP_PATHS.some((p) => location.pathname.startsWith(p));
    if (emRotaSetup) { setChecked(true); return; }

    Promise.all([
      getAppConfig("onboarding_completo"),
      getAppConfig(`onboarding_visto_${usuario.id}`),
    ])
      .then(([completo, visto]) => {
        if (completo !== "1" || visto !== "1") {
          navigate("/onboarding", { replace: true });
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  if (!checked) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    );
  }
  return <>{children}</>;
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDb()
      .then(() => setDbReady(true))
      .catch((err) => setDbError(String(err)));
  }, []);

  if (dbError) {
    return (
      <div className="flex items-center justify-center h-screen bg-destructive/10 p-8">
        <div className="text-center">
          <p className="text-destructive font-semibold text-lg">Erro ao inicializar o banco de dados</p>
          <p className="text-muted-foreground mt-2 text-sm">{dbError}</p>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground text-sm">Inicializando...</p>
      </div>
    );
  }

  return (
    <MemoryRouter>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={
            <AuthGuard>
              <OnboardingPage />
            </AuthGuard>
          }
        />
        <Route
          path="/"
          element={
            <AuthGuard>
              <OnboardingRedirect>
                <AppShell />
              </OnboardingRedirect>
            </AuthGuard>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="clientes/novo" element={<ClienteFormPage />} />
          <Route path="clientes/:id/editar" element={<ClienteFormPage />} />
          <Route path="produtos" element={<ProdutosPage />} />
          <Route path="produtos/novo" element={<ProdutoFormPage />} />
          <Route path="produtos/:id/editar" element={<ProdutoFormPage />} />
          <Route path="cautelas" element={<CautelasPage />} />
          <Route path="cautelas/nova" element={<CautelaFormPage />} />
          <Route path="cautelas/:id/editar" element={<CautelaFormPage />} />
          <Route path="recibos" element={<RecibosPage />} />
          <Route path="recibos/novo" element={<ReciboFormPage />} />
          <Route path="relatorios" element={<RelatoriosPage />} />
          <Route path="ajuda" element={<AjudaPage />} />
          <Route
            path="usuarios"
            element={
              <AuthGuard adminOnly>
                <UsuariosPage />
              </AuthGuard>
            }
          />
          <Route
            path="usuarios/novo"
            element={
              <AuthGuard adminOnly>
                <UsuarioFormPage />
              </AuthGuard>
            }
          />
          <Route
            path="usuarios/:id/editar"
            element={
              <AuthGuard adminOnly>
                <UsuarioFormPage />
              </AuthGuard>
            }
          />
          <Route
            path="configuracoes"
            element={
              <AuthGuard adminOnly>
                <ConfiguracoesPage />
              </AuthGuard>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MemoryRouter>
  );
}
