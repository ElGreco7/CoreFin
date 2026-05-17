/**
 * src/app/components/ProtectedRoute.tsx
 *
 * Componente "guardião" que protege rotas privadas.
 *
 * Uso (no routes.tsx):
 *   <Route path="/home" element={
 *     <ProtectedRoute><Home /></ProtectedRoute>
 *   } />
 *
 *   <Route path="/admin" element={
 *     <ProtectedRoute requireRole="admin"><Admin /></ProtectedRoute>
 *   } />
 */
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { auth, User } from '../services/auth';

type Role = 'admin' | 'user' | 'viewer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Se definido, exige que o usuário tenha um destes roles.
   * Ex: requireRole="admin" → só admin e viewer entram (viewer não, decisão simples).
   * Ex: requireRole={["admin", "viewer"]} → admin e viewer entram.
   */
  requireRole?: Role | Role[];
}

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Se não tem token, não precisa nem chamar /me — já redireciona
    if (!auth.isAuthenticated()) {
      setChecking(false);
      return;
    }

    // Busca dados frescos do usuário (valida o token de verdade)
    auth
      .getCurrentUser()
      .then((u) => setUser(u))
      .finally(() => setChecking(false));
  }, []);

  // 1. Enquanto checa, mostra tela de loading
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // 2. Se não está logado, manda pro login
  //    Guarda a URL atual em "state" pra voltar depois do login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Se a rota exige um role específico, valida
  if (requireRole) {
    const allowedRoles = Array.isArray(requireRole) ? requireRole : [requireRole];
    if (!user.role || !allowedRoles.includes(user.role)) {
      // Usuário não tem permissão → manda pra home
      return <Navigate to="/home" replace />;
    }
  }

  // 4. Tudo certo, mostra a tela
  return <>{children}</>;
}