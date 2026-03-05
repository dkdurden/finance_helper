from django.http import JsonResponse
from rest_framework import viewsets

from .models import Account, Category, Product, Receipt, ReceiptItem, Transaction, Transfer
from .serializers import (
    AccountSerializer,
    CategorySerializer,
    ProductSerializer,
    ReceiptItemSerializer,
    ReceiptSerializer,
    TransactionSerializer,
    TransferSerializer,
)


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer


class ReceiptViewSet(viewsets.ModelViewSet):
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer


class ReceiptItemViewSet(viewsets.ModelViewSet):
    queryset = ReceiptItem.objects.all()
    serializer_class = ReceiptItemSerializer


class TransferViewSet(viewsets.ModelViewSet):
    queryset = Transfer.objects.all()
    serializer_class = TransferSerializer


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer


def health(request):
    return JsonResponse({"status": "ok"})
