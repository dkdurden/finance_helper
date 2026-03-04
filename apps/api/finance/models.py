from django.db import models
from django.utils import timezone


class Account(models.Model):
    class AccountType(models.TextChoices):
        CHECKING = "checking", "Checking"
        SAVINGS = "savings", "Savings"
        CASH = "cash", "Cash"
        CREDIT_CARD = "credit_card", "Credit Card"
        LOAN = "loan", "Loan"
        INVESTMENT = "investment", "Investment"
        OTHER = "other", "Other"

    name = models.CharField(max_length=100, unique=True)
    account_type = models.CharField(
        max_length=20,
        choices=AccountType.choices,
        default=AccountType.CHECKING,
    )
    is_liability = models.BooleanField(default=False)
    opening_balance_cents = models.IntegerField(default=0)
    opening_balance_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name
