"""
apps/finance/serializers.py
"""
from rest_framework import serializers
from .models import Category, Income, Expense


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "type", "icon", "color", "created_at")
        read_only_fields = ("id", "created_at")

    def create(self, validated_data):
        # Associa automaticamente ao usuário autenticado
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class IncomeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Income
        fields = (
            "id", "amount", "date", "description",
            "category", "category_name",
            "ai_tags", "created_at",
        )
        read_only_fields = ("id", "ai_tags", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id", "amount", "date", "description",
            "category", "category_name",
            "is_recurring", "ai_tags", "created_at",
        )
        read_only_fields = ("id", "ai_tags", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class SummarySerializer(serializers.Serializer):
    """
    Serializer de somente leitura para o endpoint de resumo financeiro.
    Preparado para futura integração com análise por IA.
    """
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
