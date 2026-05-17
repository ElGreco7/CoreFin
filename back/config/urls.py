"""
config/urls.py
Roteador raiz — agrega todas as urls dos apps.
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


urlpatterns = [
    path("admin/", admin.site.urls),

    # Documentação automática (OpenAPI + Swagger UI)
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # Apps
    path("api/auth/", include("apps.users.urls")),
    path("api/finance/", include("apps.finance.urls")),
    path("api/", include("apps.goals.urls")),
     path("api/", include("apps.notifications.urls")),
     path("api/", include("apps.chat.urls")),
      path("api/", include("apps.education.urls")),
      path("api/", include("apps.analytics.urls")),
      path("api/", include("apps.admin_api.urls")),
]