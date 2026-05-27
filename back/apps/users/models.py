"""
apps/users/models.py
CustomUser substituindo o User padrão do Django.
Usar email como identificador de login no lugar de username.
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models

from apps.core.models import BaseModel


class UserManager(BaseUserManager):
    """Manager customizado que usa email como campo único de autenticação."""

    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError("O email é obrigatório.")
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(email, name, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin, BaseModel):
    """
    Usuário do CoreFin.
    - Autenticação via email + senha
    - Herda timestamps de BaseModel
    - Roles: admin, user, viewer
    """

    class Role(models.TextChoices):
        ADMIN = "admin", "Administrador"
        USER = "user", "Usuário"
        VIEWER = "viewer", "Visualizador"

    name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)

    business_name = models.CharField(
        max_length=150,
        blank=True,
        default="",
        help_text="Nome do negócio/empresa (preenchido pelo MEI no cadastro).",
    )

    # ── Dados de contato/empresa (opcionais, preenchidos em Configurações) ───
    phone = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Telefone de contato do usuário.",
    )

    cnpj = models.CharField(
        max_length=18,  # formato XX.XXX.XXX/XXXX-XX = 18 chars
        blank=True,
        default="",
        help_text="CNPJ do MEI (apenas dígitos ou formatado).",
    )

    address = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Endereço completo do usuário/empresa.",
    )

    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.USER,
        help_text="Define o nível de acesso do usuário.",
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Campo usado para fazer login
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    objects = UserManager()

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def __str__(self):
        return self.email

    def save(self, *args, **kwargs):
        """
        Sincroniza is_staff com o role:
        - admin e viewer podem acessar o /admin/ do Django
        - user comum não acessa
        """
        if self.role in [self.Role.ADMIN, self.Role.VIEWER]:
            self.is_staff = True
        else:
            # Mantém is_staff=True se for superuser (não pode perder acesso)
            if not self.is_superuser:
                self.is_staff = False
        super().save(*args, **kwargs)
