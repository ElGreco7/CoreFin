import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Calendar,
  PieChart as PieChartIcon,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { analytics, AnalyticsStats, AnalyticsEvent } from '../services/analytics';

type Period = 7 | 30 | 90;

const PIE_COLORS = ['#1e5a8e', '#6fbd6b', '#3b82f6', '#f59e0b', '#8b5cf6', '#94a3b8'];

// Traduz nomes técnicos de eventos pra labels amigáveis
const EVENT_TYPE_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  signup: 'Cadastro',
  income_created: 'Receita registrada',
  expense_created: 'Despesa registrada',
  goal_created: 'Meta criada',
  goal_contribution: 'Aporte em meta',
  category_created: 'Categoria criada',
  content_completed: 'Conteúdo concluído',
  content_viewed: 'Conteúdo visualizado',
  message_sent: 'Mensagem no chat',
};

function formatEventName(type: string): string {
  return EVENT_TYPE_LABELS[type] || type.replace(/_/g, ' ');
}

function formatDateBR(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}min atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ontem';
  return `${diffDays}d atrás`;
}

export function AdminAnalytics() {
  const [period, setPeriod] = useState<Period>(30);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [statsData, eventsData] = await Promise.all([
          analytics.getStats(period).catch(() => null),
          analytics.listEvents({ page_size: 20 }).catch(() => null),
        ]);
        if (statsData) setStats(statsData);
        if (eventsData) setRecentEvents(eventsData.results);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [period]);

  // ── Dados derivados ──────────────────────────────────────────────────

  // Eventos por dia preparados pro gráfico
  const eventsPerDayData = (stats?.events_per_day || []).map((item) => ({
    day: formatDateBR(item.day),
    eventos: item.count,
  }));

  // Top eventos preparados pro gráfico de barras (com labels amigáveis)
  const topEventsData = (stats?.top_event_types || []).slice(0, 8).map((item) => ({
    name: formatEventName(item.event_type),
    count: item.count,
  }));

  // Top categorias pro pie chart
  const topCategoriesData = (stats?.top_categories || []).map((item, idx) => ({
    name: item.category,
    value: item.count,
    color: PIE_COLORS[idx % PIE_COLORS.length],
  }));

  const variation = stats?.variation_percent;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Analytics e Relatórios</h1>
          <p className="text-muted-foreground">Métricas e insights sobre uso da plataforma</p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setPeriod(7)}
            className={`px-4 py-2 rounded-md transition-all ${
              period === 7
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            7 dias
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`px-4 py-2 rounded-md transition-all ${
              period === 30
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            30 dias
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`px-4 py-2 rounded-md transition-all ${
              period === 90
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            90 dias
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Total de Eventos</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : (stats?.total_events || 0).toLocaleString('pt-BR')}
          </div>
          {variation !== null && variation !== undefined ? (
            <div
              className={`text-sm flex items-center gap-1 ${
                variation >= 0 ? 'text-secondary' : 'text-destructive'
              }`}
            >
              {variation >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {variation >= 0 ? '+' : ''}
              {variation}% vs período anterior
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">sem dados anteriores</div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Usuários Ativos</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : stats?.active_users || 0}
          </div>
          <div className="text-sm text-secondary">no período</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Tipos de Evento</span>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : (stats?.top_event_types?.length || 0)}
          </div>
          <div className="text-sm text-primary">diferentes</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Período Anterior</span>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : (stats?.previous_period_events || 0).toLocaleString('pt-BR')}
          </div>
          <div className="text-sm text-muted-foreground">para comparação</div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Eventos por dia */}
        <div className="bg-card rounded-xl border border-border p-6 lg:col-span-2">
          <h3 className="text-xl text-foreground mb-6">Eventos por dia</h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Carregando...
            </div>
          ) : eventsPerDayData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center flex-col gap-2">
              <BarChart3 className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground">Sem eventos registrados no período</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={eventsPerDayData}>
                <defs>
                  <linearGradient id="adminAnalyticsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e5a8e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1e5a8e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="eventos"
                  stroke="#1e5a8e"
                  fillOpacity={1}
                  fill="url(#adminAnalyticsArea)"
                  name="Eventos"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top tipos de eventos */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl text-foreground mb-6">Top Eventos</h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Carregando...
            </div>
          ) : topEventsData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem dados
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topEventsData} layout="vertical" margin={{ left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#64748b"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="count" fill="#1e5a8e" name="Quantidade" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top categorias - pizza */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl text-foreground mb-6 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Categorias
          </h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Carregando...
            </div>
          ) : topCategoriesData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Sem categorias registradas
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topCategoriesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {topCategoriesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Eventos recentes (tabela) */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Eventos Recentes
          </h3>
          <span className="text-sm text-muted-foreground">
            Últimos {recentEvents.length} eventos
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : recentEvents.length === 0 ? (
          <div className="text-center py-12">
            <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum evento registrado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left py-3 text-sm text-muted-foreground">Usuário</th>
                  <th className="text-left py-3 text-sm text-muted-foreground">Evento</th>
                  <th className="text-left py-3 text-sm text-muted-foreground">Categoria</th>
                  <th className="text-left py-3 text-sm text-muted-foreground">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-accent/50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs">
                          {(event.user_email || 'S').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-foreground">
                          {event.user_email || `Sistema`}
                        </span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                        {formatEventName(event.event_type)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-muted-foreground">
                        {event.category || '-'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-sm text-muted-foreground">
                        {timeAgo(event.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}