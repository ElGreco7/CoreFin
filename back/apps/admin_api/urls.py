"""
apps/admin_api/urls.py
"""
from rest_framework.routers import DefaultRouter
from .views import AdminUserViewSet


router = DefaultRouter()
router.register(r"admin/users", AdminUserViewSet, basename="admin-user")

urlpatterns = router.urls