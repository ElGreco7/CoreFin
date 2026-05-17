"""
apps/users/urls.py
Prefixo base: /api/auth/
"""
from django.urls import path
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenBlacklistView,
)
from .views import (
    RegisterView,
    MeView,
    CoreFinTokenObtainPairView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    ChangePasswordView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(),                name="auth-register"),
    path("login/",    CoreFinTokenObtainPairView.as_view(),  name="auth-login"),
    path("refresh/",  TokenRefreshView.as_view(),            name="auth-refresh"),
    path("logout/",   TokenBlacklistView.as_view(),          name="auth-logout"),
    path("me/",       MeView.as_view(),                      name="auth-me"),

    # Recuperação de senha
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("change-password/",        ChangePasswordView.as_view(),       name="change-password"),
]