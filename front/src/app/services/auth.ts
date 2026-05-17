/**
 * src/app/services/auth.ts
 *
 * Funções de autenticação do CoreFin.
 * Usa o cliente HTTP definido em api.ts.
 */
import { api, tokens, ApiError } from "./api";

// ── Tipos ───────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  name: string;
  business_name?: string;
  email: string;
  created_at: string;
  role?: "admin" | "user" | "viewer";
}

interface LoginResponse {
  access: string;
  refresh: string;
}

interface RegisterPayload {
  name: string;
  business_name?: string;
  email: string;
  password: string;
}

// ── Funções ─────────────────────────────────────────────────────────────────

/**
 * Faz login do usuário.
 * Salva tokens no localStorage e retorna os dados do usuário.
 *
 * @throws ApiError com status 401 se credenciais inválidas
 */
async function login(email: string, password: string): Promise<User> {
  // 1. Pede tokens ao backend
  const response = await api.post<LoginResponse>(
    "/auth/login/",
    { email, password },
    { withAuth: false } // login não precisa de token (lógico)
  );

  // 2. Salva tokens no localStorage
  tokens.save(response.access, response.refresh);

  // 3. Busca dados do usuário (agora autenticado)
  const user = await api.get<User>("/auth/me/");
  return user;
}

/**
 * Cria nova conta de usuário.
 * NÃO faz login automaticamente — o usuário precisa logar depois.
 */
async function register(payload: RegisterPayload): Promise<User> {
  const user = await api.post<User>(
    "/auth/register/",
    payload,
    { withAuth: false }
  );
  return user;
}

/**
 * Faz logout: invalida o refresh token no backend e limpa o localStorage.
 * Se a chamada ao backend falhar, ainda assim limpa o localStorage
 * (o usuário sai do site mesmo com problema de rede).
 */
async function logout(): Promise<void> {
  const refresh = tokens.getRefresh();

  if (refresh) {
    try {
      await api.post("/auth/logout/", { refresh });
    } catch {
      // Mesmo se falhar (token já inválido, rede caiu, etc),
      // limpamos o localStorage local
    }
  }

  tokens.clear();
}

/**
 * Retorna os dados do usuário logado.
 * Se não estiver logado, retorna null.
 */
async function getCurrentUser(): Promise<User | null> {
  if (!tokens.getAccess()) return null;

  try {
    return await api.get<User>("/auth/me/");
  } catch (err) {
    // Se o token for inválido (depois de tentar refresh), retorna null
    if (err instanceof ApiError && err.status === 401) {
      tokens.clear();
      return null;
    }
    throw err;
  }
}

/**
 * Verifica rapidamente se o usuário tem token salvo.
 * NÃO valida com o backend — só checa se existe localmente.
 * Útil pra ProtectedRoute decidir se mostra a tela ou redireciona.
 */
function isAuthenticated(): boolean {
  return !!tokens.getAccess();
}

// ── Export único ────────────────────────────────────────────────────────────
export const auth = {
  login,
  register,
  logout,
  getCurrentUser,
  isAuthenticated,
};