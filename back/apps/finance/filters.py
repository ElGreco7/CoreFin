"""
apps/finance/filters.py
Filtros via django-filter para Income e Expense.
"""
import django_filters
from .models import Income, Expense


class TransactionFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_to   = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    category  = django_filters.NumberFilter(field_name="category__id")
    min_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="lte")


class IncomeFilter(TransactionFilter):
    class Meta:
        model = Income
        fields = ["date_from", "date_to", "category", "min_amount", "max_amount"]


class ExpenseFilter(TransactionFilter):
    class Meta:
        model = Expense
        fields = ["date_from", "date_to", "category", "min_amount", "max_amount", "is_recurring"]
