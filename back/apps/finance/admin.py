"""
apps/finance/admin.py
"""
from django.contrib import admin
from .models import Category, Income, Expense


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "user")
    list_filter = ("type",)
    search_fields = ("name", "user__email")


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "date", "category", "description")
    list_filter = ("date", "category")
    search_fields = ("description", "user__email")
    date_hierarchy = "date"


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "date", "category", "is_recurring")
    list_filter = ("date", "category", "is_recurring")
    search_fields = ("description", "user__email")
    date_hierarchy = "date"
