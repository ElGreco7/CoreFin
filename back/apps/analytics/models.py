"""
apps/analytics/models.py
Modelo: Event — rastreamento de eventos da plataforma.
"""
from django.db import models
from django.conf import settings


class Event(models.Model):
    """
    Evento rastreado na plataforma.
    Cada interação relevante do usuário gera um registro aqui:
    page views, logins, criação de transação, conclusão de conteúdo, etc.
    """

    # Quem gerou o evento. NULL = visitante anônimo (não logado)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )

    # Tipo do evento (padronize: 'page_view', 'login', 'transaction_created', etc.)
    event_type = models.CharField(max_length=50)

    # Categoria pra agrupar: 'navigation', 'finance', 'goals', 'education', 'auth'
    category = models.CharField(max_length=30, blank=True)

    # Referência genérica ao objeto envolvido (mesmo padrão de notifications)
    related_type = models.CharField(max_length=50, blank=True)
    related_id = models.BigIntegerField(null=True, blank=True)

    # Dados adicionais flexíveis (page, duration_seconds, referrer, etc.)
    properties = models.JSONField(default=dict, blank=True)

    # Contexto técnico
    session_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Evento"
        verbose_name_plural = "Eventos"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["event_type", "-created_at"]),
            models.Index(fields=["category"]),
        ]

    def __str__(self):
        who = self.user.email if self.user else "anônimo"
        return f"{self.event_type} - {who}"