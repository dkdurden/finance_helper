from django.conf import settings
from django.contrib.auth import login, logout
from django.db import transaction as db_transaction
from django.db.models import BigIntegerField, ExpressionWrapper, F, Sum, Value
from django.db.models.deletion import ProtectedError
from django.db.models.functions import Coalesce
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Account, Category, Product, Receipt, ReceiptItem, Transaction, Transfer
from .serializers import (
    AccountSerializer,
    BalanceAdjustmentSerializer,
    CategorySerializer,
    LoginSerializer,
    ProductSerializer,
    ReceiptItemSerializer,
    ReceiptSerializer,
    SignUpSerializer,
    TRANSFER_POSTING_MUTATION_ERROR,
    TransactionSerializer,
    TransferSerializer,
)
from .services import TransferIntegrityError, delete_transfer


def user_payload(user):
    return {
        "id": user.id,
        "name": user.first_name,
        "email": user.email,
    }


class SignUpView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.ALLOW_SIGNUP:
            return Response(
                {"detail": "Signup is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = SignUpSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(user_payload(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        return Response(user_payload(user), status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    # Keep AllowAny so unauthenticated session requests return 401 instead of DRF's session-auth 403.
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(user_payload(request.user), status=status.HTTP_200_OK)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfCookieView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set."}, status=status.HTTP_200_OK)


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.annotate(
        balance_cents=ExpressionWrapper(
            F("opening_balance_cents")
            + Coalesce(Sum("transactions__signed_amount_cents"), Value(0)),
            output_field=BigIntegerField(),
        )
    )
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"], url_path="adjust-balance")
    def adjust_balance(self, request, *args, **kwargs):
        input_serializer = BalanceAdjustmentSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)

        with db_transaction.atomic():
            account = Account.objects.select_for_update().get(
                pk=self.get_object().pk
            )
            transaction_total = account.transactions.aggregate(
                total=Sum("signed_amount_cents")
            )["total"]
            current_balance_cents = (
                account.opening_balance_cents + (transaction_total or 0)
            )
            adjustment_cents = (
                input_serializer.validated_data["target_balance_cents"]
                - current_balance_cents
            )

            if adjustment_cents == 0:
                raise ValidationError(
                    {
                        "target_balance_cents": (
                            "Target balance already matches the current balance."
                        )
                    }
                )

            adjustment_category, _ = Category.objects.get_or_create(
                name="Adjustments"
            )
            adjustment = Transaction.objects.create(
                account=account,
                category=adjustment_category,
                date=input_serializer.validated_data["date"],
                note="balance adjustment",
                signed_amount_cents=adjustment_cents,
                transaction_type=Transaction.TransactionType.ADJUSTMENT,
            )

        return Response(
            TransactionSerializer(adjustment).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "Accounts with transactions or transfers cannot be deleted."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer


class ReceiptItemViewSet(viewsets.ModelViewSet):
    queryset = ReceiptItem.objects.all()
    serializer_class = ReceiptItemSerializer


class TransferViewSet(
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.ReadOnlyModelViewSet,
):
    queryset = Transfer.objects.all()
    serializer_class = TransferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except TransferIntegrityError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_409_CONFLICT,
            )

    def destroy(self, request, *args, **kwargs):
        transfer = self.get_object()

        try:
            delete_transfer(transfer.pk)
        except TransferIntegrityError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related("category", "account").all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        transaction = self.get_object()

        if transaction.transaction_type == Transaction.TransactionType.TRANSFER:
            return Response(
                {"detail": TRANSFER_POSTING_MUTATION_ERROR},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return super().destroy(request, *args, **kwargs)


def health(request):
    return JsonResponse({"status": "ok"})
