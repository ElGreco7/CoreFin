"""
apps/finance/serializers.py

CHANGELOG:
  - IncomeSerializer e ExpenseSerializer incluem `payment_method`.
  - Novo PaymentMethodSummarySerializer para o fechamento de caixa.
"""
from rest_framework import serializers
from .models import Category, Income, Expense


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "type", "icon", "color", "created_at")
        read_only_fields = ("id", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class IncomeSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    payment_method_display = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )

    class Meta:
        model = Income
        fields = (
            "id", "amount", "date", "description",
            "category", "category_name",
            "payment_method", "payment_method_display",
            "ai_tags", "created_at",
        )
        read_only_fields = ("id", "ai_tags", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    payment_method_display = serializers.CharField(
        source="get_payment_method_display", read_only=True
    )

    class Meta:
        model = Expense
        fields = (
            "id", "amount", "date", "description",
            "category", "category_name",
            "payment_method", "payment_method_display",
            "is_recurring", "ai_tags", "created_at",
        )
        read_only_fields = ("id", "ai_tags", "created_at")

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class SummarySerializer(serializers.Serializer):
    """Resumo mensal de receitas, despesas e saldo."""
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    period_start = serializers.DateField()
    period_end = serializers.DateField()


# ── Fechamento de caixa ────────────────────────────────────────────────────

class PaymentMethodBreakdownSerializer(serializers.Serializer):
    """Um item do agrupamento por forma de pagamento."""
    payment_method = serializers.CharField()
    payment_method_display = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    count = serializers.IntegerField()


class CashCloseSerializer(serializers.Serializer):
    """
    Resposta do endpoint de fechamento de caixa.
    Agrupa receitas e despesas por forma de pagamento no período.
    """
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    total_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2)
    income_by_payment = PaymentMethodBreakdownSerializer(many=True)
    expense_by_payment = PaymentMethodBreakdownSerializer(many=True)
