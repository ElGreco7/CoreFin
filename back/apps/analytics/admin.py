"""
apps/analytics/admin.py
"""
from django.contrib import admin
from .models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "category", "user", "created_at")
    list_filter = ("event_type", "category", "created_at")
    search_fields = ("event_type", "user__email")
    readonly_fields = ("created_at",)