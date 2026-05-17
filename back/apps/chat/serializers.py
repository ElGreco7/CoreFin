"""
apps/chat/serializers.py
"""
from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    """Serializer das mensagens individuais dentro de uma conversa."""

    sender_display = serializers.CharField(
        source="get_sender_display",
        read_only=True,
    )

    class Meta:
        model = Message
        fields = [
            "id",
            "sender",
            "sender_display",
            "content",
            "metadata",
            "is_streaming",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "sender_display",
            "metadata",
            "is_streaming",
            "created_at",
        ]


class ConversationListSerializer(serializers.ModelSerializer):
    """
    Versão LEVE da conversa — usada pra listar na sidebar.
    Não inclui as mensagens (seriam pesadas demais carregar todas).
    """

    class Meta:
        model = Conversation
        fields = [
            "id",
            "title",
            "last_message_preview",
            "last_message_at",
            "message_count",
            "is_archived",
            "created_at",
            "updated_at",
        ]


class ConversationDetailSerializer(serializers.ModelSerializer):
    """
    Versão COMPLETA da conversa — usada quando o usuário clica numa específica.
    Inclui todas as mensagens.
    """

    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id",
            "title",
            "last_message_preview",
            "last_message_at",
            "message_count",
            "is_archived",
            "messages",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "last_message_preview",
            "last_message_at",
            "message_count",
            "messages",
            "created_at",
            "updated_at",
        ]


class SendMessageSerializer(serializers.Serializer):
    """
    Serializer só pra validar a entrada do endpoint send_message.
    Não está vinculado a um model — é só pra validação.
    """

    content = serializers.CharField(min_length=1, max_length=5000)