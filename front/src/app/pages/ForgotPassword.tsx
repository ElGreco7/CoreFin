// src/app/pages/ForgotPassword.tsx
//
// Fluxo público de recuperação de senha em duas etapas:
//   1. Usuário informa o e-mail → backend envia link com uid + token
//   2. Usuário recebe o link, clica e é redirecionado para esta mesma página
//      com ?uid=...&token=... na URL → exibe formulário de nova senha.
//
// Rota sugerida: /recuperar-senha  (pública, sem ProtectedRoute)
// Adicionar em routes.tsx:
//   { path: '/recuperar-senha', element: <ForgotPassword /> }

import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { api } from '../services/api';

// ── Regras de senha forte (espelho do backend) ───────────────────────────────
type PasswordRule = { label: string; test: (v: string) => boolean };

const PASSWORD_RULES: PasswordRule[] = [
  { label: 'Mínimo 8 caracteres',        test: (v) => v.length >= 8 },
  { label: 'Pelo menos uma maiúscula',    test: (v) => /[A-Z]/.test(v) },
  { label: 'Pelo menos um número',        test: (v) => /[0-9]/.test(v) },
  { label: 'Pelo menos um caractere especial', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const pct    = Math.round((passed / PASSWORD_RULES.length) * 100);
  const color  = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="mt-2">
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <ul className="mt-2 space-y-1">
        {PASSWORD_RULES.map((r) => (
          <li key={r.label}
            className={`text-xs flex items-center gap-1.5 ${r.test(password) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            <span>{r.test(password) ? '✓' : '○'}</span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────

export function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const uid   = searchParams.get('uid');
  const token = searchParams.get('token');
  const isConfirmMode = !!(uid && token);

  // Etapa 1: solicitar reset
  const [email, setEmail]         = useState('');
  const [sentEmail, setSentEmail] = useState(false);

  // Etapa 2: confirmar nova senha
  const [newPassword, setNewPassword]     = useState('');
  const [confirmPass, setConfirmPass]     = useState('');
  const [resetSuccess, setResetSuccess]   = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const passwordValid = PASSWORD_RULES.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPass;

  // ── Etapa 1: solicitar e-mail de reset ──────────────────────────────────
  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/password-reset/request/', { email });
      setSentEmail(true);
    } catch {
      setError('Não foi possível processar a solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  // ── Etapa 2: confirmar nova senha ────────────────────────────────────────
  async function handleConfirmReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!passwordValid) {
      setError('A senha não atende todos os requisitos de segurança.');
      return;
    }
    if (!passwordsMatch) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/password-reset/confirm/', {
        uid,
        token,
        new_password: newPassword,
      });
      setResetSuccess(true);
    } catch (err: any) {
      const detail = err?.data?.detail ||
        err?.data?.new_password?.[0] ||
        'Link inválido ou expirado. Solicite um novo link de recuperação.';
      setError(Array.isArray(detail) ? detail.join(' ') : detail);
    } finally {
      setLoading(false);
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo / título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-foreground">CoreFin</h1>
          <p className="text-muted-foreground mt-1">Recuperação de senha</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">

          {/* ── MODO SOLICITAR ──────────────────────────────────── */}
          {!isConfirmMode && !sentEmail && (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-2">Esqueceu sua senha?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Informe o e-mail cadastrado e enviaremos um link para redefinição.
              </p>

              <form onSubmit={handleRequestReset} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                    E-mail
                  </label>
                  <input
                    id="email" type="email" required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 rounded-lg">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {loading ? 'Enviando...' : 'Enviar link de recuperação'}
                </button>
              </form>
            </>
          )}

          {/* ── E-MAIL ENVIADO ──────────────────────────────────── */}
          {!isConfirmMode && sentEmail && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Verifique seu e-mail</h2>
              <p className="text-sm text-muted-foreground">
                Se o endereço <strong>{email}</strong> estiver cadastrado, você receberá um link
                de recuperação em alguns minutos. Verifique também a pasta de spam.
              </p>
            </div>
          )}

          {/* ── MODO CONFIRMAR NOVA SENHA ────────────────────────── */}
          {isConfirmMode && !resetSuccess && (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-2">Criar nova senha</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Escolha uma senha segura para proteger sua conta.
              </p>

              <form onSubmit={handleConfirmReset} className="space-y-4">
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-foreground mb-1">
                    Nova senha
                  </label>
                  <input
                    id="new_password" type="password" required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={loading}
                  />
                  <PasswordStrength password={newPassword} />
                </div>

                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-foreground mb-1">
                    Confirmar nova senha
                  </label>
                  <input
                    id="confirm_password" type="password" required
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Repita a senha"
                    className={`w-full px-4 py-2.5 bg-accent border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                      confirmPass && !passwordsMatch ? 'border-destructive' : 'border-border'
                    }`}
                    disabled={loading}
                  />
                  {confirmPass && !passwordsMatch && (
                    <p className="text-xs text-destructive mt-1">As senhas não coincidem.</p>
                  )}
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 rounded-lg">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !passwordValid || !passwordsMatch}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
                  {loading ? 'Salvando...' : 'Definir nova senha'}
                </button>
              </form>
            </>
          )}

          {/* ── SUCESSO ─────────────────────────────────────────── */}
          {isConfirmMode && resetSuccess && (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Senha redefinida!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Sua senha foi atualizada com sucesso. Faça login com sua nova senha.
              </p>
              <Link to="/login"
                className="inline-block py-2.5 px-6 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Ir para o Login
              </Link>
            </div>
          )}

          {/* Link de volta para login */}
          {(!isConfirmMode || !resetSuccess) && (
            <div className="mt-6 text-center">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Voltar para o Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
