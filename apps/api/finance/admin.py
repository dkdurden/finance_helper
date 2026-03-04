from django.contrib import admin

from .models import Account, Category


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
