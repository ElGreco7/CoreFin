"""
apps/finance/models.py
Módulo financeiro: Category, Income, Expense.
Todos os registros são isolados por usuário (multi-tenant por linha).

CHANGELOG:
  - Adicionado campo `payment_method` em TransactionBase (PIX, Dinheiro, Crédito, Débito).
"""
from django.db import models
from django.conf import settings

from apps.core.models import BaseModel


class Category(BaseModel):
    """
    Categoria de receitas/despesas.
    Cada usuário tem suas próprias categorias.
    """

    class CategoryType(models.TextChoices):
        INCOME = "income", "Receita"
        EXPENSE = "expense", "Despesa"
        BOTH = "both", "Ambos"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=100)
    type = models.CharField(
        max_length=10,
        choices=CategoryType.choices,
        default=CategoryType.EXPENSE,
    )
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, blank=True)

    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"
        unique_together = (("user", "name", "type"),)
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class TransactionBase(BaseModel):
    """
    Model abstrato compartilhado entre Income e Expense.
    """

    class PaymentMethod(models.TextChoices):
        DINHEIRO = "dinheiro", "Dinheiro"
        PIX      = "pix",      "PIX"
        CREDITO  = "credito",  "Crédito"
        DEBITO   = "debito",   "Débito"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    description = models.CharField(max_length=255, blank=True)

    # Novo campo — forma de pagamento
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.DINHEIRO,
        blank=True,
        verbose_name="Forma de pagamento",
    )

    # Campo extra pensando em features de IA
    ai_tags = models.JSONField(default=list, blank=True)

    class Meta:
        abstract = True
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.__class__.__name__} R$ {self.amount} — {self.date}"


class Income(TransactionBase):
    """Receita do usuário."""

    class Meta(TransactionBase.Meta):
        verbose_name = "Receita"
        verbose_name_plural = "Receitas"
        default_related_name = "incomes"


class Expense(TransactionBase):
    """Despesa do usuário."""
    is_recurring = models.BooleanField(default=False)

    class Meta(TransactionBase.Meta):
        verbose_name = "Despesa"
        verbose_name_plural = "Despesas"
        default_related_name = "expenses"
