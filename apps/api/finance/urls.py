from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AccountViewSet, CategoryViewSet, TransactionViewSet, health

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="account")
router.register("categories", CategoryViewSet, basename="category")
router.register("transactions", TransactionViewSet, basename="transaction")

urlpatterns = [
    path("health/", health, name="health"),
    path("", include(router.urls)),
]
