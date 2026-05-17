"""
apps/admin_api/permissions.py
Permissões customizadas pra endpoints administrativos.
"""
from rest_framework import permissions

from apps.users.models import User


class IsAdminRole(permissions.BasePermission):
    """
    Só permite acesso pra usuários com role='admin'.
    Bloqueia tudo o resto (viewer, user, anônimo).
    """
    message = "Apenas administradores podem acessar este recurso."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == User.Role.ADMIN


class IsAdminOrViewer(permissions.BasePermission):
    """
    Permite leitura pra admin e viewer.
    Escrita só pra admin.
    Útil para endpoints que mostram dados pra ambos (ex: analytics).
    """
    message = "Acesso restrito a administradores e visualizadores."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Leitura: admin OU viewer
        if request.method in permissions.SAFE_METHODS:
            return request.user.role in [User.Role.ADMIN, User.Role.VIEWER]

        # Escrita: só admin
        return request.user.role == User.Role.ADMIN