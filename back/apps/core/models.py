"""
apps/core/models.py
Model abstrato com timestamps — herdado por todos os outros models.
"""
from django.db import models


class BaseModel(models.Model):
    """
    Adiciona created_at e updated_at automaticamente a qualquer model filho.
    Usar como: class MinhaModel(BaseModel): ...
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
