from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    CategoryViewSet,
    TransactionViewSet,
    TransferViewSet,
    health,
)

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="account")
router.register("categories", CategoryViewSet, basename="category")
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("transfers", TransferViewSet, basename="transfer")

urlpatterns = [
    path("health/", health, name="health"),
    path("", include(router.urls)),
]
