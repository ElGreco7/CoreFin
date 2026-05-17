"""
apps/education/admin.py
"""
from django.contrib import admin
from .models import Path, Content, PathContent, UserProgress, Rating


@admin.register(Path)
class PathAdmin(admin.ModelAdmin):
    list_display = ("title", "level", "is_published", "display_order")
    list_filter = ("level", "is_published")
    search_fields = ("title",)


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "category", "status", "views_count")
    list_filter = ("type", "status", "level")
    search_fields = ("title", "category")


@admin.register(PathContent)
class PathContentAdmin(admin.ModelAdmin):
    list_display = ("path", "content", "display_order", "is_required")
    list_filter = ("is_required",)


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ("user", "content", "progress_percent", "is_completed")
    list_filter = ("is_completed",)
    search_fields = ("user__email", "content__title")


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ("content", "user", "rating", "created_at")
    list_filter = ("rating",)
    search_fields = ("content__title", "user__email")