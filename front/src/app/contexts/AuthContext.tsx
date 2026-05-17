/**
 * src/app/contexts/AuthContext.tsx
 *
 * Compartilha o usuário logado entre todos os componentes.
 *
 * Uso:
 *   const { user, logout, refresh } = useAuth();
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { auth, User } from '../services/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca o usuário quando o app carrega
  useEffect(() => {
    auth
      .getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setLoading(false));
  }, []);

  // Atualiza os dados do usuário (após editar perfil, por exemplo)
  const refresh = async () => {
    const u = await auth.getCurrentUser();
    setUser(u);
  };

  // Faz logout completo: backend + localStorage + redireciona
  const logout = async () => {
    await auth.logout();
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook pra usar o contexto em qualquer componente.
 *   const { user, logout } = useAuth();
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return ctx;
}