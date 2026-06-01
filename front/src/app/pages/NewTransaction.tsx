// src/app/pages/NewTransaction.tsx
//
// CHANGELOG:
//  - Adicionado campo `payment_method` (Dinheiro, PIX, Crédito, Débito).
//  - Campo incluso no payload de createIncome / createExpense.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { finance, Category, PAYMENT_METHOD_OPTIONS, PaymentMethod } from '../services/finance';
import { ApiError } from '../services/api';

type TransactionType = 'income' | 'expense';

export function NewTransaction() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    type:           'income' as TransactionType,
    description:    '',
    amount:         '',
    category:       '' as string,
    date:           new Date().toISOString().split('T')[0],
    payment_method: 'dinheiro' as PaymentMethod,
    notes:          '',
  });

  const [categories, setCategories]       = useState<Category[]>([]);
  const [saving, setSaving]               = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    finance.listCategories()
      .then((data) => setCategories(data.results))
      .catch(() => setCategories([]));
  }, []);

  const filteredCategories = categories.filter((c) => c.type === formData.type);

  function handleTypeChange(type: TransactionType) {
    setFormData({ ...formData, type, category: '' });
    setShowNewCategory(false);
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const created = await finance.createCategory({ name: newCategoryName.trim(), type: formData.type });
      setCategories((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, category: String(created.id) }));
      setNewCategoryName('');
      setShowNewCategory(false);
    } catch {
      alert('Erro ao criar categoria. Tente novamente.');
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Informe um valor maior que zero.');
      return;
    }

    setSaving(true);

    const fullDescription = formData.notes
      ? `${formData.description} — ${formData.notes}`
      : formData.description;

    const payload = {
      amount:         formData.amount,
      date:           formData.date,
      description:    fullDescription,
      category:       formData.category ? parseInt(formData.category) : null,
      payment_method: formData.payment_method,
    };

    try {
      if (formData.type === 'income') {
        await finance.createIncome(payload);
      } else {
        await finance.createExpense(payload);
      }
      navigate('/transactions');
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data || {};
        const firstError =
          data.amount?.[0] || data.date?.[0] || data.description?.[0] ||
          data.payment_method?.[0] || data.detail ||
          'Erro ao salvar a transação. Verifique os dados.';
        setErrorMsg(firstError);
      } else {
        setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar para Transações
        </button>
        <h1 className="text-3xl text-foreground mb-2">Nova Transação</h1>
        <p className="text-muted-foreground">Registre uma nova receita ou despesa</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-8">
        {/* Tipo */}
        <div className="mb-6">
          <label className="block text-foreground mb-3">Tipo de Transação</label>
          <div className="grid grid-cols-2 gap-4">
            {(['income', 'expense'] as TransactionType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleTypeChange(t)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.type === t
                    ? t === 'income'
                      ? 'border-secondary bg-secondary/10 text-secondary'
                      : 'border-destructive bg-destructive/10 text-destructive'
                    : 'border-border bg-accent text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">{t === 'income' ? '↑' : '↓'}</div>
                  <div>{t === 'income' ? 'Receita' : 'Despesa'}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Descrição */}
        <div className="mb-6">
          <label htmlFor="description" className="block text-foreground mb-2">Descrição *</label>
          <input
            id="description" type="text" required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Ex: Venda de produto, Pagamento de fornecedor..."
            className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={saving}
          />
        </div>

        {/* Valor e Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="amount" className="block text-foreground mb-2">Valor (R$) *</label>
            <input
              id="amount" type="number" required step="0.01" min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0,00"
              className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-foreground mb-2">Data *</label>
            <input
              id="date" type="date" required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={saving}
            />
          </div>
        </div>

        {/* Forma de pagamento */}
        <div className="mb-6">
          <label className="block text-foreground mb-3">Forma de Pagamento *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PAYMENT_METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: opt.value })}
                disabled={saving}
                className={`py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.payment_method === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-accent text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Categoria */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="category" className="block text-foreground">Categoria</label>
            <button
              type="button"
              onClick={() => setShowNewCategory(!showNewCategory)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
              disabled={saving}
            >
              <Plus className="w-3 h-3" />
              Nova categoria
            </button>
          </div>
          {!showNewCategory ? (
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              disabled={saving}
            >
              <option value="">Sem categoria</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={`Nome da nova categoria de ${formData.type === 'income' ? 'receita' : 'despesa'}`}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={creatingCategory}
              />
              <Button type="button" variant="primary" onClick={handleCreateCategory}
                disabled={creatingCategory || !newCategoryName.trim()}>
                {creatingCategory ? '...' : 'Criar'}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}
                disabled={creatingCategory}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="mb-8">
          <label htmlFor="notes" className="block text-foreground mb-2">Observações</label>
          <textarea
            id="notes" rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Detalhes adicionais sobre esta transação..."
            className="w-full px-4 py-2.5 bg-accent border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={saving}
          />
        </div>

        {errorMsg && (
          <div className="mb-6 bg-destructive/10 border border-destructive/40 text-destructive px-4 py-3 rounded-lg text-sm">
            {errorMsg}
          </div>
        )}

        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/transactions')}
            className="gap-2" disabled={saving}>
            <X className="w-5 h-5" /> Cancelar
          </Button>
          <Button type="submit" variant="primary" className="gap-2" disabled={saving}>
            <Save className="w-5 h-5" />
            {saving ? 'Salvando...' : 'Salvar Transação'}
          </Button>
        </div>
      </form>
    </div>
  );
}
