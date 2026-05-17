"""
apps/analytics/serializers.py
"""
from rest_framework import serializers
from .models import Event


class EventSerializer(serializers.ModelSerializer):
    """Serializer completo do evento — usado pra LEITURA (admin)."""

    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "user",
            "user_email",
            "event_type",
            "category",
            "related_type",
            "related_id",
            "properties",
            "session_id",
            "ip_address",
            "user_agent",
            "created_at",
        ]
        read_only_fields = ["id", "user", "user_email", "ip_address", "user_agent", "created_at"]


class TrackEventSerializer(serializers.Serializer):
    """
    Serializer simplificado pra REGISTRAR um evento via API.
    Não inclui campos sensíveis (user, ip, user_agent — vêm do request).
    """

    event_type = serializers.CharField(max_length=50)
    category = serializers.CharField(max_length=30, required=False, allow_blank=True)
    related_type = serializers.CharField(max_length=50, required=False, allow_blank=True)
    related_id = serializers.IntegerField(required=False, allow_null=True)
    properties = serializers.JSONField(required=False, default=dict)
    session_id = serializers.CharField(max_length=100, required=False, allow_blank=True)