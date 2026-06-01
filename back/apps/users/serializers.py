"""
apps/users/serializers.py

CHANGELOG:
  - Adicionado validate_password() com regras de senha forte:
    * Mínimo 8 caracteres
    * Pelo menos 1 letra maiúscula
    * Pelo menos 1 número
    * Pelo menos 1 caractere especial
  - Aplicado em RegisterSerializer, PasswordResetConfirmSerializer e ChangePasswordSerializer.
"""
import re
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

# ── Regras de senha forte ────────────────────────────────────────────────────

PASSWORD_RULES = [
    (r'.{8,}',        'A senha deve ter no mínimo 8 caracteres.'),
    (r'[A-Z]',        'A senha deve conter pelo menos uma letra maiúscula.'),
    (r'[0-9]',        'A senha deve conter pelo menos um número.'),
    (r'[^A-Za-z0-9]', 'A senha deve conter pelo menos um caractere especial (ex: @, #, !).'),
]


def validate_strong_password(value: str) -> str:
    """
    Reutilizável em qualquer serializer.
    Levanta ValidationError listando TODAS as regras não cumpridas de uma vez
    para o front exibir o feedback completo sem precisar submeter várias vezes.
    """
    errors = [msg for pattern, msg in PASSWORD_RULES if not re.search(pattern, value)]
    if errors:
        raise serializers.ValidationError(errors)
    return value


# ── Serializers de usuário ───────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    """Criação de novo usuário."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("id", "name", "business_name", "email", "password")
        extra_kwargs = {
            "business_name": {"required": False, "allow_blank": True},
        }

    def validate_password(self, value):
        return validate_strong_password(value)

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Leitura/atualização do perfil do usuário autenticado."""

    class Meta:
        model = User
        fields = (
            "id", "name", "business_name", "email",
            "phone", "cnpj", "address", "role", "created_at",
        )
        read_only_fields = ("id", "email", "role", "created_at")
        extra_kwargs = {
            "business_name": {"required": False, "allow_blank": True},
            "phone":         {"required": False, "allow_blank": True},
            "cnpj":          {"required": False, "allow_blank": True},
            "address":       {"required": False, "allow_blank": True},
        }


# ── Recuperação de senha ─────────────────────────────────────────────────────

class PasswordResetRequestSerializer(serializers.Serializer):
    """Valida o e-mail no pedido de recuperação de senha."""
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Valida token + nova senha (com regras de senha forte)."""
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)

    def validate_new_password(self, value):
        return validate_strong_password(value)


# ── Troca de senha (usuário logado) ──────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    """Troca de senha pelo próprio usuário logado (sabe a senha atual)."""
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value):
        return validate_strong_password(value)
