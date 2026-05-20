import { useEffect, useState } from "react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { initDb } from "@/lib/db";
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

function AuthGuard({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { usuario } = useAuthStore();
  if (!usuario) return <Navigate to="/login" replace />;
  if (adminOnly && usuario.perfil !== "admin") return <Navigate to="/" replace />;
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
          path="/"
          element={
            <AuthGuard>
              <AppShell />
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
