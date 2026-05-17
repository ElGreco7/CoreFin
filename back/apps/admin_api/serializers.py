"""
apps/admin_api/serializers.py
"""
from rest_framework import serializers
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from apps.users.models import User


class UserListAdminSerializer(serializers.ModelSerializer):
    """
    Versão LEVE — usada na listagem de usuários no painel admin.
    Não inclui dados sensíveis nem campos pesados.
    """

    role_display = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "role_display",
            "is_active",
            "last_login",
            "created_at",
        ]


class UserDetailAdminSerializer(serializers.ModelSerializer):
    """
    Versão COMPLETA — usada quando o admin abre o perfil de um usuário.
    Inclui mais campos e estatísticas básicas.
    """

    role_display = serializers.CharField(source="get_role_display", read_only=True)
    goals_count = serializers.SerializerMethodField()
    transactions_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "email",
            "role",
            "role_display",
            "is_active",
            "is_staff",
            "is_superuser",
            "last_login",
            "goals_count",
            "transactions_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "email",
            "is_staff",
            "is_superuser",
            "last_login",
            "goals_count",
            "transactions_count",
            "created_at",
            "updated_at",
        ]

    def get_goals_count(self, obj):
        return obj.goals.count()

    def get_transactions_count(self, obj):
        # Soma receitas + despesas
        return obj.income_set.count() + obj.expense_set.count() if hasattr(obj, "income_set") else 0


class UserCreateAdminSerializer(serializers.ModelSerializer):
    """
    Admin cria um usuário diretamente (com role escolhida e senha definida).
    Diferente do RegisterSerializer público, este permite definir role.
    """

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "name", "email", "password", "role", "is_active"]
        read_only_fields = ["id"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        role = validated_data.pop("role", User.Role.USER)
        is_active = validated_data.pop("is_active", True)

        user = User.objects.create_user(
            password=password,
            role=role,
            is_active=is_active,
            **validated_data,
        )
        return user


class AdminPasswordResetSerializer(serializers.Serializer):
    """
    Admin gera um token de reset pra outro usuário.
    Retorna o token pro admin entregar pessoalmente
    (em DEV: também printa no console).
    """
    pass  # não precisa de input — o user_id vem da URL