from django.conf import settings
from django.contrib.auth import login, logout
from django.db import transaction as db_transaction
from django.db.models import (
    BigIntegerField,
    Case,
    CharField,
    ExpressionWrapper,
    F,
    IntegerField,
    Q,
    Sum,
    Value,
    When,
)
from django.db.models.deletion import ProtectedError
from django.db.models.functions import Coalesce, Concat, Lower
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Account, Category, Product, Receipt, ReceiptItem, Transaction, Transfer
from .serializers import (
    AccountSerializer,
    BalanceAdjustmentSerializer,
    CategorySerializer,
    LedgerEventSerializer,
    LoginSerializer,
    ProductSerializer,
    ReceiptCreateSerializer,
    ReceiptItemSerializer,
    ReceiptSerializer,
    ReceiptUpdateSerializer,
    SignUpSerializer,
    TRANSFER_POSTING_MUTATION_ERROR,
    TransactionSerializer,
    TransferSerializer,
)
from .services import (
    ReceiptIntegrityError,
    TransferIntegrityError,
    delete_receipt,
    delete_transfer,
)


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

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                is_archived=False,
                name__icontains=search,
            )

        return queryset


class ReceiptViewSet(
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.ReadOnlyModelViewSet,
):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer

    def get_serializer_class(self):
        if self.action == "create":
            return ReceiptCreateSerializer
        if self.action in {"update", "partial_update"}:
            return ReceiptUpdateSerializer

        return super().get_serializer_class()

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except ReceiptIntegrityError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_409_CONFLICT,
            )

    def destroy(self, request, *args, **kwargs):
        receipt = self.get_object()

        try:
            delete_receipt(receipt.pk)
        except ReceiptIntegrityError as error:
            return Response(
                {"detail": str(error)},
                status=status.HTTP_409_CONFLICT,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class ReceiptItemViewSet(viewsets.ReadOnlyModelViewSet):
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


class LedgerEventPagination(PageNumberPagination):
    page_size = 20


class LedgerEventListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        sort = request.query_params.get("sort", "latest")
        raw_category = request.query_params.get("category", "").strip()
        category_id = (
            int(raw_category)
            if raw_category.isdecimal() and int(raw_category) > 0
            else None
        )
        ordering = {
            "latest": (
                "-event_date",
                "-event_created_at",
                "-event_type",
                "-event_id",
            ),
            "oldest": (
                "event_date",
                "event_created_at",
                "event_type",
                "event_id",
            ),
            "a-to-z": (
                "event_sort_name",
                "-event_date",
                "-event_created_at",
                "-event_type",
                "-event_id",
            ),
            "z-to-a": (
                "-event_sort_name",
                "-event_date",
                "-event_created_at",
                "-event_type",
                "-event_id",
            ),
            "highest": (
                "-event_amount_cents",
                "-event_date",
                "-event_created_at",
                "-event_type",
                "-event_id",
            ),
            "lowest": (
                "event_amount_cents",
                "-event_date",
                "-event_created_at",
                "-event_type",
                "-event_id",
            ),
        }.get(sort, ())
        if not ordering:
            ordering = (
                "-event_date",
                "-event_created_at",
                "-event_type",
                "-event_id",
            )
        event_fields = (
            "event_type",
            "event_id",
            "event_date",
            "event_occurred_at",
            "event_created_at",
            "event_amount_cents",
            "event_transaction_type",
            "event_merchant",
            "event_note",
            "event_category_id",
            "event_category_name",
            "event_account_id",
            "event_account_name",
            "event_receipt_id",
            "event_from_account_id",
            "event_from_account_name",
            "event_to_account_id",
            "event_to_account_name",
            "event_sort_name",
        )
        transaction_queryset = Transaction.objects.exclude(
            transaction_type=Transaction.TransactionType.TRANSFER
        )
        transfer_queryset = Transfer.objects.all()

        if category_id is not None:
            transaction_queryset = transaction_queryset.filter(
                category_id=category_id
            )
            transfer_queryset = transfer_queryset.none()

        if search:
            transaction_queryset = transaction_queryset.filter(
                Q(merchant__icontains=search)
                | Q(note__icontains=search)
                | Q(category__name__icontains=search)
                | Q(account__name__icontains=search)
            )
            transfer_queryset = transfer_queryset.filter(
                Q(note__icontains=search)
                | Q(from_account__name__icontains=search)
                | Q(to_account__name__icontains=search)
            )

        transaction_events = (
            transaction_queryset
            .annotate(
                event_type=Value("transaction", output_field=CharField()),
                event_id=F("id"),
                event_date=F("date"),
                event_occurred_at=F("occurred_at"),
                event_created_at=F("created_at"),
                event_amount_cents=F("signed_amount_cents"),
                event_transaction_type=F("transaction_type"),
                event_merchant=F("merchant"),
                event_note=F("note"),
                event_category_id=F("category_id"),
                event_category_name=F("category__name"),
                event_account_id=F("account_id"),
                event_account_name=F("account__name"),
                event_receipt_id=F("receipt__id"),
                event_from_account_id=Value(None, output_field=IntegerField()),
                event_from_account_name=Value(None, output_field=CharField()),
                event_to_account_id=Value(None, output_field=IntegerField()),
                event_to_account_name=Value(None, output_field=CharField()),
                event_sort_name=Lower(
                    Case(
                        When(merchant__regex=r"\S", then=F("merchant")),
                        When(
                            transaction_type=Transaction.TransactionType.ADJUSTMENT,
                            then=Value("Balance adjustment"),
                        ),
                        default=Value("Transaction"),
                        output_field=CharField(),
                    )
                ),
            )
            .values(*event_fields)
        )
        transfer_events = (
            transfer_queryset.annotate(
                event_type=Value("transfer", output_field=CharField()),
                event_id=F("id"),
                event_date=F("date"),
                event_occurred_at=F("occurred_at"),
                event_created_at=F("created_at"),
                event_amount_cents=F("amount_cents"),
                event_transaction_type=Value(
                    Transaction.TransactionType.TRANSFER,
                    output_field=CharField(),
                ),
                event_merchant=Value(None, output_field=CharField()),
                event_note=F("note"),
                event_category_id=Value(None, output_field=IntegerField()),
                event_category_name=Value(None, output_field=CharField()),
                event_account_id=Value(None, output_field=IntegerField()),
                event_account_name=Value(None, output_field=CharField()),
                event_receipt_id=Value(None, output_field=IntegerField()),
                event_from_account_id=F("from_account_id"),
                event_from_account_name=F("from_account__name"),
                event_to_account_id=F("to_account_id"),
                event_to_account_name=F("to_account__name"),
                event_sort_name=Lower(
                    Concat(
                        F("from_account__name"),
                        Value(" to "),
                        F("to_account__name"),
                        output_field=CharField(),
                    )
                ),
            )
            .values(*event_fields)
        )
        events = transaction_events.union(transfer_events, all=True).order_by(
            *ordering
        )

        paginator = LedgerEventPagination()
        page = paginator.paginate_queryset(events, request, view=self)
        serializer = LedgerEventSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


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
