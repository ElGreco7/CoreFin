import { useState } from 'react';
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
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { CategoryManager } from '../components/CategoryManager';

type TabType =
  | 'profile'
  | 'categories'
  | 'appearance'
  | 'notifications'
  | 'security'
  | 'preferences'
  | 'account';

export function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  // Profile state (placeholder — vai conectar com backend em outra fase)
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    company: user?.business_name || '',
    cnpj: '',
    address: '',
  });

  // Notification settings (placeholder)
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    transactionAlerts: true,
    goalReminders: true,
    weeklyReports: true,
    marketingEmails: false,
  });

  // Security settings (placeholder)
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    loginAlerts: true,
  });

  // Preferences (placeholder)
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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: conectar com PATCH /api/auth/me/
    console.log('Saving profile:', profileData);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-foreground mb-2">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e configurações da conta</p>
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
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">Informações do Perfil</h2>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <h3 className="text-lg text-foreground mb-4">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="name" className="block text-foreground mb-2">Nome Completo</label>
                        <input
                          id="name"
                          type="text"
                          value={profileData.name}
                          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
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
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg text-foreground mb-4">Informações da Empresa</h3>
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
                          onChange={(e) => setProfileData({ ...profileData, company: e.target.value })}
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label htmlFor="cnpj" className="block text-foreground mb-2">CNPJ</label>
                        <input
                          id="cnpj"
                          type="text"
                          value={profileData.cnpj}
                          onChange={(e) => setProfileData({ ...profileData, cnpj: e.target.value })}
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-foreground mb-2">Endereço</label>
                        <input
                          id="address"
                          type="text"
                          value={profileData.address}
                          onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                          className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button type="submit" variant="primary" className="gap-2">
                      <Save className="w-5 h-5" />
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Categories Tab — usa o CategoryManager */}
            {activeTab === 'categories' && <CategoryManager />}

            {/* Appearance Tab */}
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
                      <Sun className={`w-8 h-8 mx-auto mb-3 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
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
                      <Moon className={`w-8 h-8 mx-auto mb-3 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-center text-foreground">Modo Escuro</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab (mantido como estava — placeholder) */}
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">Preferências de Notificações</h2>
                <p className="text-muted-foreground mb-4">Em breve: integração com preferências do usuário.</p>
                <div className="space-y-6">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-accent rounded-lg">
                      <div className="flex-1">
                        <div className="text-foreground">{key}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            setNotificationSettings({ ...notificationSettings, [key]: e.target.checked })
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

            {/* Security Tab (mantido como estava) */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">Segurança</h2>
                <p className="text-muted-foreground mb-4">Em breve: 2FA, alertas de login e tempo de sessão.</p>
                <Button variant="outline" className="w-full">
                  Alterar Senha
                </Button>
              </div>
            )}

            {/* Preferences Tab (mantido como estava) */}
            {activeTab === 'preferences' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">Preferências do Sistema</h2>
                <p className="text-muted-foreground mb-4">
                  Em breve: salvamento das preferências no servidor (moeda, idioma, formato de data).
                </p>
                <div className="space-y-6">
                  <div>
                    <label htmlFor="currency" className="block text-foreground mb-2">Moeda Padrão</label>
                    <select
                      id="currency"
                      value={preferences.currency}
                      onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
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

            {/* Account Tab */}
            {activeTab === 'account' && (
              <div>
                <h2 className="text-2xl text-foreground mb-6">Configurações da Conta</h2>
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
                      onClick={() => logout()}
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
    </div>
  );
}