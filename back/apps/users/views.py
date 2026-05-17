"""
apps/users/views.py
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode

from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from rest_framework_simplejwt.views import TokenObtainPairView

from drf_spectacular.utils import extend_schema

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — cria novo usuário (público)."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ — perfil do usuário autenticado."""

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


# ── Login customizado (atualiza last_login) ─────────────────────────────────

class CoreFinTokenObtainPairView(TokenObtainPairView):
    """
    Login customizado que atualiza last_login do usuário.

    O TokenObtainPairView padrão do simplejwt não atualiza last_login
    (diferente do login tradicional do Django). Aqui sobrescrevemos
    pra fazer essa atualização quando o login dá certo.
    """

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        # Se o login deu certo (status 200), atualiza last_login
        if response.status_code == 200:
            email = request.data.get("email")
            if email:
                User.objects.filter(email__iexact=email).update(
                    last_login=timezone.now()
                )

        return response


# ── Recuperação de senha ────────────────────────────────────────────────────

class PasswordResetRequestView(APIView):
    """
    Solicita recuperação de senha.

    POST /api/auth/password-reset/request/
    Body: { "email": "user@example.com" }

    Em DEV: o token é printado no console do servidor.
    Em PROD: enviar por e-mail (configurar SMTP no settings).
    """

    permission_classes = [AllowAny]

    @extend_schema(request=PasswordResetRequestSerializer, responses={200: dict})
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        # Busca o usuario, mas nunca revela se existe ou nao
        user = User.objects.filter(email__iexact=email, is_active=True).first()

        if user:
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            # === DEV: print no console ===
            print("\n" + "=" * 70)
            print("RECUPERACAO DE SENHA SOLICITADA")
            print("=" * 70)
            print(f"Usuario: {user.email}")
            print(f"UID:    {uid}")
            print(f"Token:  {token}")
            print("-" * 70)
            print("Para confirmar a redefinicao, faca POST em:")
            print("/api/auth/password-reset/confirm/")
            print("Body: {")
            print(f'  "uid": "{uid}",')
            print(f'  "token": "{token}",')
            print('  "new_password": "sua-nova-senha"')
            print("}")
            print("=" * 70 + "\n")

            # TODO: em PROD, mandar por e-mail:
            # send_mail(
            #     subject="Recuperacao de senha - CoreFin",
            #     message=f"Use o link: {FRONTEND_URL}/reset-password?uid={uid}&token={token}",
            #     from_email=DEFAULT_FROM_EMAIL,
            #     recipient_list=[user.email],
            # )

        # Resposta sempre 200, independente do email existir
        return Response({
            "detail": "Se o e-mail estiver cadastrado, voce recebera instrucoes para redefinir a senha."
        })


class PasswordResetConfirmView(APIView):
    """
    Confirma a redefinicao de senha com o token.

    POST /api/auth/password-reset/confirm/
    Body: { "uid": "...", "token": "...", "new_password": "..." }
    """

    permission_classes = [AllowAny]

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: dict})
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        # Decodifica o uid pra achar o usuario
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "Link invalido ou expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Valida o token
        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Link invalido ou expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Define a nova senha (Django faz hash automatico)
        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"detail": "Senha redefinida com sucesso."})


# ── Troca de senha (usuário logado) ─────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    Troca a senha do usuário logado.
    Diferente do reset, aqui o usuário fornece a senha atual.

    POST /api/auth/change-password/
    Body: { "current_password": "...", "new_password": "..." }
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={200: dict})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        current_password = serializer.validated_data["current_password"]
        new_password = serializer.validated_data["new_password"]

        user = request.user

        # Valida que a senha atual está correta
        if not user.check_password(current_password):
            return Response(
                {"detail": "Senha atual incorreta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Não deixa trocar pela mesma senha
        if current_password == new_password:
            return Response(
                {"detail": "A nova senha deve ser diferente da atual."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Define a nova senha (Django faz hash automatico)
        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"detail": "Senha alterada com sucesso."})