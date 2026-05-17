"""
apps/education/urls.py
"""
from rest_framework.routers import DefaultRouter
from .views import PathViewSet, ContentViewSet, RatingViewSet


router = DefaultRouter()
router.register(r"education/paths", PathViewSet, basename="path")
router.register(r"education/contents", ContentViewSet, basename="content")
router.register(r"education/ratings", RatingViewSet, basename="rating")

urlpatterns = router.urls