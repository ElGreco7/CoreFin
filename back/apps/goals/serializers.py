"""
apps/goals/serializers.py
Serializers convertem objetos Python (Goal, Contribution) em JSON e vice-versa.
"""
from rest_framework import serializers
from .models import Goal, Contribution


class ContributionSerializer(serializers.ModelSerializer):
    """
    Serializer pros aportes feitos numa meta.
    Usado pra listar histórico de aportes e pra fazer um aporte novo.
    """

    class Meta:
        model = Contribution
        fields = [
            "id",
            "goal",
            "amount",
            "date",
            "notes",
            "is_automatic",
            "created_at",
        ]
        # Campos que o cliente NÃO pode setar — vêm do servidor
        read_only_fields = ["id", "is_automatic", "created_at"]


class GoalSerializer(serializers.ModelSerializer):
    """
    Serializer principal das metas.
    Usado para listar, criar, editar e ver detalhes.
    """

    # Campo calculado — vem da @property progress_percent do model
    progress_percent = serializers.IntegerField(read_only=True)

    # Mostra o display name das choices ao invés do valor cru
    # Ex: 'emergency' → 'Reserva de Emergência'
    category_display = serializers.CharField(
        source="get_category_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Goal
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_display",
            "target_amount",
            "current_amount",
            "deadline",
            "status",
            "status_display",
            "auto_contribute",
            "monthly_contribution",
            "icon",
            "color",
            "progress_percent",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        # O usuário não escolhe o ID, current_amount (vem dos aportes) nem datas
        read_only_fields = [
            "id",
            "current_amount",
            "completed_at",
            "created_at",
            "updated_at",
        ]