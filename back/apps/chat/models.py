"""
apps/chat/models.py
Modelos: Conversation (conversa), Message (mensagem dentro da conversa).
"""
from django.db import models
from django.conf import settings
from apps.core.models import BaseModel


class Conversation(BaseModel):
    """
    Conversa do usuário com o CoreChat (IA).
    Cada conversa tem várias mensagens.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )

    title = models.CharField(max_length=200, default="Nova conversa")

    # Última mensagem (desnormalizado pra mostrar na sidebar sem JOIN)
    last_message_preview = models.CharField(max_length=255, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    # Contador de mensagens (atualizado pela aplicação)
    message_count = models.IntegerField(default=0)

    # Permite "arquivar" sem deletar
    is_archived = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Conversa"
        verbose_name_plural = "Conversas"
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class Message(BaseModel):
    """
    Mensagem individual dentro de uma conversa.
    Pode ser do usuário ou do assistente (IA).
    """

    class Sender(models.TextChoices):
        USER = "user", "Usuário"
        ASSISTANT = "assistant", "Assistente"

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    sender = models.CharField(max_length=10, choices=Sender.choices)
    content = models.TextField()

    # Metadados úteis: tokens consumidos, modelo usado, transações citadas, etc.
    metadata = models.JSONField(default=dict, blank=True)

    # True enquanto a IA ainda está gerando a resposta
    is_streaming = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Mensagem"
        verbose_name_plural = "Mensagens"
        ordering = ["created_at"]

    def __str__(self):
        return f"[{self.sender}] {self.content[:50]}"