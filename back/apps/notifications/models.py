"""
apps/notifications/models.py
Modelo: Notification — central de notificações do usuário.
"""
from django.db import models
from django.conf import settings
from apps.core.models import BaseModel


class Notification(BaseModel):
    """
    Notificação enviada pra um usuário.
    Pode ser informativa, de alerta, sucesso ou relacionada a metas.
    """

    class Type(models.TextChoices):
        INFO = "info", "Informação"
        WARNING = "warning", "Alerta"
        SUCCESS = "success", "Sucesso"
        GOAL = "goal", "Meta"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )

    type = models.CharField(max_length=15, choices=Type.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()

    # Link interno pra onde redirecionar quando clicar (ex: "/goals/5")
    action_url = models.CharField(max_length=500, blank=True)

    # Referência genérica ao objeto relacionado (polimórfico)
    # Ex: type='goal' → related_type='goal', related_id=5
    related_type = models.CharField(max_length=50, blank=True)
    related_id = models.BigIntegerField(null=True, blank=True)

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ["-created_at"]
        indexes = [
            # Otimiza a query "notificações não lidas do usuário, mais recentes primeiro"
            models.Index(fields=["user", "is_read", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.type}] {self.title} ({self.user.email})"