"""
apps/notifications/serializers.py
"""
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer das notificações do usuário.
    Permite listar, criar (admin/sistema), marcar como lida e apagar.
    """

    type_display = serializers.CharField(
        source="get_type_display",
        read_only=True,
    )

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "type_display",
            "title",
            "message",
            "action_url",
            "related_type",
            "related_id",
            "is_read",
            "read_at",
            "created_at",
        ]
        # user é preenchido automaticamente em perform_create.
        # read_at, created_at e type_display são computados pelo sistema.
        read_only_fields = [
            "id",
            "type_display",
            "read_at",
            "created_at",
        ]