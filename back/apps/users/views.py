"""
apps/users/views.py

CHANGELOG:
  - PasswordResetRequestView agora envia e-mail real (django.core.mail).
    Em DEV (DEBUG=True) continua printando no console por segurança.
    Em PROD usa EMAIL_BACKEND + DEFAULT_FROM_EMAIL configurados no settings.
  - Link de reset aponta para FRONTEND_URL (variável de ambiente).
"""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
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


# ── Login customizado ────────────────────────────────────────────────────────

class CoreFinTokenObtainPairView(TokenObtainPairView):
    """Login que atualiza last_login do usuário."""

    def post(self, request, *args, **kwargs):
        resp = super().post(request, *args, **kwargs)
        if resp.status_code == 200:
            email = request.data.get("email")
            if email:
                User.objects.filter(email__iexact=email).update(last_login=timezone.now())
        return resp


# ── Recuperação de senha ─────────────────────────────────────────────────────

def _build_reset_link(uid: str, token: str) -> str:
    """
    Monta o link de reset apontando para o front-end.
    FRONTEND_URL deve estar configurado no .env / settings.
    Ex: https://corefin-qraj.onrender.com
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
    return f"{frontend_url}/recuperar-senha?uid={uid}&token={token}"


def _send_reset_email(user, uid: str, token: str) -> None:
    """
    Envia e-mail de recuperação de senha.
    Em DEV (DEBUG=True) também printa o link no console para facilitar testes.
    """
    link = _build_reset_link(uid, token)

    subject = "Recuperação de senha — CoreFin"
    message_html = f"""
    <html>
    <body style="font-family: sans-serif; color: #333;">
      <h2>Olá, {user.name}!</h2>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>CoreFin</strong>.</p>
      <p>Clique no botão abaixo para criar uma nova senha:</p>
      <p style="margin: 24px 0;">
        <a href="{link}"
           style="background:#1e5a8e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Redefinir minha senha
        </a>
      </p>
      <p>Ou copie e cole o link abaixo no seu navegador:</p>
      <p style="word-break:break-all;color:#555;">{link}</p>
      <hr/>
      <p style="font-size:12px;color:#999;">
        Este link expira em 72 horas. Se você não solicitou a redefinição, ignore este e-mail.
      </p>
    </body>
    </html>
    """
    message_plain = strip_tags(message_html)

    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@corefin.app")

    # DEV: também loga no console
    if getattr(settings, "DEBUG", False):
        print("\n" + "=" * 70)
        print("RECUPERACAO DE SENHA — LINK GERADO (DEV)")
        print("=" * 70)
        print(f"Usuário: {user.email}")
        print(f"Link:    {link}")
        print("=" * 70 + "\n")

    send_mail(
        subject=subject,
        message=message_plain,
        html_message=message_html,
        from_email=from_email,
        recipient_list=[user.email],
        fail_silently=True,   # Não deixa o endpoint quebrar se SMTP falhar
    )


class PasswordResetRequestView(APIView):
    """
    POST /api/auth/password-reset/request/
    Body: { "email": "user@example.com" }

    Envia e-mail com link de redefinição de senha.
    Responde sempre 200 (não revela se o e-mail existe).
    """
    permission_classes = [AllowAny]

    @extend_schema(request=PasswordResetRequestSerializer, responses={200: dict})
    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email__iexact=email, is_active=True).first()

        if user:
            uid   = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            _send_reset_email(user, uid, token)

        return Response({
            "detail": "Se o e-mail estiver cadastrado, você receberá instruções para redefinir a senha."
        })


class PasswordResetConfirmView(APIView):
    """
    POST /api/auth/password-reset/confirm/
    Body: { "uid": "...", "token": "...", "new_password": "..." }
    """
    permission_classes = [AllowAny]

    @extend_schema(request=PasswordResetConfirmSerializer, responses={200: dict})
    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid          = serializer.validated_data["uid"]
        token        = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {"detail": "Link inválido ou expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token):
            return Response(
                {"detail": "Link inválido ou expirado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"detail": "Senha redefinida com sucesso."})


# ── Troca de senha (usuário logado) ─────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Body: { "current_password": "...", "new_password": "..." }
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=ChangePasswordSerializer, responses={200: dict})
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        current_password = serializer.validated_data["current_password"]
        new_password     = serializer.validated_data["new_password"]
        user             = request.user

        if not user.check_password(current_password):
            return Response(
                {"detail": "Senha atual incorreta."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if current_password == new_password:
            return Response(
                {"detail": "A nova senha deve ser diferente da atual."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])

        return Response({"detail": "Senha alterada com sucesso."})
