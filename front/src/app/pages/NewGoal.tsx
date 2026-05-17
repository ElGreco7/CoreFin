import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save, X, Target } from 'lucide-react';
import { Button } from '../components/Button';
import { goals as goalsService, GoalCategory } from '../services/goals';
import { ApiError } from '../services/api';

const categories: { value: GoalCategory; label: string; icon: string }[] = [
  { value: 'emergency', label: 'Reserva de Emergência', icon: '🛡️' },
  { value: 'investment', label: 'Investimento', icon: '📈' },
  { value: 'expansion', label: 'Expansão', icon: '🚀' },
  { value: 'equipment', label: 'Equipamentos', icon: '💻' },
  { value: 'training', label: 'Treinamento', icon: '📚' },
  { value: 'other', label: 'Outro', icon: '🎯' },
];

export function NewGoal() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    targetAmount: '',
    currentAmount: '0',
    deadline: '',
    category: '' as GoalCategory | '',
    autoContribute: false,
    monthlyContribution: '',
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    // Validações
    if (!formData.category) {
      setErrorMsg('Selecione uma categoria pra meta.');
      return;
    }

    const target = parseFloat(formData.targetAmount);
    if (isNaN(target) || target <= 0) {
      setErrorMsg('Informe um valor de meta maior que zero.');
      return;
    }

    const current = parseFloat(formData.currentAmount || '0');
    if (current < 0) {
      setErrorMsg('O valor atual não pode ser negativo.');
      return;
    }

    if (current > target) {
      setErrorMsg('O valor atual não pode ser maior que o valor da meta.');
      return;
    }

    // Se prazo definido, tem que ser no futuro
    if (formData.deadline) {
      const today = new Date().toISOString().slice(0, 10);
      if (formData.deadline < today) {
        setErrorMsg('O prazo precisa ser uma data futura.');
        return;
      }
    }

    // Validação de aporte automático
    if (formData.autoContribute) {
      const monthly = parseFloat(formData.monthlyContribution);
      if (isNaN(monthly) || monthly <= 0) {
        setErrorMsg('Informe um valor mensal pra contribuição automática.');
        return;
      }
    }

    setSaving(true);

    // Monta o payload
    const payload: any = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      target_amount: formData.targetAmount,
      current_amount: formData.currentAmount || '0',
      deadline: formData.deadline || null,
      auto_contribute: formData.autoContribute,
      monthly_contribution: formData.autoContribute
        ? formData.monthlyContribution
        : '0',
    };

    try {
      await goalsService.createGoal(payload);
      // Sucesso: volta pra lista
      navigate('/goals');
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data || {};
        const firstError =
          data.name?.[0] ||
          data.target_amount?.[0] ||
          data.category?.[0] ||
          data.deadline?.[0] ||
          data.detail ||
          'Erro ao criar meta. Verifique os dados.';
        setErrorMsg(firstError);
      } else {
        setErrorMsg('Não foi possível conectar ao servidor.');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate('/goals');
  }

  // Hoje em formato YYYY-MM-DD pra setar como mínimo
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          disabled={saving}
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para Metas
        </button>
        <h1 className="text-3xl text-foreground mb-2">Nova Meta Financeira</h1>
        <p className="text-muted-foreground">Defina um objetivo financeiro e acompanhe seu progresso</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-8">
        {/* Goal Name */}
        <div className="mb-6">
          <label htmlFor="name" className="block text-foreground mb-2">
            Nome da Meta *
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Ex: Reserva de Emergência, Equipamento Novo..."
            className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={saving}
          />
        </div>

        {/* Description */}
        <div className="mb-6">
          <label htmlFor="description" className="block text-foreground mb-2">
            Descrição
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descreva o objetivo desta meta financeira..."
            className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={saving}
          />
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="block text-foreground mb-3">Categoria *</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat.value })}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.category === cat.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-accent text-muted-foreground hover:border-primary/50'
                }`}
                disabled={saving}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{cat.icon}</div>
                  <div className="text-sm">{cat.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Target Amount and Deadline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="targetAmount" className="block text-foreground mb-2">
              Valor da Meta (R$) *
            </label>
            <input
              id="targetAmount"
              type="number"
              required
              step="0.01"
              min="0.01"
              value={formData.targetAmount}
              onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
              placeholder="0,00"
              className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
          </div>

          <div>
            <label htmlFor="deadline" className="block text-foreground mb-2">
              Prazo (opcional)
            </label>
            <input
              id="deadline"
              type="date"
              min={todayStr}
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
          </div>
        </div>

        {/* Current Amount */}
        <div className="mb-6">
          <label htmlFor="currentAmount" className="block text-foreground mb-2">
            Valor Atual (R$)
          </label>
          <input
            id="currentAmount"
            type="number"
            step="0.01"
            min="0"
            value={formData.currentAmount}
            onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
            placeholder="0,00"
            className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={saving}
          />
          <p className="text-sm text-muted-foreground mt-1">
            Se você já possui algum valor economizado para esta meta
          </p>
        </div>

        {/* Auto Contribute */}
        <div className="mb-6 p-4 bg-accent rounded-lg border border-border">
          <div className="flex items-start gap-3">
            <input
              id="autoContribute"
              type="checkbox"
              checked={formData.autoContribute}
              onChange={(e) => setFormData({ ...formData, autoContribute: e.target.checked })}
              className="mt-1 w-4 h-4 text-primary bg-accent border-border rounded focus:ring-2 focus:ring-primary cursor-pointer"
              disabled={saving}
            />
            <div className="flex-1">
              <label htmlFor="autoContribute" className="text-foreground cursor-pointer">
                Contribuição Automática
              </label>
              <p className="text-sm text-muted-foreground mt-1">
                Marque pra registrar uma contribuição mensal recorrente
                <br />
                <span className="text-xs">(Apenas registra a intenção — a contribuição em si é manual via botão "Aportar")</span>
              </p>
            </div>
          </div>

          {formData.autoContribute && (
            <div className="mt-4">
              <label htmlFor="monthlyContribution" className="block text-foreground mb-2">
                Contribuição Mensal (R$) *
              </label>
              <input
                id="monthlyContribution"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.monthlyContribution}
                onChange={(e) => setFormData({ ...formData, monthlyContribution: e.target.value })}
                placeholder="0,00"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={saving}
              />
            </div>
          )}
        </div>

        {/* Preview */}
        {formData.targetAmount && formData.category && (
          <div className="mb-8 p-6 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg text-foreground mb-2">Resumo da Meta</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Valor da Meta:</span>
                    <div className="text-foreground">
                      R$ {parseFloat(formData.targetAmount || '0').toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor Inicial:</span>
                    <div className="text-foreground">
                      R$ {parseFloat(formData.currentAmount || '0').toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  {formData.autoContribute && formData.monthlyContribution && (
                    <div>
                      <span className="text-muted-foreground">Contribuição Mensal:</span>
                      <div className="text-secondary">
                        R$ {parseFloat(formData.monthlyContribution).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  )}
                  {formData.deadline && (
                    <div>
                      <span className="text-muted-foreground">Prazo:</span>
                      <div className="text-foreground">
                        {(() => {
                          const [y, m, d] = formData.deadline.split('-');
                          return `${d}/${m}/${y}`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Erro */}
        {errorMsg && (
          <div className="mb-6 bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="gap-2"
            disabled={saving}
          >
            <X className="w-5 h-5" />
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="gap-2" disabled={saving}>
            <Save className="w-5 h-5" />
            {saving ? 'Criando...' : 'Criar Meta'}
          </Button>
        </div>
      </form>
    </div>
  );
}