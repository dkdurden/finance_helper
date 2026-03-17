from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    CategoryViewSet,
    ProductViewSet,
    ReceiptItemViewSet,
    ReceiptViewSet,
    SignUpView,
    TransactionViewSet,
    TransferViewSet,
    health,
)

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="account")
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")
router.register("receipts", ReceiptViewSet, basename="receipt")
router.register("receipt-items", ReceiptItemViewSet, basename="receipt-item")
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("transfers", TransferViewSet, basename="transfer")

urlpatterns = [
    path("health/", health, name="health"),
    path("auth/signup/", SignUpView.as_view(), name="auth-signup"),
    path("", include(router.urls)),
]