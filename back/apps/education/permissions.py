"""
apps/education/permissions.py
Permissões customizadas para o app de educação.
"""
from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permite leitura pra qualquer usuário autenticado.
    Modificações (POST/PUT/PATCH/DELETE) só pra staff (admin).
    """

    def has_permission(self, request, view):
        # Métodos seguros: GET, HEAD, OPTIONS — qualquer um logado
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated

        # Métodos de escrita: só staff
        return request.user and request.user.is_authenticated and request.user.is_staff