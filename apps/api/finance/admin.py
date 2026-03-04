from django.contrib import admin

from .models import (
    Account,
    Category,
    GroceryTrip,
    GroceryTripItem,
    Product,
    Transaction,
    Transfer,
)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("name", "account_type", "is_liability", "opening_balance_cents", "opening_balance_date")
    list_filter = ("account_type", "is_liability")
    search_fields = ("name",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_archived", "updated_at")
    list_filter = ("is_archived",)
    search_fields = ("name",)


@admin.register(Transfer)
class TransferAdmin(admin.ModelAdmin):
    list_display = ("date", "occurred_at", "amount_cents", "from_account", "to_account")
    list_filter = ("from_account", "to_account")
    search_fields = ("note",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "date",
        "occurred_at",
        "signed_amount_cents",
        "transaction_type",
        "account",
        "category",
        "transfer",
        "merchant",
    )
    list_filter = ("transaction_type", "account", "category")
    search_fields = ("merchant", "note")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "default_unit", "is_archived", "updated_at")
    list_filter = ("is_archived",)
    search_fields = ("name",)


@admin.register(GroceryTrip)
class GroceryTripAdmin(admin.ModelAdmin):
    list_display = ("date", "occurred_at", "store", "total_cents", "transaction")
    list_filter = ("date", "store")
    search_fields = ("store",)


@admin.register(GroceryTripItem)
class GroceryTripItemAdmin(admin.ModelAdmin):
    list_display = ("trip", "product", "name_snapshot", "qty", "unit", "line_total_cents")
    list_filter = ("unit",)
    search_fields = ("name_snapshot", "product__name")
