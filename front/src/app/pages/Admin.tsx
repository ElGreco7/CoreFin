import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  Users,
  FileText,
  BarChart3,
  Settings,
  Shield,
  ArrowRight,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { adminApi, UserStats } from '../services/admin';
import { analytics, AnalyticsStats, AnalyticsEvent } from '../services/analytics';
import { education } from '../services/education';

export function Admin() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats | null>(null);
  const [contentCount, setContentCount] = useState<number>(0);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [usersData, analyticsData, contentsData, eventsData] = await Promise.all([
          adminApi.getUserStats(30).catch(() => null),
          analytics.getStats(30).catch(() => null),
          education.listContents({ page_size: 1 }).catch(() => null),
          analytics.listEvents({ page_size: 5 }).catch(() => null),
        ]);

        if (usersData) setUserStats(usersData);
        if (analyticsData) setAnalyticsStats(analyticsData);
        if (contentsData) setContentCount(contentsData.count);
        if (eventsData) setRecentEvents(eventsData.results);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Helper pra formatar nome de evento amigavelmente
  function formatEventType(type: string): string {
    const map: Record<string, string> = {
      'login': 'fez login',
      'logout': 'fez logout',
      'income_created': 'registrou receita',
      'expense_created': 'registrou despesa',
      'goal_created': 'criou uma meta',
      'goal_contribution': 'aportou em meta',
      'category_created': 'criou categoria',
      'content_completed': 'concluiu conteúdo',
    };
    return map[type] || type.replace(/_/g, ' ');
  }

  // Helper pra "há X tempo"
  function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `Há ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ontem';
    return `Há ${diffDays} dias`;
  }

  // KPIs derivados
  const totalUsers = userStats?.total || 0;
  const activeUsers = userStats?.active || 0;
  const newUsers = userStats?.new_in_period || 0;
  const totalEvents = analyticsStats?.total_events || 0;
  const variation = analyticsStats?.variation_percent;

  const adminModules = [
    {
      id: 'users',
      title: 'Gerenciar Usuários',
      description: 'Administre contas, permissões e funções',
      icon: Users,
      link: '/admin/users',
      color: 'from-primary to-primary/80',
      stats: { label: `${activeUsers} usuários`, value: 'ativos' },
    },
    {
      id: 'content',
      title: 'Gerenciar Conteúdo',
      description: 'Administre conteúdo educacional da plataforma',
      icon: FileText,
      link: '/admin/content',
      color: 'from-secondary to-secondary/80',
      stats: { label: `${contentCount} conteúdos`, value: 'publicados' },
    },
    {
      id: 'analytics',
      title: 'Analytics e Relatórios',
      description: 'Visualize métricas de uso e engajamento',
      icon: BarChart3,
      link: '/admin/analytics',
      color: 'from-primary to-secondary',
      stats: { label: `${totalEvents}`, value: 'eventos este mês' },
    },
    {
      id: 'settings',
      title: 'Configurações do Sistema',
      description: 'Parâmetros globais e integrações',
      icon: Settings,
      link: '/admin/settings',
      color: 'from-destructive to-destructive/80',
      stats: { label: 'Sistema', value: 'operacional' },
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl text-foreground">Administração</h1>
            <p className="text-muted-foreground">Painel de controle e gerenciamento da plataforma</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm">Usuários Totais</span>
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : totalUsers}
          </div>
          <div className="text-sm text-muted-foreground">
            {loading ? '' : `${activeUsers} ativos`}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm">Novos Usuários (30d)</span>
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : newUsers}
          </div>
          <div className="text-sm text-secondary">cadastros</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm">Conteúdos</span>
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : contentCount}
          </div>
          <div className="text-sm text-muted-foreground">publicados</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground text-sm">Eventos (30d)</span>
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : totalEvents}
          </div>
          {variation !== null && variation !== undefined ? (
            <div className={`text-sm flex items-center gap-1 ${variation >= 0 ? 'text-secondary' : 'text-destructive'}`}>
              {variation >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {variation >= 0 ? '+' : ''}
              {variation}% vs período anterior
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">sem comparação</div>
          )}
        </div>
      </div>

      {/* Admin Modules */}
      <div className="mb-8">
        <h2 className="text-2xl text-foreground mb-6">Módulos de Administração</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {adminModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} to={module.link} className="block group">
                <div className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all h-full">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                        {module.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {module.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <span className="text-foreground">{module.stats.label}</span>
                          <span className="text-muted-foreground ml-1">{module.stats.value}</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary group-hover:gap-2 transition-all">
                          <span className="text-sm">Acessar</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card rounded-xl border border-border p-6 mb-8">
        <h3 className="text-xl text-foreground mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Atividade Recente
        </h3>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : recentEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma atividade registrada ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {recentEvents.map((event) => {
              const userEmail = event.user_email || `Usuário #${event.user || 'sistema'}`;
              const initial = userEmail.charAt(0).toUpperCase();
              return (
                <div key={event.id} className="flex items-center gap-4 p-4 bg-accent rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm">
                    {initial}
                  </div>
                  <div className="flex-1">
                    <p className="text-foreground">
                      <span className="font-medium">{userEmail}</span>{' '}
                      {formatEventType(event.event_type)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {timeAgo(event.created_at)}
                      {event.category && ` • ${event.category}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 rounded-xl border border-secondary/20 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-secondary animate-pulse"></div>
            <h4 className="text-foreground">Status do Sistema</h4>
          </div>
          <p className="text-2xl text-foreground mb-1">Operacional</p>
          <p className="text-sm text-muted-foreground">Backend e banco respondendo</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="text-foreground mb-2">Usuários Engajados</h4>
          <p className="text-2xl text-foreground mb-1">
            {loading ? '...' : analyticsStats?.active_users || 0}
          </p>
          <p className="text-sm text-muted-foreground">Ativos nos últimos 30 dias</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h4 className="text-foreground mb-2">Versão</h4>
          <p className="text-2xl text-foreground mb-1">v1.0.0</p>
          <p className="text-sm text-muted-foreground">CoreFin TCC 2026</p>
        </div>
      </div>
    </div>
  );
}