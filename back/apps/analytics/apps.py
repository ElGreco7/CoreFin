"""
apps/analytics/apps.py
"""
from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.analytics"
    verbose_name = "Analytics"

    def ready(self):
        """Ativa os signals quando o Django inicia."""
        from . import signals  # noqa: F401