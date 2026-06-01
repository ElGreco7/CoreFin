import { useEffect, useState } from 'react';
import {
  User,
  Palette,
  Bell,
  Shield,
  Sliders,
  Tag,
  Mail,
  Phone,
  Building2,
  Save,
  Moon,
  Sun,
  LogOut,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { CategoryManager } from '../components/CategoryManager';
import { PASSWORD_RULES } from '../components/PasswordStrengthInput';
import { auth } from '../services/auth';
import { ApiError } from '../services/api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

type TabType =
  | 'profile'
  | 'categories'
  | 'appearance'
  | 'notifications'
  | 'security'
  | 'preferences'
  | 'account';

// Tipo do feedback mostrado abaixo de cada formulário.
type Feedback = { kind: 'success' | 'error'; message: string } | null;

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { theme, toggleTheme } = useTheme();
  const { user, logout, setUser } = useAuth();

  // ─── Perfil ────────────────────────────────────────────────────────────────
  // Todos os campos agora são persistidos no backend
  // (name, business_name, phone, cnpj, address).
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    cnpj: '',
    address: '',
  });

  // Sincroniza o formulário com o user assim que ele carrega no contexto.
  // (Settings pode montar antes do AuthProvider terminar a chamada inicial.)
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.business_name || '',
        cnpj: user.cnpj || '',
        address: user.address || '',
      });
    }
  }, [user]);

  const [profileSaving, setProfileSaving] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [confirmProfileOpen, setConfirmProfileOpen] = useState(false);

  // ─── Troca de senha ────────────────────────────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);

  // ─── Logout ────────────────────────────────────────────────────────────────
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  // ─── Estados auxiliares (placeholders mantidos) ────────────────────────────
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    transactionAlerts: true,
    goalReminders: true,
    weeklyReports: true,
    marketingEmails: false,
  });

  const [preferences, setPreferences] = useState({
    currency: 'BRL',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    fiscalYearStart: 'january',
  });

  const tabs = [
    { id: 'profile' as TabType, label: 'Perfil', icon: User },
    { id: 'categories' as TabType, label: 'Categorias', icon: Tag },
    { id: 'appearance' as TabType, label: 'Aparência', icon: Palette },
    { id: 'notifications' as TabType, label: 'Notificações', icon: Bell },
    { id: 'security' as TabType, label: 'Segurança', icon: Shield },
    { id: 'preferences' as TabType, label: 'Preferências', icon: Sliders },
    { id: 'account' as TabType, label: 'Conta', icon: KeyRound },
  ];

  // ─── Handlers de Perfil ────────────────────────────────────────────────────

  // Submit do formulário só abre o diálogo de confirmação.
  const handleSubmitProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileFeedback(null);

    if (!profileData.name.trim()) {
      setProfileFeedback({ kind: 'error', message: 'O nome é obrigatório.' });
      return;
    }

    setConfirmProfileOpen(true);
  };

  // Só executa quando o usuário confirma no diálogo.
  const handleConfirmSaveProfile = async () => {
    setConfirmProfileOpen(false);
    setProfileSaving(true);
    setProfileFeedback(null);

    try {
      const updated = await auth.updateProfile({
        name: profileData.name.trim(),
        business_name: profileData.company.trim(),
        phone: profileData.phone.trim(),
        cnpj: profileData.cnpj.trim(),
        address: profileData.address.trim(),
      });
      // Atualiza o contexto imediatamente — Header e Home recebem o novo nome.
      setUser(updated);
      setProfileFeedback({
        kind: 'success',
        message: 'Perfil atualizado com sucesso.',
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível salvar. Tente novamente.';
      setProfileFeedback({ kind: 'error', message: msg });
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Handlers de Senha ─────────────────────────────────────────────────────

  const handleSubmitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (
      !passwordForm.current_password ||
      !passwordForm.new_password ||
      !passwordForm.confirm_password
    ) {
      setPasswordFeedback({
        kind: 'error',
        message: 'Preencha todos os campos.',
      });
      return;
    }

    const failedRules = PASSWORD_RULES.filter((r) => !r.test(passwordForm.new_password));
    if (failedRules.length > 0) {
      setPasswordFeedback({
        kind: 'error',
        message: failedRules.map((r) => r.label).join(' · '),
      });
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordFeedback({
        kind: 'error',
        message: 'A confirmação não bate com a nova senha.',
      });
      return;
    }

    if (passwordForm.new_password === passwordForm.current_password) {
      setPasswordFeedback({
        kind: 'error',
        message: 'A nova senha precisa ser diferente da atual.',
      });
      return;
    }

    setConfirmPasswordOpen(true);
  };

  const handleConfirmChangePassword = async () => {
    setConfirmPasswordOpen(false);
    setPasswordSaving(true);
    setPasswordFeedback(null);

    try {
      await auth.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setPasswordFeedback({
        kind: 'success',
        message: 'Senha alterada com sucesso.',
      });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Não foi possível alterar a senha.';
      setPasswordFeedback({ kind: 'error', message: msg });
    } finally {
      setPasswordSaving(false);
    }
  };

  // ─── Logout ────────────────────────────────────────────────────────────────

  const handleConfirmLogout = async () => {
    setConfirmLogoutOpen(false);
    await logout();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-xl border border-border p-8">
            {/* ───── Profile Tab ───── */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">
                  Informações do Perfil
                </h2>
                <form onSubmit={handleSubmitProfile} className="space-y-6">
                  <div>
                    <h3 className="text-lg text-foreground mb-4">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-foreground mb-2">
                          Nome Completo
                        </label>
                        <input
                          id="name"
                          type="text"
                          value={profileData.name}
                          onChange={(e) =>
                            setProfileData({ ...profileData, name: e.target.value })
                          }
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-foreground mb-2">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Email
                        </label>
                        <input
                          id="email"
                          type="email"
                          value={profileData.email}
                          disabled
                          className="w-full px-4 py-2.5 bg-muted border border-border rounded-lg text-muted-foreground"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-foreground mb-2">
                          <Phone className="w-4 h-4 inline mr-1" />
                          Telefone
                        </label>
                        <input
                          id="phone"
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) =>
                            setProfileData({ ...profileData, phone: e.target.value })
                          }
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg text-foreground mb-4">
                      Informações da Empresa
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="company" className="block text-foreground mb-2">
                          <Building2 className="w-4 h-4 inline mr-1" />
                          Nome da Empresa
                        </label>
                        <input
                          id="company"
                          type="text"
                          value={profileData.company}
                          onChange={(e) =>
                            setProfileData({ ...profileData, company: e.target.value })
                          }
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label htmlFor="cnpj" className="block text-foreground mb-2">
                          CNPJ
                        </label>
                        <input
                          id="cnpj"
                          type="text"
                          value={profileData.cnpj}
                          onChange={(e) =>
                            setProfileData({ ...profileData, cnpj: e.target.value })
                          }
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-foreground mb-2">
                          Endereço
                        </label>
                        <input
                          id="address"
                          type="text"
                          value={profileData.address}
                          onChange={(e) =>
                            setProfileData({ ...profileData, address: e.target.value })
                          }
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {profileFeedback && <FeedbackBanner feedback={profileFeedback} />}

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      className="gap-2"
                      disabled={profileSaving}
                    >
                      {profileSaving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Salvar Alterações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* ───── Categories ───── */}
            {activeTab === 'categories' && <CategoryManager />}

            {/* ───── Appearance ───── */}
            {activeTab === 'appearance' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">Aparência</h2>
                <div className="mb-8">
                  <h3 className="text-lg text-foreground mb-4">Tema</h3>
                  <p className="text-muted-foreground mb-4">
                    Escolha entre modo claro ou escuro para personalizar sua experiência
                  </p>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <button
                      onClick={() => theme === 'dark' && toggleTheme()}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        theme === 'light'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-accent hover:border-primary/50'
                      }`}
                    >
                      <Sun
                        className={`w-8 h-8 mx-auto mb-3 ${
                          theme === 'light' ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      <div className="text-center text-foreground">Modo Claro</div>
                    </button>
                    <button
                      onClick={() => theme === 'light' && toggleTheme()}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        theme === 'dark'
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-accent hover:border-primary/50'
                      }`}
                    >
                      <Moon
                        className={`w-8 h-8 mx-auto mb-3 ${
                          theme === 'dark' ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                      <div className="text-center text-foreground">Modo Escuro</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ───── Notifications (placeholder) ───── */}
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">
                  Preferências de Notificações
                </h2>
                <p className="text-muted-foreground mb-4">
                  Em breve: integração com preferências do usuário.
                </p>
                <div className="space-y-6">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 bg-accent rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="text-foreground">{key}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              [key]: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ───── Security: troca de senha (funcional) ───── */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">Segurança</h2>
                <div className="space-y-6 max-w-xl">
                  <div>
                    <h3 className="text-lg text-foreground mb-4">Alterar Senha</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Informe sua senha atual e escolha uma nova com pelo menos 8 caracteres.
                    </p>
                    <form onSubmit={handleSubmitPassword} className="space-y-4">
                      <div>
                        <label
                          htmlFor="current_password"
                          className="block text-foreground mb-2"
                        >
                          Senha Atual
                        </label>
                        <input
                          id="current_password"
                          type="password"
                          autoComplete="current-password"
                          value={passwordForm.current_password}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              current_password: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="new_password"
                          className="block text-foreground mb-2"
                        >
                          Nova Senha
                        </label>
                        <input
                          id="new_password"
                          type="password"
                          autoComplete="new-password"
                          value={passwordForm.new_password}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              new_password: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        {/* Checklist de força — aparece ao digitar */}
                        {passwordForm.new_password && (
                          <ul className="mt-2 space-y-1">
                            {PASSWORD_RULES.map((r) => {
                              const ok = r.test(passwordForm.new_password);
                              return (
                                <li
                                  key={r.label}
                                  className={`text-xs flex items-center gap-1.5 ${
                                    ok
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  <span>{ok ? '✓' : '○'}</span>
                                  {r.label}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="confirm_password"
                          className="block text-foreground mb-2"
                        >
                          Confirmar Nova Senha
                        </label>
                        <input
                          id="confirm_password"
                          type="password"
                          autoComplete="new-password"
                          value={passwordForm.confirm_password}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              confirm_password: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-2.5 bg-accent border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                            passwordForm.confirm_password &&
                            passwordForm.confirm_password !== passwordForm.new_password
                              ? 'border-destructive'
                              : 'border-border'
                          }`}
                        />
                        {passwordForm.confirm_password &&
                          passwordForm.confirm_password !== passwordForm.new_password && (
                            <p className="text-xs text-destructive mt-1">
                              As senhas não coincidem.
                            </p>
                          )}
                      </div>

                      {passwordFeedback && (
                        <FeedbackBanner feedback={passwordFeedback} />
                      )}

                      <div className="flex justify-end pt-2">
                        <Button
                          type="submit"
                          variant="primary"
                          className="gap-2"
                          disabled={passwordSaving}
                        >
                          {passwordSaving ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Alterando...
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-5 h-5" />
                              Alterar Senha
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* ───── Preferences (placeholder) ───── */}
            {activeTab === 'preferences' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">
                  Preferências do Sistema
                </h2>
                <p className="text-muted-foreground mb-4">
                  Em breve: salvamento das preferências no servidor (moeda, idioma, formato de data).
                </p>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="currency" className="block text-foreground mb-2">
                      Moeda Padrão
                    </label>
                    <select
                      id="currency"
                      value={preferences.currency}
                      onChange={(e) =>
                        setPreferences({ ...preferences, currency: e.target.value })
                      }
                      className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground"
                    >
                      <option value="BRL">Real Brasileiro (R$)</option>
                      <option value="USD">Dólar Americano ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* ───── Account / Logout ───── */}
            {activeTab === 'account' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">
                  Configurações da Conta
                </h2>
                <div className="space-y-6">
                  <div className="p-6 bg-accent rounded-lg">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl">
                        {(user?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg text-foreground">{user?.name}</h3>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <h3 className="text-lg text-foreground mb-4">Sessão</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Encerre sua sessão atual e retorne à tela de login.
                    </p>
                    <Button
                      variant="outline"
                      className="gap-2 w-full md:w-auto"
                      onClick={() => setConfirmLogoutOpen(true)}
                    >
                      <LogOut className="w-5 h-5" />
                      Sair da Conta
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Diálogos de confirmação ─── */}

      <AlertDialog open={confirmProfileOpen} onOpenChange={setConfirmProfileOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar alterações no perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              As novas informações ficarão visíveis em toda a aplicação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSaveProfile}>
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPasswordOpen} onOpenChange={setConfirmPasswordOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar troca de senha?</AlertDialogTitle>
            <AlertDialogDescription>
              Você precisará usar a nova senha no próximo login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmChangePassword}>
              Trocar senha
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você precisará entrar novamente com seu e-mail e senha.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmLogout}>Sair</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Banner de feedback (sucesso/erro) — usado abaixo dos formulários.
 */
function FeedbackBanner({ feedback }: { feedback: NonNullable<Feedback> }) {
  const isSuccess = feedback.kind === 'success';
  return (
    <div
      role="status"
      className={`flex items-start gap-2 px-4 py-3 rounded-lg border text-sm ${
        isSuccess
          ? 'bg-secondary/10 border-secondary/30 text-secondary'
          : 'bg-destructive/10 border-destructive/30 text-destructive'
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      )}
      <span>{feedback.message}</span>
    </div>
  );
}
