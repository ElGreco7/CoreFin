"""
apps/education/models.py
Modelos: Path (trilha), Content (artigo/vídeo/etc), PathContent (M:N),
         UserProgress (progresso), Rating (avaliação).
"""
from django.db import models
from django.conf import settings
from apps.core.models import BaseModel


class Path(BaseModel):
    """
    Trilha de aprendizado (curso).
    Ex: "Fundamentos de Gestão Financeira" — agrupa vários conteúdos.
    """

    class Level(models.TextChoices):
        BEGINNER = "beginner", "Iniciante"
        INTERMEDIATE = "intermediate", "Intermediário"
        ADVANCED = "advanced", "Avançado"

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    thumbnail_url = models.URLField(blank=True)
    level = models.CharField(
        max_length=15,
        choices=Level.choices,
        default=Level.BEGINNER,
    )
    is_published = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Trilha"
        verbose_name_plural = "Trilhas"
        ordering = ["display_order", "title"]

    def __str__(self):
        return self.title


class Content(BaseModel):
    """
    Conteúdo educacional individual.
    Pode ser artigo, vídeo, imagem (infográfico) ou documento (PDF).
    """

    class Type(models.TextChoices):
        ARTICLE = "article", "Artigo"
        VIDEO = "video", "Vídeo"
        IMAGE = "image", "Imagem"
        DOCUMENT = "document", "Documento"

    class Level(models.TextChoices):
        BEGINNER = "beginner", "Iniciante"
        INTERMEDIATE = "intermediate", "Intermediário"
        ADVANCED = "advanced", "Avançado"

    class Status(models.TextChoices):
        PUBLISHED = "published", "Publicado"
        DRAFT = "draft", "Rascunho"
        ARCHIVED = "archived", "Arquivado"

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authored_contents",
    )

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, blank=True)
    type = models.CharField(max_length=15, choices=Type.choices)
    level = models.CharField(
        max_length=15,
        choices=Level.choices,
        default=Level.BEGINNER,
    )

    # Para artigos: corpo do conteúdo (markdown ou HTML)
    body = models.TextField(blank=True)

    # Para vídeo/imagem/documento: URL do arquivo
    file_url = models.URLField(blank=True)
    thumbnail_url = models.URLField(blank=True)

    # Duração em minutos (vídeo) ou tempo de leitura (artigo)
    duration_minutes = models.IntegerField(default=0)

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    # Métricas (atualizadas pela aplicação)
    views_count = models.IntegerField(default=0)
    downloads_count = models.IntegerField(default=0)

    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Conteúdo"
        verbose_name_plural = "Conteúdos"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class PathContent(BaseModel):
    """
    Relação M:N entre Path e Content, com ordem dentro da trilha.
    Permite que o mesmo conteúdo apareça em várias trilhas.
    """

    path = models.ForeignKey(
        Path,
        on_delete=models.CASCADE,
        related_name="path_contents",
    )
    content = models.ForeignKey(
        Content,
        on_delete=models.CASCADE,
        related_name="path_contents",
    )
    display_order = models.IntegerField(default=0)
    is_required = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Conteúdo da Trilha"
        verbose_name_plural = "Conteúdos das Trilhas"
        ordering = ["display_order"]
        unique_together = ("path", "content")

    def __str__(self):
        return f"{self.path.title} → {self.content.title}"


class UserProgress(BaseModel):
    """
    Progresso de um usuário num conteúdo específico.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="content_progress",
    )
    content = models.ForeignKey(
        Content,
        on_delete=models.CASCADE,
        related_name="user_progress",
    )

    progress_percent = models.PositiveSmallIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Progresso"
        verbose_name_plural = "Progressos"
        unique_together = ("user", "content")

    def __str__(self):
        return f"{self.user.email} - {self.content.title} ({self.progress_percent}%)"


class Rating(BaseModel):
    """
    Avaliação de um usuário sobre um conteúdo (1 a 5 estrelas + comentário).
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="content_ratings",
    )
    content = models.ForeignKey(
        Content,
        on_delete=models.CASCADE,
        related_name="ratings",
    )

    rating = models.PositiveSmallIntegerField()  # 1 a 5
    comment = models.TextField(blank=True)

    class Meta:
        verbose_name = "Avaliação"
        verbose_name_plural = "Avaliações"
        unique_together = ("user", "content")

    def __str__(self):
        return f"{self.rating}★ - {self.content.title}"