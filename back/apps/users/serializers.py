"""
apps/users/serializers.py
"""
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Criação de novo usuário. Senha com write_only para não vazar na resposta."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "name", "business_name", "email", "password")
        extra_kwargs = {
            "business_name": {"required": False, "allow_blank": True},
        }

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Leitura/atualização do perfil do usuário autenticado."""

    class Meta:
        model = User
        fields = ("id", "name", "business_name", "email", "role", "created_at")
        read_only_fields = ("id", "email", "role", "created_at")


# ── Recuperação de senha ─────────────────────────────────────────────────────

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Valida o e-mail no pedido de recuperação de senha.
    Não revela se o e-mail existe — sempre aceita o request.
    """
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Valida token + nova senha.
    """
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)


# ── Troca de senha (usuário logado) ──────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    """
    Troca de senha pelo próprio usuário logado.
    Diferente do reset: aqui o usuário sabe a senha atual.
    """
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)