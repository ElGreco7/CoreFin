import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import coreFinLogo from 'figma:asset/1b6285e9fbc6384159f09ff618cf0c6f8f538e31.png';
import { auth } from '../services/auth';
import { ApiError } from '../services/api';

export function Signup() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validação no front: senhas têm que bater
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      await auth.register({
        name: formData.fullName,
        business_name: formData.businessName,
        email: formData.email,
        password: formData.password,
      });

      // Sucesso: redireciona pro login com mensagem
      navigate('/login', {
        state: { message: 'Conta criada com sucesso! Faça login para continuar.' },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // O backend retorna erros por campo, ex:
        // { email: ["user with this email already exists."] }
        // ou { password: ["Ensure this field has at least 8 characters."] }
        const data = err.data || {};
        const firstError =
          data.email?.[0] ||
          data.password?.[0] ||
          data.name?.[0] ||
          data.business_name?.[0] ||
          data.detail ||
          err.message ||
          'Erro ao criar conta. Verifique os dados e tente novamente.';

        // Traduz erros comuns
        let userFriendly = firstError;
        if (firstError.includes('already exists')) {
          userFriendly = 'Este e-mail já está cadastrado.';
        } else if (firstError.includes('at least 8 characters')) {
          userFriendly = 'A senha precisa ter no mínimo 8 caracteres.';
        } else if (firstError.includes('valid email')) {
          userFriendly = 'E-mail inválido.';
        }

        setErrorMsg(userFriendly);
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
              <h2 className="text-3xl text-white mb-2">Criar conta</h2>
              <p className="text-white/80">Preencha seus dados para começar</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              <div>
                <label className="block text-sm text-white/90 mb-2">Nome completo</label>
                <input
                  type="text"
                  placeholder="João da Silva"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm text-white/90 mb-2">Nome do negócio</label>
                <input
                  type="text"
                  placeholder="Silva Comércio"
                  value={formData.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm text-white/90 mb-2">E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm text-white/90 mb-2">Senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-all"
                  required
                  minLength={8}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm text-white/90 mb-2">Confirmar senha</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-primary py-3 rounded-lg hover:bg-white/90 transition-all shadow-lg text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-white/80 text-sm">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-white hover:underline">
                  Fazer login
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-white/60 mt-6">
            Ao criar uma conta, você concorda com nossos Termos de Serviço e Política de Privacidade
          </p>
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
            Comece sua jornada financeira
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Junte-se a milhares de microempreendedores que já transformaram
            sua gestão financeira com o CoreFin.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Gratuito para começar</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Configuração em minutos</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <span>Suporte dedicado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}