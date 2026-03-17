from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import (
    Account,
    Category,
    Product,
    Receipt,
    ReceiptItem,
    Transaction,
    Transfer,
    User,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("email", "first_name", "last_name", "is_staff", "is_active")
    list_filter = ("is_staff", "is_active", "is_superuser", "groups")
    ordering = ("email",)
    search_fields = ("email", "first_name", "last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "is_staff", "is_active"),
            },
        ),
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


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("date", "occurred_at", "store", "total_cents", "transaction")
    list_filter = ("date", "store")
    search_fields = ("store",)


@admin.register(ReceiptItem)
class ReceiptItemAdmin(admin.ModelAdmin):
    list_display = ("receipt", "product", "name_snapshot", "qty", "unit", "line_total_cents")
    list_filter = ("unit",)
    search_fields = ("name_snapshot", "product__name")
