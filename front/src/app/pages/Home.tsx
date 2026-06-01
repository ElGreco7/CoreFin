import { Link } from 'react-router';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Target,
  GraduationCap,
  TrendingUp,
  Clock,
  Sparkles,
  Plus,
  Calculator,
} from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { finance, Income, Expense, Summary } from '../services/finance';

const quickAccessCards = [
  {
    title: 'Dashboard',
    description: 'Visão geral das suas finanças',
    icon: LayoutDashboard,
    path: '/dashboard',
    color: 'from-primary to-primary/80',
  },
  {
    title: 'Transações',
    description: 'Gerencie receitas e despesas',
    icon: ArrowLeftRight,
    path: '/transactions',
    color: 'from-secondary to-secondary/80',
  },
  {
    title: 'Fechamento de Caixa',
    description: 'Apure valores por forma de pagamento',
    icon: Calculator,
    path: '/cash-close',
    color: 'from-primary to-primary/80',
  },
  {
    title: 'Relatórios',
    description: 'Análises e insights financeiros',
    icon: FileText,
    path: '/reports',
    color: 'from-secondary to-secondary/80',
  },
  {
    title: 'Metas Financeiras',
    description: 'Acompanhe seus objetivos',
    icon: Target,
    path: '/goals',
    color: 'from-primary to-primary/80',
  },
  {
    title: 'Educação Financeira',
    description: 'Aprenda a gerenciar melhor',
    icon: GraduationCap,
    path: '/education',
    color: 'from-secondary to-secondary/80',
  },
];

function formatMoney(value: string | number): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

type Movement = (Income | Expense) & { _type: 'income' | 'expense' };

export function Home() {
  const { user } = useAuth();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [recentMovements, setRecentMovements] = useState<Movement[]>([]);
  const [incomeCount, setIncomeCount] = useState(0);
  const [expenseCount, setExpenseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isNewUser =
    !loading &&
    incomeCount === 0 &&
    expenseCount === 0 &&
    user?.created_at &&
    Date.now() - new Date(user.created_at).getTime() < 24 * 60 * 60 * 1000;

  const firstName = user?.name?.split(' ')[0] || 'usuário';

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [summaryData, incomesData, expensesData] = await Promise.all([
          finance.getSummary().catch(() => null),
          finance.listIncomes({ ordering: '-date', page_size: 5 }).catch(() => null),
          finance.listExpenses({ ordering: '-date', page_size: 5 }).catch(() => null),
        ]);

        if (summaryData) setSummary(summaryData);

        const incomes: Movement[] = incomesData?.results.map((i) => ({ ...i, _type: 'income' as const })) || [];
        const expenses: Movement[] = expensesData?.results.map((e) => ({ ...e, _type: 'expense' as const })) || [];

        const allMovements = [...incomes, ...expenses]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 5);

        setRecentMovements(allMovements);
        setIncomeCount(incomesData?.count || 0);
        setExpenseCount(expensesData?.count || 0);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl text-foreground mb-2">
            Olá, {firstName}!{isNewUser && ' 👋'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isNewUser
              ? 'Bem-vindo ao CoreFin! Comece registrando sua primeira transação.'
              : 'Bem-vindo de volta ao CoreFin. Aqui está um resumo da sua situação financeira.'}
          </p>
        </div>
        <Link to="/transactions/new">
          <Button variant="primary" className="gap-2">
            <Plus className="w-5 h-5" />
            Nova Transação
          </Button>
        </Link>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Saldo Atual (Mês)</span>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-1">{loading ? '...' : formatMoney(summary?.balance || 0)}</div>
          <div className="text-sm text-muted-foreground">{loading ? '' : 'Receitas - Despesas'}</div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Receitas (Mês)</span>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-1">{loading ? '...' : formatMoney(summary?.total_income || 0)}</div>
          <div className="text-sm text-secondary">
            {loading ? '' : `${incomeCount} ${incomeCount === 1 ? 'transação' : 'transações'}`}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground">Despesas (Mês)</span>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <div className="text-3xl text-foreground mb-1">{loading ? '...' : formatMoney(summary?.total_expense || 0)}</div>
          <div className="text-sm text-destructive">
            {loading ? '' : `${expenseCount} ${expenseCount === 1 ? 'transação' : 'transações'}`}
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="mb-8">
        <h2 className="text-2xl text-foreground mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickAccessCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.path}
                to={card.path}
                className="group bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl text-foreground mb-2 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                <p className="text-muted-foreground text-sm">{card.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-xl text-foreground">Continue de onde parou</h3>
          </div>
          <div className="space-y-3">
            <Link to="/goals/new" className="block p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-foreground mb-1">Criar nova meta financeira</div>
                  <div className="text-sm text-muted-foreground">Defina seus objetivos</div>
                </div>
                <div className="text-primary">→</div>
              </div>
            </Link>
            <Link to="/education" className="block p-4 bg-accent rounded-lg hover:bg-accent/80 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-foreground mb-1">Explorar Educação Financeira</div>
                  <div className="text-sm text-muted-foreground">Trilhas e conteúdos disponíveis</div>
                </div>
                <div className="text-primary">→</div>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl text-foreground">Últimas Movimentações</h3>
            <Link to="/transactions" className="text-primary text-sm hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-muted-foreground p-4 text-center">Carregando...</div>
            ) : recentMovements.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 text-center">
                Nenhuma transação ainda.{' '}
                <Link to="/transactions/new" className="text-primary hover:underline">Criar a primeira</Link>
              </div>
            ) : (
              recentMovements.map((m) => (
                <div key={`${m._type}-${m.id}`} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div className="flex-1">
                    <div className="text-foreground mb-1">{m.description || (m._type === 'income' ? 'Receita' : 'Despesa')}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(m.date)}</div>
                  </div>
                  <div className={`font-medium ${m._type === 'income' ? 'text-secondary' : 'text-destructive'}`}>
                    {m._type === 'income' ? '+' : '-'}{formatMoney(m.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl text-foreground">Metas em Andamento</h3>
            <Link to="/goals" className="text-primary text-sm hover:underline">Ver todas</Link>
          </div>
          <div className="text-sm text-muted-foreground p-4 text-center">
            <Link to="/goals" className="text-primary hover:underline">Acessar suas metas financeiras</Link>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl border border-primary/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg text-foreground">CoreChat</h3>
              <p className="text-sm text-muted-foreground">Assistente financeiro</p>
            </div>
          </div>
          <p className="text-foreground mb-4">
            {isNewUser
              ? 'Em breve você terá insights personalizados sobre suas finanças. Por enquanto, registre suas transações para começar.'
              : 'Acesse o CoreChat para tirar dúvidas sobre suas finanças e receber sugestões personalizadas.'}
          </p>
          <Link to="/chat" className="text-primary hover:underline text-sm">Conversar com CoreChat →</Link>
        </div>
      </div>
    </div>
  );
}
