from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AccountViewSet, health

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="account")

urlpatterns = [
    path("health/", health, name="health"),
    path("", include(router.urls)),
]
