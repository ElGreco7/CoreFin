import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '../components/Button';
import { finance, Expense, Summary } from '../services/finance';
import { goals as goalsService, Goal } from '../services/goals';

// ── Helpers ───────────────────────────────────────────────────────────────
function formatMoney(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

function monthQuery(date: Date): string {
  // formato YYYY-MM
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Cores fixas pra categorias da pizza
const PIE_COLORS = ['#1e5a8e', '#2670a8', '#6fbd6b', '#8dd089', '#94a3b8', '#f59e0b', '#ef4444'];

type CashFlowRow = { month: string; receitas: number; despesas: number };
type CategoryRow = { name: string; value: number; color: string };
type Insight = { title: string; description: string; type: 'positive' | 'info' | 'negative' };

export function Dashboard() {
  // Estados de dados
  const [currentSummary, setCurrentSummary] = useState<Summary | null>(null);
  const [previousSummary, setPreviousSummary] = useState<Summary | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowRow[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<CategoryRow[]>([]);
  const [topGoals, setTopGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const today = new Date();

        // 1. Resumo do mês atual e do anterior (pra comparação)
        const currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);

        // 2. Últimos 6 meses pro gráfico de linha
        const last6Months: Date[] = [];
        for (let i = 5; i >= 0; i--) {
          last6Months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
        }

        // Chama tudo em paralelo
        const [currentSum, previousSum, allMonthSummaries, expensesData, goalsData] = await Promise.all([
          finance.getSummary(monthQuery(currentMonthDate)).catch(() => null),
          finance.getSummary(monthQuery(previousMonthDate)).catch(() => null),
          Promise.all(
            last6Months.map((d) => finance.getSummary(monthQuery(d)).catch(() => null))
          ),
          // pega despesas do mês atual pra agrupar por categoria
          finance.listExpenses({
            start_date: `${currentMonthDate.toISOString().slice(0, 10)}`,
            page_size: 200,
          }).catch(() => null),
          goalsService.listGoals({ status: 'active', page_size: 5 }).catch(() => null),
        ]);

        if (currentSum) setCurrentSummary(currentSum);
        if (previousSum) setPreviousSummary(previousSum);

        // Monta o gráfico de linha
        const flow: CashFlowRow[] = last6Months.map((d, i) => ({
          month: monthLabel(d),
          receitas: parseFloat(allMonthSummaries[i]?.total_income || '0'),
          despesas: parseFloat(allMonthSummaries[i]?.total_expense || '0'),
        }));
        setCashFlow(flow);

        // Monta a pizza: agrupa despesas por categoria
        if (expensesData?.results) {
          const byCategory: Record<string, number> = {};
          for (const exp of expensesData.results) {
            const key = exp.category_name || 'Sem categoria';
            byCategory[key] = (byCategory[key] || 0) + parseFloat(exp.amount);
          }
          const sorted = Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 7); // Top 7 categorias
          const pie = sorted.map(([name, value], idx) => ({
            name,
            value,
            color: PIE_COLORS[idx % PIE_COLORS.length],
          }));
          setExpensesByCategory(pie);
        }

        if (goalsData?.results) setTopGoals(goalsData.results);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  // ── Cálculos derivados ──────────────────────────────────────────────────
  const balance = currentSummary ? parseFloat(currentSummary.balance) : 0;
  const incomeNow = currentSummary ? parseFloat(currentSummary.total_income) : 0;
  const expenseNow = currentSummary ? parseFloat(currentSummary.total_expense) : 0;
  const incomePrev = previousSummary ? parseFloat(previousSummary.total_income) : 0;
  const expensePrev = previousSummary ? parseFloat(previousSummary.total_expense) : 0;

  // Variação % vs mês anterior
  const incomeVar = incomePrev > 0 ? Math.round(((incomeNow - incomePrev) / incomePrev) * 100) : null;
  const expenseVar = expensePrev > 0 ? Math.round(((expenseNow - expensePrev) / expensePrev) * 100) : null;
  const balancePrev = incomePrev - expensePrev;
  const balanceVar = balancePrev !== 0 ? Math.round(((balance - balancePrev) / Math.abs(balancePrev)) * 100) : null;

  // Score financeiro simplificado:
  //  - Saldo positivo: até 60 pontos (proporcional)
  //  - Receita > Despesa: 20 pontos
  //  - Tem metas ativas: 10 pontos
  //  - Pelo menos 1 meta com >50% progresso: 10 pontos
  const score = (() => {
    let s = 0;
    if (balance > 0) s += Math.min(60, (balance / 5000) * 60);
    if (incomeNow > expenseNow) s += 20;
    if (topGoals.length > 0) s += 10;
    if (topGoals.some((g) => g.progress_percent >= 50)) s += 10;
    return Math.round(Math.min(100, s));
  })();

  const scoreLabel =
    score >= 80 ? 'Excelente' :
    score >= 60 ? 'Bom' :
    score >= 40 ? 'Regular' :
    score > 0 ? 'Atenção' : 'Sem dados';

  // Insights dinâmicos
  const insights: Insight[] = (() => {
    const list: Insight[] = [];

    if (incomeVar !== null && incomeVar > 0) {
      list.push({
        title: 'Receitas em crescimento',
        description: `Suas receitas aumentaram ${incomeVar}% comparado ao mês anterior.`,
        type: 'positive',
      });
    } else if (incomeVar !== null && incomeVar < 0) {
      list.push({
        title: 'Atenção às receitas',
        description: `Suas receitas caíram ${Math.abs(incomeVar)}% em relação ao mês anterior.`,
        type: 'negative',
      });
    }

    if (expenseVar !== null && expenseVar < 0) {
      list.push({
        title: 'Despesas reduzidas',
        description: `Você reduziu suas despesas em ${Math.abs(expenseVar)}% comparado ao mês anterior.`,
        type: 'positive',
      });
    } else if (expenseVar !== null && expenseVar > 10) {
      list.push({
        title: 'Despesas em alta',
        description: `Suas despesas subiram ${expenseVar}% em relação ao mês anterior.`,
        type: 'negative',
      });
    }

    // Meta próxima
    const nearGoal = topGoals.find((g) => g.progress_percent >= 80 && g.progress_percent < 100);
    if (nearGoal) {
      const missing = parseFloat(nearGoal.target_amount) - parseFloat(nearGoal.current_amount);
      list.push({
        title: 'Meta próxima',
        description: `Você está a apenas ${formatMoney(missing)} de atingir "${nearGoal.name}"!`,
        type: 'info',
      });
    }

    // Fallback se não tem nada
    if (list.length === 0) {
      list.push({
        title: 'Comece sua jornada',
        description: 'Registre suas primeiras transações para receber insights personalizados.',
        type: 'info',
      });
    }

    return list.slice(0, 3);
  })();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da sua situação financeira</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Saldo do Mês</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : formatMoney(balance)}
          </div>
          {balanceVar !== null && !loading && (
            <div className={`flex items-center gap-1 text-sm ${balanceVar >= 0 ? 'text-secondary' : 'text-destructive'}`}>
              {balanceVar >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{balanceVar >= 0 ? '+' : ''}{balanceVar}% vs mês anterior</span>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Receitas do Mês</span>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : formatMoney(incomeNow)}
          </div>
          {incomeVar !== null && !loading && (
            <div className={`flex items-center gap-1 text-sm ${incomeVar >= 0 ? 'text-secondary' : 'text-destructive'}`}>
              {incomeVar >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{incomeVar >= 0 ? '+' : ''}{incomeVar}% vs mês anterior</span>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Despesas do Mês</span>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-2">
            {loading ? '...' : formatMoney(expenseNow)}
          </div>
          {expenseVar !== null && !loading && (
            <div className={`flex items-center gap-1 text-sm ${expenseVar <= 0 ? 'text-secondary' : 'text-destructive'}`}>
              {expenseVar <= 0 ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              <span>{expenseVar >= 0 ? '+' : ''}{expenseVar}% vs mês anterior</span>
            </div>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Cash Flow */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl text-foreground mb-6">Fluxo de Caixa (6 meses)</h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatMoney(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="receitas" stroke="#6fbd6b" strokeWidth={2} name="Receitas" />
                <Line type="monotone" dataKey="despesas" stroke="#1e5a8e" strokeWidth={2} name="Despesas" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Expenses by Category */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="text-xl text-foreground mb-6">Despesas por Categoria</h3>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : expensesByCategory.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhuma despesa registrada este mês.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatMoney(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Financial Goals and Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Financial Goals */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl text-foreground">Metas Financeiras</h3>
            <Link to="/goals">
              <Button variant="outline" size="sm">Ver todas</Button>
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="text-muted-foreground p-4 text-center">Carregando...</div>
            ) : topGoals.length === 0 ? (
              <div className="text-muted-foreground p-4 text-center">
                Nenhuma meta ativa.{' '}
                <Link to="/goals/new" className="text-primary hover:underline">Criar a primeira</Link>
              </div>
            ) : (
              topGoals.map((goal) => {
                const current = parseFloat(goal.current_amount);
                const target = parseFloat(goal.target_amount);
                const missing = target - current;
                return (
                  <div key={goal.id} className="bg-accent rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-foreground">{goal.name}</span>
                      <span className="text-sm text-muted-foreground">{goal.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 mb-2">
                      <div
                        className="bg-gradient-to-r from-primary to-secondary h-2.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, goal.progress_percent)}%` }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatMoney(current)} de {formatMoney(target)}
                      </span>
                      <span className="text-primary">
                        Faltam {formatMoney(missing)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Financial Score */}
        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl border border-primary/20 p-6">
          <h3 className="text-xl text-foreground mb-6">Score Financeiro</h3>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="none" className="text-muted" />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="url(#dashboard-score-gradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(score / 100) * 440} 440`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="dashboard-score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6fbd6b" />
                    <stop offset="100%" stopColor="#1e5a8e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl text-foreground mb-1">{loading ? '...' : score}</div>
                  <div className="text-sm text-muted-foreground">{loading ? '' : scoreLabel}</div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-center text-muted-foreground">
            {loading ? '' :
              score >= 80 ? 'Seu score financeiro está ótimo! Continue mantendo o controle.' :
              score >= 60 ? 'Você está no caminho certo. Continue acompanhando seus gastos.' :
              score >= 40 ? 'Há espaço pra melhorar. Veja os insights abaixo.' :
              score > 0 ? 'Atenção: equilibre receitas e despesas pra melhorar seu score.' :
              'Comece registrando transações pra calcular seu score.'}
          </p>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-xl text-foreground mb-4">Insights Financeiros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                insight.type === 'positive' ? 'bg-secondary/5 border-secondary/20' :
                insight.type === 'negative' ? 'bg-destructive/5 border-destructive/20' :
                'bg-primary/5 border-primary/20'
              }`}
            >
              <h4 className="text-foreground mb-2">{insight.title}</h4>
              <p className="text-sm text-muted-foreground">{insight.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}