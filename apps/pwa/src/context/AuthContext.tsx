import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadInitial(): AuthState {
  const token = localStorage.getItem('cautelas_token');
  const raw = localStorage.getItem('cautelas_user');
  if (token && raw) {
    try {
      return { token, user: JSON.parse(raw) as User };
    } catch {
      // ignore malformed data
    }
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadInitial);

  const signIn = useCallback((token: string, user: User) => {
    localStorage.setItem('cautelas_token', token);
    localStorage.setItem('cautelas_user', JSON.stringify(user));
    setState({ token, user });
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('cautelas_token');
    localStorage.removeItem('cautelas_user');
    setState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signOut, isAuthenticated: !!state.token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
