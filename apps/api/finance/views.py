from django.http import JsonResponse
from rest_framework import viewsets

from .models import Account, Category
from .serializers import AccountSerializer, CategorySerializer


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


def health(request):
    return JsonResponse({"status": "ok"})
