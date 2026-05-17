import { useEffect, useState } from 'react';
import {
  Settings,
  Database,
  Globe,
  User as UserIcon,
  Mail,
  Crown,
  Shield,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
  Code,
  Server,
  AlertTriangle,
  Info,
  Calendar,
} from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const BACKEND_BASE = API_URL.replace(/\/api\/?$/, '');

type SystemStatus = 'checking' | 'online' | 'offline';

export function AdminSettings() {
  const { user, logout } = useAuth();
  const [apiStatus, setApiStatus] = useState<SystemStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  async function checkApiStatus() {
    setApiStatus('checking');
    try {
      await api.get('/auth/me/');
      setApiStatus('online');
    } catch {
      setApiStatus('offline');
    } finally {
      setLastChecked(new Date());
    }
  }

  useEffect(() => {
    checkApiStatus();
  }, []);

  function handleClearCache() {
    if (!confirm('Limpar cache local e deslogar?')) return;
    localStorage.clear();
    sessionStorage.clear();
    logout();
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl text-foreground">Configurações do Sistema</h1>
            <p className="text-muted-foreground">Informações da plataforma e ferramentas administrativas</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Server className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h2 className="text-xl text-foreground">Status do Sistema</h2>
                <p className="text-sm text-muted-foreground">Verificação em tempo real do backend</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={checkApiStatus}>
              <RefreshCw className={`w-4 h-4 ${apiStatus === 'checking' ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
              <div className={`w-3 h-3 rounded-full ${apiStatus === 'online' ? 'bg-secondary animate-pulse' : apiStatus === 'offline' ? 'bg-destructive' : 'bg-yellow-500 animate-pulse'}`}></div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">API Backend</div>
                <div className="text-foreground">{apiStatus === 'online' ? 'Online' : apiStatus === 'offline' ? 'Offline' : 'Verificando...'}</div>
              </div>
              {apiStatus === 'online' ? <CheckCircle className="w-5 h-5 text-secondary" /> : apiStatus === 'offline' ? <XCircle className="w-5 h-5 text-destructive" /> : null}
            </div>
            <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
              <div className="w-3 h-3 rounded-full bg-secondary animate-pulse"></div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">Frontend</div>
                <div className="text-foreground">Operacional</div>
              </div>
              <CheckCircle className="w-5 h-5 text-secondary" />
            </div>
            <div className="flex items-center gap-3 p-4 bg-accent rounded-lg">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Última verificação</div>
                <div className="text-foreground">{lastChecked ? formatTime(lastChecked) : '-'}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl text-foreground">Sua Conta</h2>
              <p className="text-sm text-muted-foreground">Dados do admin logado</p>
            </div>
          </div>
          {user ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><UserIcon className="w-4 h-4" />Nome</div>
                <div className="text-foreground">{user.name}</div>
              </div>
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Mail className="w-4 h-4" />E-mail</div>
                <div className="text-foreground">{user.email}</div>
              </div>
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Crown className="w-4 h-4" />Função</div>
                <div className="text-foreground capitalize">{user.role === 'admin' ? 'Administrador' : user.role === 'viewer' ? 'Visualizador' : 'Usuário'}</div>
              </div>
              <div className="p-4 bg-accent rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Shield className="w-4 h-4" />ID do Usuário</div>
                <div className="text-foreground font-mono text-sm">#{user.id}</div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-4">Carregando...</div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Info className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl text-foreground">Informações do Ambiente</h2>
              <p className="text-sm text-muted-foreground">Detalhes técnicos da instalação</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-accent rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Aplicação</div>
              <div className="text-foreground">CoreFin v1.0.0</div>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Ambiente</div>
              <div className="text-foreground">{import.meta.env.DEV ? 'Desenvolvimento' : 'Produção'}</div>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">URL da API</div>
              <div className="text-foreground font-mono text-sm break-all">{API_URL}</div>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Stack</div>
              <div className="text-foreground text-sm">Django REST + React/Vite + PostgreSQL</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Code className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl text-foreground">Ferramentas Administrativas</h2>
              <p className="text-sm text-muted-foreground">Atalhos para ferramentas do desenvolvedor</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a href={`${BACKEND_BASE}/api/docs/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-primary/10 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Code className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-foreground">Swagger / OpenAPI</div>
                <div className="text-sm text-muted-foreground">Documentação interativa da API</div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            </a>
            <a href={`${BACKEND_BASE}/admin/`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-accent rounded-lg hover:bg-primary/10 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center group-hover:bg-destructive/20 transition-colors">
                <Database className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="text-foreground">Django Admin</div>
                <div className="text-sm text-muted-foreground">Painel administrativo do Django</div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
            </a>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Globe className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h2 className="text-xl text-foreground">Configurações Regionais</h2>
              <p className="text-sm text-muted-foreground">Padrões usados pela aplicação</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-accent rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Idioma</div>
              <div className="text-foreground">Português (Brasil)</div>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Fuso Horário</div>
              <div className="text-foreground">America/Sao_Paulo (UTC-3)</div>
            </div>
            <div className="p-4 bg-accent rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Moeda</div>
              <div className="text-foreground">Real Brasileiro (BRL)</div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border-2 border-destructive/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl text-foreground">Zona Perigosa</h2>
              <p className="text-sm text-muted-foreground">Ações irreversíveis — use com cuidado</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <div className="flex-1">
                <div className="text-foreground mb-1">Limpar cache local</div>
                <div className="text-sm text-muted-foreground">Remove tokens, preferências e te desloga. Útil quando alguma coisa parece "presa".</div>
              </div>
              <Button variant="outline" className="gap-2" onClick={handleClearCache}>
                <Trash2 className="w-4 h-4" />
                Limpar e sair
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
