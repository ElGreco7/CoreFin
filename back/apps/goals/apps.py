"""
apps/goals/apps.py
Configuração do app de Metas Financeiras.
"""
from django.apps import AppConfig


class GoalsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.goals"
    verbose_name = "Metas Financeiras"