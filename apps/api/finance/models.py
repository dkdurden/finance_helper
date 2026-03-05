from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
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
    opening_balance_cents = models.BigIntegerField(default=0)
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


class Transfer(models.Model):
    date = models.DateField()
    occurred_at = models.DateTimeField(null=True, blank=True)
    amount_cents = models.BigIntegerField()
    from_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="outgoing_transfers",
    )
    to_account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="incoming_transfers",
    )
    note = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount_cents__gt=0),
                name="transfer_amount_cents_positive",
            ),
            models.CheckConstraint(
                condition=~Q(from_account=F("to_account")),
                name="transfer_accounts_must_differ",
            ),
        ]

    def clean(self):
        if self.from_account_id and self.to_account_id and self.from_account_id == self.to_account_id:
            raise ValidationError("from_account and to_account must be different")
        if self.amount_cents is not None and self.amount_cents <= 0:
            raise ValidationError("amount_cents must be greater than zero")

    def __str__(self):
        return f"{self.date} {self.amount_cents}"


class Transaction(models.Model):
    class TransactionType(models.TextChoices):
        NORMAL = "normal", "Normal"
        ADJUSTMENT = "adjustment", "Adjustment"
        TRANSFER = "transfer", "Transfer"

    date = models.DateField()
    occurred_at = models.DateTimeField(null=True, blank=True)
    signed_amount_cents = models.BigIntegerField()
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
        default=TransactionType.NORMAL,
    )
    merchant = models.CharField(max_length=255, null=True, blank=True)
    note = models.TextField(null=True, blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    account = models.ForeignKey(
        Account,
        on_delete=models.PROTECT,
        related_name="transactions",
    )
    transfer = models.ForeignKey(
        Transfer,
        on_delete=models.PROTECT,
        related_name="transactions",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=~Q(signed_amount_cents=0),
                name="transaction_signed_amount_non_zero",
            ),
            models.CheckConstraint(
                condition=(
                    (Q(transaction_type="transfer") & Q(transfer__isnull=False))
                    | (~Q(transaction_type="transfer") & Q(transfer__isnull=True))
                ),
                name="transaction_transfer_type_link_match",
            ),
        ]

    def __str__(self):
        return f"{self.date} {self.signed_amount_cents}"


class Product(models.Model):
    name = models.CharField(max_length=255, unique=True)
    default_unit = models.CharField(max_length=50, null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Receipt(models.Model):
    date = models.DateField()
    occurred_at = models.DateTimeField(null=True, blank=True)
    store = models.CharField(max_length=255, null=True, blank=True)
    tax_cents = models.BigIntegerField(default=0)
    fees_cents = models.BigIntegerField(default=0)
    total_cents = models.BigIntegerField()
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.PROTECT,
        related_name="receipt",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(tax_cents__gte=0),
                name="receipt_tax_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(fees_cents__gte=0),
                name="receipt_fees_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(total_cents__gte=0),
                name="receipt_total_non_negative",
            ),
        ]

    def __str__(self):
        return f"{self.date} {self.store or 'receipt'}"


class ReceiptItem(models.Model):
    receipt = models.ForeignKey(
        Receipt,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="receipt_items",
    )
    name_snapshot = models.CharField(max_length=255)
    qty = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    unit = models.CharField(max_length=50, null=True, blank=True)
    unit_price_cents = models.BigIntegerField(null=True, blank=True)
    line_total_cents = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(line_total_cents__gte=0),
                name="receipt_item_line_total_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(unit_price_cents__isnull=True) | Q(unit_price_cents__gte=0),
                name="receipt_item_unit_price_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(qty__isnull=True) | Q(qty__gt=0),
                name="receipt_item_qty_positive",
            ),
        ]

    def __str__(self):
        return f"{self.name_snapshot} {self.line_total_cents}"


