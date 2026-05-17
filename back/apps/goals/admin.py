"""
apps/goals/admin.py
"""
from django.contrib import admin
from .models import Goal, Contribution


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "category", "status", "target_amount", "current_amount")
    list_filter = ("status", "category")
    search_fields = ("name", "user__email")


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ("goal", "amount", "date", "is_automatic")
    list_filter = ("is_automatic", "date")
    search_fields = ("goal__name",)