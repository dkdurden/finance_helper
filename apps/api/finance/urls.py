from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    CategoryViewSet,
    CsrfCookieView,
    CurrentUserView,
    LedgerEventListView,
    LoginView,
    LogoutView,
    MonthlySummaryView,
    NetWorthView,
    ProductViewSet,
    ReceiptItemViewSet,
    ReceiptViewSet,
    SignUpView,
    SpendingByCategoryView,
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
    path("auth/csrf/", CsrfCookieView.as_view(), name="auth-csrf"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", CurrentUserView.as_view(), name="auth-me"),
    path("auth/signup/", SignUpView.as_view(), name="auth-signup"),
    path("ledger-events/", LedgerEventListView.as_view(), name="ledger-event-list"),
    path("reports/monthly-summary/", MonthlySummaryView.as_view(), name="monthly-summary"),
    path(
        "reports/spending-by-category/",
        SpendingByCategoryView.as_view(),
        name="spending-by-category",
    ),
    path("reports/net-worth/", NetWorthView.as_view(), name="net-worth"),
    path("", include(router.urls)),
]
