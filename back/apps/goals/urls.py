"""
apps/goals/urls.py
URLs do app de Metas — registra o ViewSet num Router.
"""
from rest_framework.routers import DefaultRouter
from .views import GoalViewSet


router = DefaultRouter()

# Registra o ViewSet com prefixo "goals"
# Gera automaticamente:
#   /api/goals/
#   /api/goals/{id}/
#   /api/goals/{id}/contribute/
#   /api/goals/{id}/contributions/
router.register(r"goals", GoalViewSet, basename="goal")

urlpatterns = router.urls