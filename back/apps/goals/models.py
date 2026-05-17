"""
apps/goals/models.py
Modelos: Goal (meta financeira), Contribution (aporte na meta).
"""
from django.db import models
from django.conf import settings
from apps.core.models import BaseModel


class Goal(BaseModel):
    """
    Meta financeira do usuário.
    Ex: Reserva de Emergência, Equipamento Novo, Expansão do Negócio.
    """

    class Category(models.TextChoices):
        EMERGENCY = "emergency", "Reserva de Emergência"
        INVESTMENT = "investment", "Investimento"
        EXPANSION = "expansion", "Expansão"
        EQUIPMENT = "equipment", "Equipamentos"
        TRAINING = "training", "Treinamento"
        OTHER = "other", "Outro"

    class Status(models.TextChoices):
        ACTIVE = "active", "Ativa"
        COMPLETED = "completed", "Concluída"
        PAUSED = "paused", "Pausada"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="goals",
    )

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
    )

    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    deadline = models.DateField(null=True, blank=True)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    # Contribuição automática mensal
    auto_contribute = models.BooleanField(default=False)
    monthly_contribution = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    # Visual
    icon = models.CharField(max_length=10, default="🎯")
    color = models.CharField(max_length=7, blank=True)  # hex: #RRGGBB

    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Meta"
        verbose_name_plural = "Metas"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} — {self.user.email}"

    @property
    def progress_percent(self):
        """Calcula % de progresso (0 a 100)."""
        if self.target_amount == 0:
            return 0
        return min(int((self.current_amount / self.target_amount) * 100), 100)


class Contribution(BaseModel):
    """
    Aporte feito numa meta.
    Cada vez que o usuário coloca dinheiro na meta, cria um registro aqui.
    """

    goal = models.ForeignKey(
        Goal,
        on_delete=models.CASCADE,
        related_name="contributions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="goal_contributions",
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField(auto_now_add=False)
    notes = models.CharField(max_length=255, blank=True)

    # True = gerado pelo sistema (auto_contribute), False = manual
    is_automatic = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Aporte"
        verbose_name_plural = "Aportes"
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"R$ {self.amount} em {self.goal.name}"