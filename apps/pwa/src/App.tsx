import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { AuthProvider } from './context/AuthContext';
import { AtestePage } from './pages/AtestePage';
import { CautelaDetailPage } from './pages/CautelaDetailPage';
import { CautelasPage } from './pages/CautelasPage';
import { ConfirmacaoPage } from './pages/ConfirmacaoPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route path="/cautelas" element={<CautelasPage />} />
            <Route path="/cautelas/:id" element={<CautelaDetailPage />} />
            <Route path="/cautelas/:id/ateste" element={<AtestePage />} />
            <Route path="/cautelas/:id/confirmacao" element={<ConfirmacaoPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/cautelas" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
