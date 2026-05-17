"""
apps/analytics/urls.py
"""
from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EventViewSet,
    TrackEventView,
    AnalyticsStatsView,
    MyActivityView,
)


router = DefaultRouter()
router.register(r"analytics/events", EventViewSet, basename="event")

urlpatterns = router.urls + [
    path("analytics/track/", TrackEventView.as_view(), name="analytics-track"),
    path("analytics/stats/", AnalyticsStatsView.as_view(), name="analytics-stats"),
    path("analytics/my-activity/", MyActivityView.as_view(), name="analytics-my-activity"),
]