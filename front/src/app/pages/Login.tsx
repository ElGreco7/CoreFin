import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import coreFinLogo from 'figma:asset/1b6285e9fbc6384159f09ff618cf0c6f8f538e31.png';
import { auth } from '../services/auth';
import { ApiError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const successMessage = (location.state as { message?: string } | null)?.message;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      // auth.login() já retorna o User recém-buscado em /auth/me/.
      // Atualizamos o contexto IMEDIATAMENTE pra evitar que o nome
      // do usuário anterior apareça por alguns instantes na Home
      // (caso o AuthContext ainda esteja com o estado antigo).
      const loggedUser = await auth.login(email, password);
      setUser(loggedUser);
      navigate('/home');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMsg('E-mail ou senha incorretos.');
        } else {
          setErrorMsg(err.message || 'Erro ao fazer login. Tente novamente.');
        }
      } else {
        setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-secondary via-secondary to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8 lg:hidden">
            <img
              src={coreFinLogo}
              alt="CoreFin"
              className="h-20 w-auto mx-auto mb-4 drop-shadow-2xl"
            />
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl text-white mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-white/80">
                Faça login para continuar
              </p>
            </div>

            {successMessage && (
              <div className="bg-green-500/20 border border-green-300/40 text-white px-4 py-3 rounded-lg text-sm mb-4">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm text-white/90 mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm text-white/90 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
              </div>

              {errorMsg && (
                <div className="bg-red-500/20 border border-red-300/40 text-white px-4 py-3 rounded-lg text-sm">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-white/90">
                  <input
                    type="checkbox"
                    className="mr-2 rounded border-white/30 bg-white/20"
                  />
                  Lembrar-me
                </label>
                <a href="#" className="text-white hover:underline">
                  Esqueceu a senha?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-primary py-3 rounded-lg hover:bg-white/90 transition-all shadow-lg text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/80 text-sm">
                Não tem uma conta?{' '}
                <Link to="/signup" className="text-white hover:underline">
                  Criar conta
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-background p-12 items-center justify-center relative">
        <div className="relative z-10 max-w-lg">
          <div className="mb-12">
            <img
              src={coreFinLogo}
              alt="CoreFin"
              className="h-48 w-auto drop-shadow-2xl mx-auto"
            />
          </div>
          <h1 className="text-5xl mb-6 text-center text-foreground">
            Bem-vindo ao CoreFin
          </h1>
          <p className="text-xl text-muted-foreground mb-10 text-center">
            A plataforma financeira completa para microempreendedores individuais.
            Gerencie suas finanças com inteligência e simplicidade.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Controle financeiro completo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Relatórios inteligentes</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Educação financeira personalizada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
