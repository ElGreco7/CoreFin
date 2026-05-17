"""
apps/education/serializers.py
"""
from rest_framework import serializers
from django.db.models import Avg
from .models import Path, Content, PathContent, UserProgress, Rating


class ContentListSerializer(serializers.ModelSerializer):
    """
    Versão LEVE do conteúdo — usada em listagens.
    Não inclui o body (texto inteiro do artigo seria pesado).
    """

    type_display = serializers.CharField(source="get_type_display", read_only=True)
    level_display = serializers.CharField(source="get_level_display", read_only=True)

    # Campos calculados em runtime (não vêm do banco)
    user_progress_percent = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()

    class Meta:
        model = Content
        fields = [
            "id",
            "title",
            "description",
            "category",
            "type",
            "type_display",
            "level",
            "level_display",
            "thumbnail_url",
            "duration_minutes",
            "views_count",
            "user_progress_percent",
            "is_completed",
            "average_rating",
            "published_at",
            "created_at",
        ]

    def get_user_progress_percent(self, obj):
        """Pega o progresso do usuário logado neste conteúdo."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0
        progress = UserProgress.objects.filter(
            user=request.user, content=obj
        ).first()
        return progress.progress_percent if progress else 0

    def get_is_completed(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return UserProgress.objects.filter(
            user=request.user, content=obj, is_completed=True
        ).exists()

    def get_average_rating(self, obj):
        avg = obj.ratings.aggregate(avg=Avg("rating"))["avg"]
        return round(avg, 1) if avg else None


class ContentDetailSerializer(ContentListSerializer):
    """
    Versão COMPLETA do conteúdo — inclui o body inteiro.
    Usada quando o usuário abre um conteúdo específico.
    """

    class Meta(ContentListSerializer.Meta):
        fields = ContentListSerializer.Meta.fields + [
            "body",
            "file_url",
            "downloads_count",
            "status",
            "updated_at",
        ]


class PathContentSerializer(serializers.ModelSerializer):
    """Conteúdo dentro de uma trilha (com ordem)."""

    content = ContentListSerializer(read_only=True)
    content_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = PathContent
        fields = [
            "id",
            "content",
            "content_id",
            "display_order",
            "is_required",
        ]


class PathListSerializer(serializers.ModelSerializer):
    """Versão leve da trilha — usada na listagem."""

    level_display = serializers.CharField(source="get_level_display", read_only=True)
    content_count = serializers.SerializerMethodField()
    completion_percent = serializers.SerializerMethodField()

    class Meta:
        model = Path
        fields = [
            "id",
            "title",
            "description",
            "thumbnail_url",
            "level",
            "level_display",
            "is_published",
            "display_order",
            "content_count",
            "completion_percent",
            "created_at",
        ]

    def get_content_count(self, obj):
        return obj.path_contents.count()

    def get_completion_percent(self, obj):
        """% da trilha concluída pelo usuário logado."""
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0

        total = obj.path_contents.count()
        if total == 0:
            return 0

        content_ids = obj.path_contents.values_list("content_id", flat=True)
        completed = UserProgress.objects.filter(
            user=request.user,
            content_id__in=content_ids,
            is_completed=True,
        ).count()

        return int((completed / total) * 100)


class PathDetailSerializer(PathListSerializer):
    """Versão completa da trilha — inclui os conteúdos."""

    path_contents = PathContentSerializer(many=True, read_only=True)

    class Meta(PathListSerializer.Meta):
        fields = PathListSerializer.Meta.fields + ["path_contents", "updated_at"]


class RatingSerializer(serializers.ModelSerializer):
    """Avaliação que um usuário dá a um conteúdo."""

    user_name = serializers.CharField(source="user.name", read_only=True)

    class Meta:
        model = Rating
        fields = [
            "id",
            "content",
            "user_name",
            "rating",
            "comment",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user_name", "created_at", "updated_at"]

    def validate_rating(self, value):
        """Garante que rating está entre 1 e 5."""
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating deve estar entre 1 e 5.")
        return value


class UserProgressSerializer(serializers.ModelSerializer):
    """Progresso do usuário em um conteúdo."""

    class Meta:
        model = UserProgress
        fields = [
            "id",
            "content",
            "progress_percent",
            "is_completed",
            "completed_at",
            "last_accessed_at",
        ]
        read_only_fields = ["id", "completed_at", "last_accessed_at"]