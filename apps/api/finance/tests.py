from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction as db_transaction
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Account, Category, Product, Receipt, ReceiptItem, Transaction, Transfer
from .serializers import TransferSerializer
from .services import (
    ReceiptIntegrityError,
    create_receipt,
    delete_receipt,
    update_receipt,
)

User = get_user_model()


class HealthEndpointTests(APITestCase):
    def test_health_returns_ok(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"status": "ok"})


@override_settings(ALLOW_SIGNUP=True)
class SignUpApiTests(APITestCase):
    def test_signup_creates_user(self):
        payload = {
            "name": "Dana Thomas",
            "email": "dana@example.com",
            "password": "strong-password-123",
        }

        response = self.client.post(reverse("auth-signup"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], payload["name"])
        self.assertEqual(response.data["email"], payload["email"])
        self.assertNotIn("password", response.data)

        user = User.objects.get(email=payload["email"])
        self.assertEqual(user.email, payload["email"])
        self.assertEqual(user.first_name, payload["name"])
        self.assertTrue(user.check_password(payload["password"]))

    def test_signup_rejects_duplicate_email(self):
        User.objects.create_user(
            email="dana@example.com",
            password="strong-password-123",
        )

        response = self.client.post(
            reverse("auth-signup"),
            {
                "name": "Dana Thomas",
                "email": "dana@example.com",
                "password": "another-strong-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["email"][0], "A user with that email already exists.")

    def test_signup_rejects_weak_password(self):
        response = self.client.post(
            reverse("auth-signup"),
            {
                "name": "Dana Thomas",
                "email": "dana@example.com",
                "password": "short",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    @override_settings(ALLOW_SIGNUP=False)
    def test_signup_rejects_requests_when_disabled(self):
        response = self.client.post(
            reverse("auth-signup"),
            {
                "name": "Dana Thomas",
                "email": "dana@example.com",
                "password": "strong-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Signup is disabled.")
        self.assertFalse(User.objects.exists())


class AuthSessionApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="dana@example.com",
            first_name="Dana Thomas",
            password="strong-password-123",
        )

    def test_login_creates_session(self):
        response = self.client.post(
            reverse("auth-login"),
            {
                "email": "dana@example.com",
                "password": "strong-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["name"], self.user.first_name)
        self.assertEqual(response.data["email"], self.user.email)
        self.assertNotIn("password", response.data)

        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], self.user.email)

    def test_login_rejects_invalid_credentials(self):
        response = self.client.post(
            reverse("auth-login"),
            {
                "email": "dana@example.com",
                "password": "wrong-password",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"][0], "Invalid email or password.")

    def test_me_requires_authenticated_session(self):
        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["detail"], "Authentication credentials were not provided.")

    def test_me_returns_current_user(self):
        self.client.login(email="dana@example.com", password="strong-password-123")

        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["name"], self.user.first_name)
        self.assertEqual(response.data["email"], self.user.email)

    def test_logout_clears_session(self):
        self.client.login(email="dana@example.com", password="strong-password-123")

        response = self.client.post(reverse("auth-logout"))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_csrf_endpoint_sets_csrf_cookie(self):
        response = self.client.get(reverse("auth-csrf"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "CSRF cookie set.")
        self.assertIn("csrftoken", response.cookies)


class AccountApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="account-tests@example.com",
            password="strong-password-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_account(self):
        payload = {
            "name": "Checking",
            "account_type": "checking",
            "is_liability": False,
            "opening_balance_cents": 125000,
            "opening_balance_date": "2026-01-01T00:00:00Z",
        }

        response = self.client.post(reverse("account-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], payload["name"])
        self.assertEqual(response.data["opening_balance_cents"], payload["opening_balance_cents"])
        self.assertEqual(response.data["balance_cents"], payload["opening_balance_cents"])

    def test_list_accounts(self):
        self.client.post(
            reverse("account-list"),
            {
                "name": "Savings",
                "account_type": "savings",
                "is_liability": False,
                "opening_balance_cents": 2500,
                "opening_balance_date": "2026-01-01T00:00:00Z",
            },
            format="json",
        )

        response = self.client.get(reverse("account-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Savings")
        self.assertEqual(response.data[0]["balance_cents"], 2500)

    def test_list_accounts_includes_derived_balance(self):
        account = Account.objects.create(
            name="Transaction Account",
            account_type=Account.AccountType.CHECKING,
            is_liability=False,
            opening_balance_cents=10000,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        category = Category.objects.create(name="Balance Test")
        Transaction.objects.create(
            date="2026-01-02",
            signed_amount_cents=5000,
            category=category,
            account=account,
        )
        Transaction.objects.create(
            date="2026-01-03",
            signed_amount_cents=-2500,
            category=category,
            account=account,
        )

        response = self.client.get(reverse("account-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["balance_cents"], 12500)

    def test_list_accounts_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("account-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_unused_account_can_change_liability_classification(self):
        account = Account.objects.create(
            name="Unused Asset",
            is_liability=False,
        )

        response = self.client.patch(
            reverse("account-detail", args=[account.id]),
            {"is_liability": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        account.refresh_from_db()
        self.assertTrue(account.is_liability)

    def test_update_account_with_transaction_cannot_change_liability_classification(self):
        account = Account.objects.create(
            name="Used Asset",
            is_liability=False,
        )
        category = Category.objects.create(name="Classification Test")
        Transaction.objects.create(
            date="2026-07-16",
            signed_amount_cents=-100,
            category=category,
            account=account,
        )

        response = self.client.patch(
            reverse("account-detail", args=[account.id]),
            {"is_liability": True},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["is_liability"][0],
            "is_liability cannot be changed after the account has ledger activity.",
        )
        account.refresh_from_db()
        self.assertFalse(account.is_liability)

    def test_update_account_with_transfer_cannot_change_liability_classification(self):
        for role in ("source", "destination"):
            with self.subTest(role=role):
                account = Account.objects.create(
                    name=f"Transfer {role.title()}",
                    is_liability=False,
                )
                other_account = Account.objects.create(
                    name=f"Transfer Other {role.title()}"
                )
                Transfer.objects.create(
                    date="2026-07-16",
                    amount_cents=100,
                    from_account=account if role == "source" else other_account,
                    to_account=other_account if role == "source" else account,
                )

                response = self.client.patch(
                    reverse("account-detail", args=[account.id]),
                    {"is_liability": True},
                    format="json",
                )

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(
                    response.data["is_liability"][0],
                    "is_liability cannot be changed after the account has ledger activity.",
                )
                account.refresh_from_db()
                self.assertFalse(account.is_liability)

    def test_update_account_with_activity_allows_unchanged_liability_classification(self):
        account = Account.objects.create(
            name="Original Name",
            is_liability=False,
        )
        category = Category.objects.create(name="Unchanged Classification Test")
        Transaction.objects.create(
            date="2026-07-16",
            signed_amount_cents=-100,
            category=category,
            account=account,
        )

        response = self.client.patch(
            reverse("account-detail", args=[account.id]),
            {
                "name": "Updated Name",
                "is_liability": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        account.refresh_from_db()
        self.assertEqual(account.name, "Updated Name")
        self.assertFalse(account.is_liability)

    def test_delete_unused_account(self):
        account = Account.objects.create(name="Unused Account")

        response = self.client.delete(reverse("account-detail", args=[account.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Account.objects.filter(id=account.id).exists())

    def test_delete_account_with_transaction_returns_conflict(self):
        account = Account.objects.create(name="Used Account")
        category = Category.objects.create(name="Account Delete Test")
        Transaction.objects.create(
            date="2026-07-16",
            signed_amount_cents=-100,
            category=category,
            account=account,
        )

        response = self.client.delete(reverse("account-detail", args=[account.id]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["detail"],
            "Accounts with transactions or transfers cannot be deleted.",
        )
        self.assertTrue(Account.objects.filter(id=account.id).exists())

    def test_delete_account_with_transfer_returns_conflict(self):
        from_account = Account.objects.create(name="Transfer Source")
        to_account = Account.objects.create(name="Transfer Destination")
        Transfer.objects.create(
            date="2026-07-16",
            amount_cents=100,
            from_account=from_account,
            to_account=to_account,
        )

        response = self.client.delete(
            reverse("account-detail", args=[from_account.id])
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["detail"],
            "Accounts with transactions or transfers cannot be deleted.",
        )
        self.assertTrue(Account.objects.filter(id=from_account.id).exists())

    def test_adjust_balance_increase_creates_adjustment_transaction(self):
        account = Account.objects.create(
            name="Adjustment Checking",
            opening_balance_cents=10000,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        category = Category.objects.create(name="Existing Activity")
        Transaction.objects.create(
            account=account,
            category=category,
            date="2026-09-14",
            signed_amount_cents=-2500,
        )

        response = self.client.post(
            reverse("account-adjust-balance", args=[account.id]),
            {
                "target_balance_cents": 9000,
                "date": "2026-09-15",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        adjustment = Transaction.objects.get(
            transaction_type=Transaction.TransactionType.ADJUSTMENT
        )
        self.assertEqual(adjustment.signed_amount_cents, 1500)
        self.assertEqual(adjustment.category.name, "Adjustments")
        self.assertEqual(adjustment.note, "balance adjustment")
        self.assertEqual(str(adjustment.date), "2026-09-15")

        account_response = self.client.get(
            reverse("account-detail", args=[account.id])
        )
        self.assertEqual(account_response.data["balance_cents"], 9000)

    def test_adjust_balance_decrease_reuses_adjustments_category(self):
        account = Account.objects.create(
            name="Adjustment Savings",
            opening_balance_cents=10000,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        adjustment_category = Category.objects.create(name="Adjustments")

        response = self.client.post(
            reverse("account-adjust-balance", args=[account.id]),
            {
                "target_balance_cents": 6000,
                "date": "2026-09-15",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        adjustment = Transaction.objects.get(
            transaction_type=Transaction.TransactionType.ADJUSTMENT
        )
        self.assertEqual(adjustment.signed_amount_cents, -4000)
        self.assertEqual(adjustment.category, adjustment_category)
        self.assertEqual(Category.objects.filter(name="Adjustments").count(), 1)

    def test_adjust_balance_rejects_unchanged_target(self):
        account = Account.objects.create(
            name="Already Balanced",
            opening_balance_cents=10000,
            opening_balance_date="2026-01-01T00:00:00Z",
        )

        response = self.client.post(
            reverse("account-adjust-balance", args=[account.id]),
            {
                "target_balance_cents": 10000,
                "date": "2026-09-15",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("target_balance_cents", response.data)
        self.assertFalse(Transaction.objects.exists())
        self.assertFalse(Category.objects.filter(name="Adjustments").exists())

    def test_adjust_balance_validates_request_fields(self):
        account = Account.objects.create(name="Adjustment Validation")

        response = self.client.post(
            reverse("account-adjust-balance", args=[account.id]),
            {
                "target_balance_cents": "not-an-integer",
                "date": "not-a-date",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("target_balance_cents", response.data)
        self.assertIn("date", response.data)
        self.assertFalse(Transaction.objects.exists())

    def test_adjust_balance_requires_authentication(self):
        account = Account.objects.create(name="Private Adjustment")
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("account-adjust-balance", args=[account.id]),
            {
                "target_balance_cents": 1000,
                "date": "2026-09-15",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Transaction.objects.exists())


class CategoryApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="category-tests@example.com",
            password="strong-password-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_category(self):
        payload = {
            "name": "Groceries",
            "is_archived": False,
        }

        response = self.client.post(reverse("category-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], payload["name"])
        self.assertEqual(response.data["is_archived"], payload["is_archived"])

    def test_list_categories(self):
        self.client.post(
            reverse("category-list"),
            {
                "name": "Rent",
                "is_archived": False,
            },
            format="json",
        )

        response = self.client.get(reverse("category-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Rent")

    def test_list_categories_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("category-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ProductApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="product-tests@example.com",
            password="strong-password-123",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_product(self):
        payload = {
            "name": "Paper Towels",
            "default_unit": "pack",
            "is_archived": False,
        }

        response = self.client.post(reverse("product-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], payload["name"])
        self.assertEqual(response.data["default_unit"], payload["default_unit"])

    def test_list_products(self):
        Product.objects.create(name="Dish Soap", default_unit="bottle", is_archived=False)

        response = self.client.get(reverse("product-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Dish Soap")

    def test_search_products_matches_active_names_case_insensitively(self):
        matching_product = Product.objects.create(
            name="Laundry Detergent",
            default_unit="bottle",
        )
        Product.objects.create(name="Dish Soap", default_unit="bottle")

        response = self.client.get(reverse("product-list"), {"search": "DETER"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], matching_product.id)

    def test_search_products_excludes_archived_matches(self):
        Product.objects.create(name="Active Apples")
        Product.objects.create(name="Archived Apples", is_archived=True)

        response = self.client.get(reverse("product-list"), {"search": "apples"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Active Apples")

    def test_list_products_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("product-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ReceiptApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="receipt-tests@example.com",
            password="strong-password-123",
        )
        self.client.force_authenticate(user=self.user)
        self.account = Account.objects.create(
            name="Receipt Checking",
            account_type=Account.AccountType.CHECKING,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        self.category = Category.objects.create(name="Receipt Category")
        self.product = Product.objects.create(
            name="Receipt Product",
            default_unit="item",
        )
        self.transaction = Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-2500,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Target",
            category=self.category,
            account=self.account,
            transfer=None,
        )

    def create_existing_receipt(self):
        receipt = Receipt.objects.create(
            date="2026-03-05",
            store="Target",
            total_cents=2500,
            transaction=self.transaction,
        )
        item = ReceiptItem.objects.create(
            receipt=receipt,
            product=self.product,
            name_snapshot=self.product.name,
            qty="1.000",
            unit="item",
            unit_price_cents=2500,
            line_total_cents=2500,
        )
        return receipt, item

    def update_payload(self, item):
        return {
            "account": self.account.id,
            "category": self.category.id,
            "date": "2026-03-06",
            "store": "Updated Target",
            "tax_cents": 100,
            "fees_cents": 25,
            "items": [
                {
                    "id": item.id,
                    "product": self.product.id,
                    "qty": "2.000",
                    "unit": "item",
                    "unit_price_cents": 1000,
                    "line_total_cents": 2000,
                }
            ],
        }

    def test_create_receipt(self):
        payload = {
            "account": self.account.id,
            "category": self.category.id,
            "date": "2026-03-05",
            "store": "Target",
            "tax_cents": 200,
            "fees_cents": 50,
            "items": [
                {
                    "product": self.product.id,
                    "qty": "2.000",
                    "unit": "item",
                    "unit_price_cents": 1000,
                    "line_total_cents": 2000,
                }
            ],
        }

        response = self.client.post(reverse("receipt-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["store"], payload["store"])
        self.assertEqual(response.data["total_cents"], 2250)
        receipt = Receipt.objects.get(id=response.data["id"])
        self.assertEqual(receipt.items.count(), 1)
        self.assertEqual(receipt.items.get().name_snapshot, self.product.name)
        self.assertEqual(receipt.transaction.signed_amount_cents, -2250)
        self.assertEqual(receipt.transaction.merchant, payload["store"])

    def test_create_receipt_rejects_empty_items(self):
        response = self.client.post(
            reverse("receipt-list"),
            {
                "account": self.account.id,
                "category": self.category.id,
                "date": "2026-03-05",
                "items": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("items", response.data)

    def test_create_receipt_rejects_archived_product(self):
        archived_product = Product.objects.create(
            name="Archived Receipt Product",
            is_archived=True,
        )

        response = self.client.post(
            reverse("receipt-list"),
            {
                "account": self.account.id,
                "category": self.category.id,
                "date": "2026-03-05",
                "items": [
                    {
                        "product": archived_product.id,
                        "line_total_cents": 100,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("product", response.data["items"][0])

    def test_create_receipt_rejects_archived_category(self):
        archived_category = Category.objects.create(
            name="Archived Receipt Category",
            is_archived=True,
        )

        response = self.client.post(
            reverse("receipt-list"),
            {
                "account": self.account.id,
                "category": archived_category.id,
                "date": "2026-03-05",
                "items": [
                    {
                        "product": self.product.id,
                        "line_total_cents": 100,
                    }
                ],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", response.data)

    def test_list_receipts(self):
        Receipt.objects.create(
            date="2026-03-05",
            store="Costco",
            tax_cents=300,
            fees_cents=0,
            total_cents=4000,
            transaction=self.transaction,
        )

        response = self.client.get(reverse("receipt-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["store"], "Costco")

    def test_update_receipt_synchronizes_aggregate_and_preserves_item_id(self):
        receipt, item = self.create_existing_receipt()
        payload = self.update_payload(item)

        response = self.client.patch(
            reverse("receipt-detail", args=[receipt.id]),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        receipt.refresh_from_db()
        receipt.transaction.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(receipt.total_cents, 2125)
        self.assertEqual(receipt.store, "Updated Target")
        self.assertEqual(receipt.transaction.signed_amount_cents, -2125)
        self.assertEqual(receipt.transaction.merchant, "Updated Target")
        self.assertEqual(item.id, payload["items"][0]["id"])
        self.assertEqual(item.line_total_cents, 2000)

    def test_put_updates_receipt_through_aggregate_service(self):
        receipt, item = self.create_existing_receipt()

        response = self.client.put(
            reverse("receipt-detail", args=[receipt.id]),
            self.update_payload(item),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        receipt.refresh_from_db()
        self.assertEqual(receipt.total_cents, 2125)

    def test_partial_update_requires_complete_aggregate_payload(self):
        receipt, _ = self.create_existing_receipt()

        response = self.client.patch(
            reverse("receipt-detail", args=[receipt.id]),
            {"store": "Incomplete"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            set(response.data),
            {"account", "category", "date", "items"},
        )

    def test_update_preserves_existing_archived_category_and_product(self):
        receipt, item = self.create_existing_receipt()
        self.category.is_archived = True
        self.category.save(update_fields=["is_archived"])
        self.product.is_archived = True
        self.product.save(update_fields=["is_archived"])

        response = self.client.patch(
            reverse("receipt-detail", args=[receipt.id]),
            self.update_payload(item),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_rejects_different_archived_category(self):
        receipt, item = self.create_existing_receipt()
        archived_category = Category.objects.create(
            name="Archived Update Category",
            is_archived=True,
        )
        payload = self.update_payload(item)
        payload["category"] = archived_category.id

        response = self.client.patch(
            reverse("receipt-detail", args=[receipt.id]),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", response.data)

    def test_update_rejects_different_archived_product(self):
        receipt, item = self.create_existing_receipt()
        archived_product = Product.objects.create(
            name="Archived Update Product",
            is_archived=True,
        )
        payload = self.update_payload(item)
        payload["items"][0]["product"] = archived_product.id

        response = self.client.patch(
            reverse("receipt-detail", args=[receipt.id]),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("product", response.data["items"][0])

    def test_update_returns_conflict_for_foreign_item_id(self):
        receipt, item = self.create_existing_receipt()
        other_transaction = Transaction.objects.create(
            account=self.account,
            category=self.category,
            date="2026-03-05",
            signed_amount_cents=-100,
        )
        other_receipt = Receipt.objects.create(
            date="2026-03-05",
            total_cents=100,
            transaction=other_transaction,
        )
        foreign_item = ReceiptItem.objects.create(
            receipt=other_receipt,
            product=self.product,
            name_snapshot=self.product.name,
            line_total_cents=100,
        )
        payload = self.update_payload(item)
        payload["items"][0]["id"] = foreign_item.id

        response = self.client.patch(
            reverse("receipt-detail", args=[receipt.id]),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_update_returns_conflict_for_duplicate_item_id(self):
        receipt, item = self.create_existing_receipt()
        payload = self.update_payload(item)
        payload["items"].append(dict(payload["items"][0]))

        response = self.client.patch(
            reverse("receipt-detail", args=[receipt.id]),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_update_returns_conflict_for_malformed_linked_transaction(self):
        receipt, item = self.create_existing_receipt()
        self.transaction.transaction_type = Transaction.TransactionType.ADJUSTMENT
        self.transaction.save(update_fields=["transaction_type"])

        response = self.client.patch(
            reverse("receipt-detail", args=[receipt.id]),
            self.update_payload(item),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_delete_receipt_removes_aggregate(self):
        receipt, item = self.create_existing_receipt()

        response = self.client.delete(
            reverse("receipt-detail", args=[receipt.id])
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Receipt.objects.filter(id=receipt.id).exists())
        self.assertFalse(ReceiptItem.objects.filter(id=item.id).exists())
        self.assertFalse(Transaction.objects.filter(id=self.transaction.id).exists())

    def test_delete_receipt_returns_conflict_for_malformed_transaction(self):
        receipt, _ = self.create_existing_receipt()
        self.transaction.transaction_type = Transaction.TransactionType.ADJUSTMENT
        self.transaction.save(update_fields=["transaction_type"])

        response = self.client.delete(
            reverse("receipt-detail", args=[receipt.id])
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Receipt.objects.filter(id=receipt.id).exists())
        self.assertTrue(Transaction.objects.filter(id=self.transaction.id).exists())

    def test_delete_receipt_requires_authentication(self):
        receipt, _ = self.create_existing_receipt()
        self.client.force_authenticate(user=None)

        response = self.client.delete(
            reverse("receipt-detail", args=[receipt.id])
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Receipt.objects.filter(id=receipt.id).exists())

    def test_list_receipts_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("receipt-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ReceiptItemApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="receipt-item-tests@example.com",
            password="strong-password-123",
        )
        self.client.force_authenticate(user=self.user)
        self.account = Account.objects.create(
            name="ReceiptItem Checking",
            account_type=Account.AccountType.CHECKING,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        self.category = Category.objects.create(name="ReceiptItem Category")
        self.transaction = Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-2500,
            transaction_type=Transaction.TransactionType.NORMAL,
            category=self.category,
            account=self.account,
            transfer=None,
        )
        self.receipt = Receipt.objects.create(
            date="2026-03-05",
            store="Walmart",
            tax_cents=100,
            fees_cents=0,
            total_cents=2500,
            transaction=self.transaction,
        )
        self.product = Product.objects.create(name="Laundry Detergent", default_unit="bottle")

    def test_direct_receipt_item_creation_is_not_allowed(self):
        payload = {
            "receipt": self.receipt.id,
            "product": self.product.id,
            "name_snapshot": "Laundry Detergent",
            "qty": "1.000",
            "unit": "bottle",
            "unit_price_cents": 1299,
            "line_total_cents": 1299,
        }

        response = self.client.post(reverse("receipt-item-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_list_receipt_items(self):
        ReceiptItem.objects.create(
            receipt=self.receipt,
            product=self.product,
            name_snapshot="Laundry Detergent",
            qty="1.000",
            unit="bottle",
            unit_price_cents=1299,
            line_total_cents=1299,
        )

        response = self.client.get(reverse("receipt-item-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name_snapshot"], "Laundry Detergent")

    def test_direct_receipt_item_update_is_not_allowed(self):
        item = ReceiptItem.objects.create(
            receipt=self.receipt,
            product=self.product,
            name_snapshot=self.product.name,
            line_total_cents=1299,
        )

        response = self.client.patch(
            reverse("receipt-item-detail", args=[item.id]),
            {"line_total_cents": 9999},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_direct_receipt_item_deletion_is_not_allowed(self):
        item = ReceiptItem.objects.create(
            receipt=self.receipt,
            product=self.product,
            name_snapshot=self.product.name,
            line_total_cents=1299,
        )

        response = self.client.delete(
            reverse("receipt-item-detail", args=[item.id])
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(ReceiptItem.objects.filter(id=item.id).exists())

    def test_list_receipt_items_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("receipt-item-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ReceiptServiceTests(APITestCase):
    def setUp(self):
        self.account = Account.objects.create(
            name="Receipt Service Checking",
            account_type=Account.AccountType.CHECKING,
            is_liability=False,
        )
        self.category = Category.objects.create(name="Receipt Service Category")
        self.product = Product.objects.create(
            name="Receipt Service Product",
            default_unit="item",
        )

    def receipt_items(self):
        return [
            {
                "line_total_cents": 1800,
                "name_snapshot": self.product.name,
                "product": self.product,
                "qty": "2.000",
                "unit": "item",
                "unit_price_cents": 900,
            }
        ]

    def test_create_receipt_derives_total_and_asset_transaction(self):
        receipt = create_receipt(
            account=self.account,
            category=self.category,
            date="2026-10-14",
            fees_cents=50,
            items=self.receipt_items(),
            note="Weekly shop",
            store="Market",
            tax_cents=200,
        )

        self.assertEqual(receipt.total_cents, 2050)
        self.assertEqual(receipt.items.count(), 1)
        self.assertEqual(receipt.items.get().name_snapshot, self.product.name)
        self.assertEqual(receipt.transaction.account, self.account)
        self.assertEqual(receipt.transaction.category, self.category)
        self.assertEqual(receipt.transaction.merchant, "Market")
        self.assertEqual(receipt.transaction.note, "Weekly shop")
        self.assertEqual(receipt.transaction.signed_amount_cents, -2050)
        self.assertEqual(
            receipt.transaction.transaction_type,
            Transaction.TransactionType.NORMAL,
        )

    def test_create_receipt_uses_positive_transaction_for_liability(self):
        liability_account = Account.objects.create(
            name="Receipt Service Credit Card",
            account_type=Account.AccountType.CREDIT_CARD,
            is_liability=True,
        )

        receipt = create_receipt(
            account=liability_account,
            category=self.category,
            date="2026-10-14",
            items=self.receipt_items(),
        )

        self.assertEqual(receipt.transaction.signed_amount_cents, 1800)

    def test_create_receipt_rolls_back_when_item_creation_fails(self):
        with patch(
            "finance.services.ReceiptItem.objects.bulk_create",
            side_effect=RuntimeError("item creation failed"),
        ):
            with self.assertRaisesRegex(RuntimeError, "item creation failed"):
                create_receipt(
                    account=self.account,
                    category=self.category,
                    date="2026-10-14",
                    items=self.receipt_items(),
                )

        self.assertEqual(Transaction.objects.count(), 0)
        self.assertEqual(Receipt.objects.count(), 0)
        self.assertEqual(ReceiptItem.objects.count(), 0)

    def test_update_receipt_reconciles_items_and_linked_transaction(self):
        receipt = create_receipt(
            account=self.account,
            category=self.category,
            date="2026-10-14",
            items=self.receipt_items(),
            store="Original Market",
        )
        existing_item = receipt.items.get()
        removed_item = ReceiptItem.objects.create(
            receipt=receipt,
            product=self.product,
            name_snapshot="Removed item",
            line_total_cents=100,
        )
        liability_account = Account.objects.create(
            name="Receipt Update Credit Card",
            account_type=Account.AccountType.CREDIT_CARD,
            is_liability=True,
        )
        new_product = Product.objects.create(name="Receipt Update Product")

        updated_receipt = update_receipt(
            receipt.id,
            account=liability_account,
            category=self.category,
            date="2026-10-15",
            fees_cents=25,
            items=[
                {
                    "id": existing_item.id,
                    "line_total_cents": 2000,
                    "name_snapshot": self.product.name,
                    "product": self.product,
                    "qty": "2.000",
                    "unit": "item",
                    "unit_price_cents": 1000,
                },
                {
                    "line_total_cents": 500,
                    "name_snapshot": new_product.name,
                    "product": new_product,
                },
            ],
            note="Updated shop",
            store="Updated Market",
            tax_cents=100,
        )

        updated_receipt.refresh_from_db()
        updated_receipt.transaction.refresh_from_db()
        self.assertEqual(updated_receipt.total_cents, 2625)
        self.assertEqual(updated_receipt.store, "Updated Market")
        self.assertEqual(updated_receipt.transaction.account, liability_account)
        self.assertEqual(updated_receipt.transaction.merchant, "Updated Market")
        self.assertEqual(updated_receipt.transaction.note, "Updated shop")
        self.assertEqual(updated_receipt.transaction.signed_amount_cents, 2625)
        self.assertTrue(updated_receipt.items.filter(id=existing_item.id).exists())
        self.assertFalse(updated_receipt.items.filter(id=removed_item.id).exists())
        self.assertEqual(updated_receipt.items.count(), 2)

    def test_update_receipt_rejects_malformed_linked_transaction(self):
        receipt = create_receipt(
            account=self.account,
            category=self.category,
            date="2026-10-14",
            items=self.receipt_items(),
        )
        receipt.transaction.transaction_type = Transaction.TransactionType.ADJUSTMENT
        receipt.transaction.save(update_fields=["transaction_type"])

        with self.assertRaisesRegex(
            ReceiptIntegrityError,
            "Receipt transaction is malformed",
        ):
            update_receipt(
                receipt.id,
                account=self.account,
                category=self.category,
                date="2026-10-15",
                items=self.receipt_items(),
            )

    def test_update_receipt_rolls_back_when_item_creation_fails(self):
        receipt = create_receipt(
            account=self.account,
            category=self.category,
            date="2026-10-14",
            items=self.receipt_items(),
            store="Original Market",
        )
        original_item = receipt.items.get()

        with patch(
            "finance.services.ReceiptItem.objects.bulk_create",
            side_effect=RuntimeError("item creation failed"),
        ):
            with self.assertRaisesRegex(RuntimeError, "item creation failed"):
                update_receipt(
                    receipt.id,
                    account=self.account,
                    category=self.category,
                    date="2026-10-15",
                    items=self.receipt_items(),
                    store="Updated Market",
                )

        receipt.refresh_from_db()
        receipt.transaction.refresh_from_db()
        self.assertEqual(str(receipt.date), "2026-10-14")
        self.assertEqual(receipt.store, "Original Market")
        self.assertEqual(receipt.transaction.merchant, "Original Market")
        self.assertTrue(receipt.items.filter(id=original_item.id).exists())

    def test_delete_receipt_removes_items_and_linked_transaction(self):
        receipt = create_receipt(
            account=self.account,
            category=self.category,
            date="2026-10-14",
            items=self.receipt_items(),
        )
        receipt_id = receipt.id
        transaction_id = receipt.transaction_id
        item_id = receipt.items.get().id

        delete_receipt(receipt_id)

        self.assertFalse(Receipt.objects.filter(id=receipt_id).exists())
        self.assertFalse(ReceiptItem.objects.filter(id=item_id).exists())
        self.assertFalse(Transaction.objects.filter(id=transaction_id).exists())

    def test_delete_receipt_rejects_malformed_linked_transaction(self):
        receipt = create_receipt(
            account=self.account,
            category=self.category,
            date="2026-10-14",
            items=self.receipt_items(),
        )
        receipt.transaction.transaction_type = Transaction.TransactionType.ADJUSTMENT
        receipt.transaction.save(update_fields=["transaction_type"])

        with self.assertRaisesRegex(
            ReceiptIntegrityError,
            "Receipt transaction is malformed",
        ):
            delete_receipt(receipt.id)

        self.assertTrue(Receipt.objects.filter(id=receipt.id).exists())
        self.assertTrue(
            Transaction.objects.filter(id=receipt.transaction_id).exists()
        )

    def test_delete_receipt_rolls_back_when_transaction_deletion_fails(self):
        receipt = create_receipt(
            account=self.account,
            category=self.category,
            date="2026-10-14",
            items=self.receipt_items(),
        )
        receipt_id = receipt.id
        transaction_id = receipt.transaction_id
        item_id = receipt.items.get().id

        with patch(
            "finance.services.Transaction.delete",
            side_effect=IntegrityError("simulated transaction deletion failure"),
        ):
            with self.assertRaises(IntegrityError):
                delete_receipt(receipt_id)

        self.assertTrue(Receipt.objects.filter(id=receipt_id).exists())
        self.assertTrue(ReceiptItem.objects.filter(id=item_id).exists())
        self.assertTrue(Transaction.objects.filter(id=transaction_id).exists())


class TransferApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="transfer-tests@example.com",
            password="strong-password-123",
        )
        self.client.force_authenticate(user=self.user)
        self.from_account = Account.objects.create(
            name="Transfer Source",
            account_type=Account.AccountType.CHECKING,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        self.to_account = Account.objects.create(
            name="Transfer Destination",
            account_type=Account.AccountType.SAVINGS,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )

    def test_create_transfer_creates_header_and_two_postings(self):
        payload = {
            "date": "2026-03-05",
            "occurred_at": "2026-03-05T15:30:00Z",
            "amount_cents": 10000,
            "from_account": self.from_account.id,
            "to_account": self.to_account.id,
            "note": "Move cash",
        }

        response = self.client.post(reverse("transfer-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        transfer = Transfer.objects.get(id=response.data["id"])
        postings = list(transfer.transactions.order_by("account_id"))
        postings_by_account = {posting.account_id: posting for posting in postings}

        self.assertEqual(len(postings), 2)
        self.assertEqual(
            postings_by_account[self.from_account.id].signed_amount_cents,
            -10000,
        )
        self.assertEqual(
            postings_by_account[self.to_account.id].signed_amount_cents,
            10000,
        )
        for posting in postings:
            self.assertEqual(str(posting.date), payload["date"])
            self.assertEqual(
                posting.occurred_at.isoformat().replace("+00:00", "Z"),
                payload["occurred_at"],
            )
            self.assertEqual(
                posting.transaction_type,
                Transaction.TransactionType.TRANSFER,
            )
            self.assertIsNone(posting.category)
            self.assertIsNone(posting.merchant)
            self.assertIsNone(posting.note)

    def test_transfer_posting_signs_follow_account_roles(self):
        cases = [
            (False, False, -2500, 2500),
            (False, True, -2500, -2500),
            (True, False, 2500, 2500),
            (True, True, 2500, -2500),
        ]

        for index, (
            source_is_liability,
            destination_is_liability,
            expected_source,
            expected_destination,
        ) in enumerate(cases):
            with self.subTest(
                source_is_liability=source_is_liability,
                destination_is_liability=destination_is_liability,
            ):
                source = Account.objects.create(
                    name=f"Source {index}",
                    account_type=Account.AccountType.OTHER,
                    is_liability=source_is_liability,
                    opening_balance_cents=0,
                    opening_balance_date="2026-01-01T00:00:00Z",
                )
                destination = Account.objects.create(
                    name=f"Destination {index}",
                    account_type=Account.AccountType.OTHER,
                    is_liability=destination_is_liability,
                    opening_balance_cents=0,
                    opening_balance_date="2026-01-01T00:00:00Z",
                )

                response = self.client.post(
                    reverse("transfer-list"),
                    {
                        "date": "2026-03-05",
                        "amount_cents": 2500,
                        "from_account": source.id,
                        "to_account": destination.id,
                    },
                    format="json",
                )

                self.assertEqual(response.status_code, status.HTTP_201_CREATED)
                postings = {
                    posting.account_id: posting.signed_amount_cents
                    for posting in Transaction.objects.filter(
                        transfer_id=response.data["id"]
                    )
                }
                self.assertEqual(postings[source.id], expected_source)
                self.assertEqual(postings[destination.id], expected_destination)

    def test_create_transfer_rolls_back_when_a_posting_fails(self):
        original_create = Transaction.objects.create
        call_count = 0

        def fail_second_posting(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                raise IntegrityError("simulated posting failure")
            return original_create(*args, **kwargs)

        with patch(
            "finance.services.Transaction.objects.create",
            side_effect=fail_second_posting,
        ):
            with self.assertRaises(IntegrityError):
                self.client.post(
                    reverse("transfer-list"),
                    {
                        "date": "2026-03-05",
                        "amount_cents": 10000,
                        "from_account": self.from_account.id,
                        "to_account": self.to_account.id,
                    },
                    format="json",
                )

        self.assertFalse(Transfer.objects.exists())
        self.assertFalse(Transaction.objects.exists())

    def test_transfer_rejects_duplicate_posting_for_same_account(self):
        response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 10000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        transfer = Transfer.objects.get(id=response.data["id"])

        with self.assertRaises(IntegrityError):
            with db_transaction.atomic():
                Transaction.objects.create(
                    date=transfer.date,
                    signed_amount_cents=-transfer.amount_cents,
                    transaction_type=Transaction.TransactionType.TRANSFER,
                    category=None,
                    account=self.from_account,
                    transfer=transfer,
                )

        self.assertEqual(transfer.transactions.count(), 2)

    def test_create_transfer_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 10000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Transfer.objects.exists())
        self.assertFalse(Transaction.objects.exists())

    def test_list_transfers(self):
        Transfer.objects.create(
            date="2026-03-05",
            amount_cents=5000,
            from_account=self.from_account,
            to_account=self.to_account,
        )

        response = self.client.get(reverse("transfer-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["amount_cents"], 5000)

    def test_list_transfers_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("transfer-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_transfer_updates_header_and_postings(self):
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
                "note": "Original note",
            },
            format="json",
        )
        transfer_id = create_response.data["id"]

        response = self.client.patch(
            reverse("transfer-detail", args=[transfer_id]),
            {
                "date": "2026-03-06",
                "occurred_at": "2026-03-06T16:45:00Z",
                "amount_cents": 7500,
                "note": "Updated note",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transfer = Transfer.objects.get(id=transfer_id)
        self.assertEqual(str(transfer.date), "2026-03-06")
        self.assertEqual(transfer.amount_cents, 7500)
        self.assertEqual(transfer.note, "Updated note")
        postings = {
            posting.account_id: posting
            for posting in transfer.transactions.all()
        }
        self.assertEqual(
            postings[self.from_account.id].signed_amount_cents,
            -7500,
        )
        self.assertEqual(
            postings[self.to_account.id].signed_amount_cents,
            7500,
        )
        for posting in postings.values():
            self.assertEqual(str(posting.date), "2026-03-06")
            self.assertEqual(
                posting.occurred_at.isoformat().replace("+00:00", "Z"),
                "2026-03-06T16:45:00Z",
            )

    def test_update_transfer_recalculates_signs_for_changed_account(self):
        liability_account = Account.objects.create(
            name="Transfer Liability",
            account_type=Account.AccountType.CREDIT_CARD,
            is_liability=True,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = create_response.data["id"]

        response = self.client.patch(
            reverse("transfer-detail", args=[transfer_id]),
            {"to_account": liability_account.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        postings = {
            posting.account_id: posting.signed_amount_cents
            for posting in Transaction.objects.filter(transfer_id=transfer_id)
        }
        self.assertEqual(
            postings,
            {
                self.from_account.id: -5000,
                liability_account.id: -5000,
            },
        )

    def test_update_transfer_can_reverse_source_and_destination(self):
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = create_response.data["id"]
        posting_ids = {
            posting.account_id: posting.id
            for posting in Transaction.objects.filter(transfer_id=transfer_id)
        }

        response = self.client.patch(
            reverse("transfer-detail", args=[transfer_id]),
            {
                "from_account": self.to_account.id,
                "to_account": self.from_account.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        postings = {
            posting.account_id: posting
            for posting in Transaction.objects.filter(transfer_id=transfer_id)
        }
        self.assertEqual(postings[self.to_account.id].signed_amount_cents, -5000)
        self.assertEqual(postings[self.from_account.id].signed_amount_cents, 5000)
        self.assertEqual(postings[self.to_account.id].id, posting_ids[self.to_account.id])
        self.assertEqual(postings[self.from_account.id].id, posting_ids[self.from_account.id])

    def test_update_transfer_rejects_malformed_existing_postings(self):
        transfer = Transfer.objects.create(
            date="2026-03-05",
            amount_cents=5000,
            from_account=self.from_account,
            to_account=self.to_account,
        )

        response = self.client.patch(
            reverse("transfer-detail", args=[transfer.id]),
            {"amount_cents": 7500},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        transfer.refresh_from_db()
        self.assertEqual(transfer.amount_cents, 5000)

    def test_update_transfer_rolls_back_when_posting_update_fails(self):
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = create_response.data["id"]

        with patch(
            "finance.services.Transaction.objects.bulk_update",
            side_effect=IntegrityError("simulated posting update failure"),
        ):
            with self.assertRaises(IntegrityError):
                self.client.patch(
                    reverse("transfer-detail", args=[transfer_id]),
                    {"amount_cents": 7500},
                    format="json",
                )

        transfer = Transfer.objects.get(id=transfer_id)
        self.assertEqual(transfer.amount_cents, 5000)
        self.assertEqual(
            set(
                transfer.transactions.values_list(
                    "signed_amount_cents",
                    flat=True,
                )
            ),
            {-5000, 5000},
        )

    def test_update_transfer_requires_authentication(self):
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = create_response.data["id"]
        self.client.force_authenticate(user=None)

        response = self.client.patch(
            reverse("transfer-detail", args=[transfer_id]),
            {"amount_cents": 7500},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        transfer = Transfer.objects.get(id=transfer_id)
        self.assertEqual(transfer.amount_cents, 5000)

    def test_delete_transfer_removes_header_and_both_postings(self):
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = create_response.data["id"]
        posting_ids = list(
            Transaction.objects.filter(transfer_id=transfer_id).values_list(
                "id",
                flat=True,
            )
        )

        response = self.client.delete(
            reverse("transfer-detail", args=[transfer_id])
        )

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Transfer.objects.filter(id=transfer_id).exists())
        self.assertFalse(Transaction.objects.filter(id__in=posting_ids).exists())

    def test_delete_transfer_rejects_header_without_postings(self):
        transfer = Transfer.objects.create(
            date="2026-03-05",
            amount_cents=5000,
            from_account=self.from_account,
            to_account=self.to_account,
        )

        response = self.client.delete(
            reverse("transfer-detail", args=[transfer.id])
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(
            response.data["detail"],
            "Transfer postings are malformed and cannot be modified.",
        )
        self.assertTrue(Transfer.objects.filter(id=transfer.id).exists())

    def test_delete_transfer_rejects_malformed_posting(self):
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = create_response.data["id"]
        Transaction.objects.filter(
            transfer_id=transfer_id,
            account=self.from_account,
        ).update(signed_amount_cents=-2500)

        response = self.client.delete(
            reverse("transfer-detail", args=[transfer_id])
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertTrue(Transfer.objects.filter(id=transfer_id).exists())
        self.assertEqual(
            Transaction.objects.filter(transfer_id=transfer_id).count(),
            2,
        )

    def test_delete_transfer_rolls_back_when_header_deletion_fails(self):
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = create_response.data["id"]

        with patch(
            "finance.services.Transfer.delete",
            side_effect=IntegrityError("simulated header deletion failure"),
        ):
            with self.assertRaises(IntegrityError):
                self.client.delete(
                    reverse("transfer-detail", args=[transfer_id])
                )

        self.assertTrue(Transfer.objects.filter(id=transfer_id).exists())
        self.assertEqual(
            Transaction.objects.filter(transfer_id=transfer_id).count(),
            2,
        )

    def test_delete_transfer_requires_authentication(self):
        create_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = create_response.data["id"]
        self.client.force_authenticate(user=None)

        response = self.client.delete(
            reverse("transfer-detail", args=[transfer_id])
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Transfer.objects.filter(id=transfer_id).exists())
        self.assertEqual(
            Transaction.objects.filter(transfer_id=transfer_id).count(),
            2,
        )

    def test_transfer_amount_must_be_positive(self):
        payload = {
            "date": "2026-03-05",
            "amount_cents": 0,
            "from_account": self.from_account.id,
            "to_account": self.to_account.id,
        }

        serializer = TransferSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["amount_cents"][0],
            "amount_cents must be greater than zero.",
        )

    def test_transfer_accounts_must_differ(self):
        payload = {
            "date": "2026-03-05",
            "amount_cents": 1000,
            "from_account": self.from_account.id,
            "to_account": self.from_account.id,
        }

        serializer = TransferSerializer(data=payload)

        self.assertFalse(serializer.is_valid())
        self.assertEqual(
            serializer.errors["to_account"][0],
            "to_account must be different from from_account.",
        )


class LedgerEventApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ledger-event-tests@example.com",
            password="strong-password-123",
        )
        self.client.force_authenticate(user=self.user)
        self.from_account = Account.objects.create(
            name="Ledger Source",
            account_type=Account.AccountType.CHECKING,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        self.to_account = Account.objects.create(
            name="Ledger Destination",
            account_type=Account.AccountType.SAVINGS,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        self.category = Category.objects.create(name="Ledger Events")

    def test_list_ledger_events_returns_one_row_per_logical_event(self):
        normal = Transaction.objects.create(
            date="2026-03-04",
            signed_amount_cents=-1200,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Market",
            category=self.category,
            account=self.from_account,
        )
        adjustment = Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=300,
            transaction_type=Transaction.TransactionType.ADJUSTMENT,
            note="balance adjustment",
            category=self.category,
            account=self.from_account,
        )
        transfer_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-06",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
                "note": "Move cash",
            },
            format="json",
        )
        transfer_id = transfer_response.data["id"]

        response = self.client.get(reverse("ledger-event-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 3)
        self.assertEqual(len(response.data["results"]), 3)
        self.assertEqual(Transaction.objects.count(), 4)

        transfer_event, adjustment_event, normal_event = response.data["results"]
        self.assertEqual(transfer_event["event_type"], "transfer")
        self.assertEqual(transfer_event["id"], transfer_id)
        self.assertEqual(transfer_event["transaction_type"], "transfer")
        self.assertEqual(transfer_event["amount_cents"], 5000)
        self.assertEqual(transfer_event["note"], "Move cash")
        self.assertEqual(transfer_event["from_account_id"], self.from_account.id)
        self.assertEqual(transfer_event["from_account_name"], self.from_account.name)
        self.assertEqual(transfer_event["to_account_id"], self.to_account.id)
        self.assertEqual(transfer_event["to_account_name"], self.to_account.name)
        self.assertIsNone(transfer_event["category_id"])
        self.assertIsNone(transfer_event["account_id"])

        self.assertEqual(adjustment_event["event_type"], "transaction")
        self.assertEqual(adjustment_event["id"], adjustment.id)
        self.assertEqual(adjustment_event["transaction_type"], "adjustment")
        self.assertEqual(adjustment_event["amount_cents"], 300)
        self.assertEqual(adjustment_event["account_name"], self.from_account.name)

        self.assertEqual(normal_event["event_type"], "transaction")
        self.assertEqual(normal_event["id"], normal.id)
        self.assertEqual(normal_event["transaction_type"], "normal")
        self.assertEqual(normal_event["merchant"], "Market")
        self.assertEqual(normal_event["category_name"], self.category.name)

    def test_ledger_event_pagination_never_duplicates_transfer_postings(self):
        for index in range(20):
            Transaction.objects.create(
                date="2026-03-05",
                signed_amount_cents=100 + index,
                transaction_type=Transaction.TransactionType.NORMAL,
                category=self.category,
                account=self.from_account,
            )
        transfer_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer_id = transfer_response.data["id"]

        first_page = self.client.get(reverse("ledger-event-list"))
        second_page = self.client.get(reverse("ledger-event-list"), {"page": 2})

        self.assertEqual(first_page.status_code, status.HTTP_200_OK)
        self.assertEqual(second_page.status_code, status.HTTP_200_OK)
        self.assertEqual(first_page.data["count"], 21)
        self.assertEqual(second_page.data["count"], 21)
        self.assertEqual(len(first_page.data["results"]), 20)
        self.assertEqual(len(second_page.data["results"]), 1)

        events = first_page.data["results"] + second_page.data["results"]
        event_keys = {(event["event_type"], event["id"]) for event in events}
        self.assertEqual(len(event_keys), 21)
        self.assertEqual(
            len(
                [
                    event
                    for event in events
                    if event["event_type"] == "transfer"
                    and event["id"] == transfer_id
                ]
            ),
            1,
        )
        self.assertEqual(
            len(
                [
                event
                for event in events
                if event["event_type"] == "transfer"
                ]
            ),
            1,
        )

    def test_ledger_event_search_matches_transaction_fields(self):
        matching_transaction = Transaction.objects.create(
            date="2026-03-04",
            signed_amount_cents=-1200,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Neighborhood Market",
            category=self.category,
            account=self.from_account,
        )
        Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-800,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Coffee Shop",
            category=self.category,
            account=self.from_account,
        )

        response = self.client.get(
            reverse("ledger-event-list"),
            {"search": "market"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["event_type"], "transaction")
        self.assertEqual(response.data["results"][0]["id"], matching_transaction.id)

    def test_ledger_event_search_matches_transfer_account_names(self):
        transfer_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-06",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-800,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Coffee Shop",
            category=self.category,
            account=self.from_account,
        )

        response = self.client.get(
            reverse("ledger-event-list"),
            {"search": "destination"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["event_type"], "transfer")
        self.assertEqual(response.data["results"][0]["id"], transfer_response.data["id"])

    def test_ledger_event_search_returns_empty_page_for_no_matches(self):
        Transaction.objects.create(
            date="2026-03-04",
            signed_amount_cents=-1200,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Neighborhood Market",
            category=self.category,
            account=self.from_account,
        )

        response = self.client.get(
            reverse("ledger-event-list"),
            {"search": "no matching ledger event"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_ledger_event_sort_modes_order_logical_events(self):
        alpha = Transaction.objects.create(
            date="2026-03-01",
            signed_amount_cents=-500,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Alpha",
            category=self.category,
            account=self.from_account,
        )
        adjustment = Transaction.objects.create(
            date="2026-03-02",
            signed_amount_cents=300,
            transaction_type=Transaction.TransactionType.ADJUSTMENT,
            category=self.category,
            account=self.from_account,
        )
        zulu = Transaction.objects.create(
            date="2026-03-03",
            signed_amount_cents=100,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Zulu",
            category=self.category,
            account=self.from_account,
        )
        transfer_response = self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-04",
                "amount_cents": 700,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )
        transfer = ("transfer", transfer_response.data["id"])
        alpha_event = ("transaction", alpha.id)
        adjustment_event = ("transaction", adjustment.id)
        zulu_event = ("transaction", zulu.id)
        expected_orders = {
            "latest": [transfer, zulu_event, adjustment_event, alpha_event],
            "oldest": [alpha_event, adjustment_event, zulu_event, transfer],
            "a-to-z": [alpha_event, adjustment_event, transfer, zulu_event],
            "z-to-a": [zulu_event, transfer, adjustment_event, alpha_event],
            "highest": [transfer, adjustment_event, zulu_event, alpha_event],
            "lowest": [alpha_event, zulu_event, adjustment_event, transfer],
            "invalid": [transfer, zulu_event, adjustment_event, alpha_event],
        }

        for sort, expected_order in expected_orders.items():
            with self.subTest(sort=sort):
                response = self.client.get(
                    reverse("ledger-event-list"),
                    {"sort": sort},
                )

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(
                    [
                        (event["event_type"], event["id"])
                        for event in response.data["results"]
                    ],
                    expected_order,
                )

    def test_ledger_event_category_filter_matches_transactions_and_excludes_transfers(self):
        matching_transaction = Transaction.objects.create(
            date="2026-03-04",
            signed_amount_cents=-1200,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Market",
            category=self.category,
            account=self.from_account,
        )
        other_category = Category.objects.create(name="Other Ledger Events")
        Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-800,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Coffee Shop",
            category=other_category,
            account=self.from_account,
        )
        self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-06",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )

        response = self.client.get(
            reverse("ledger-event-list"),
            {"category": self.category.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["event_type"], "transaction")
        self.assertEqual(response.data["results"][0]["id"], matching_transaction.id)

    def test_ledger_event_category_filter_returns_empty_page_for_no_matches(self):
        Transaction.objects.create(
            date="2026-03-04",
            signed_amount_cents=-1200,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Market",
            category=self.category,
            account=self.from_account,
        )

        response = self.client.get(
            reverse("ledger-event-list"),
            {"category": 999999},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_ledger_event_malformed_category_filter_falls_back_to_all_events(self):
        Transaction.objects.create(
            date="2026-03-04",
            signed_amount_cents=-1200,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Market",
            category=self.category,
            account=self.from_account,
        )
        self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-06",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )

        response = self.client.get(
            reverse("ledger-event-list"),
            {"category": "not-a-category"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_ledger_event_query_options_work_together_before_pagination(self):
        matching_transactions = []
        for index in range(21):
            matching_transactions.append(
                Transaction.objects.create(
                    date="2026-03-04",
                    signed_amount_cents=100 + index,
                    transaction_type=Transaction.TransactionType.NORMAL,
                    merchant=f"Combined Match {index}",
                    category=self.category,
                    account=self.from_account,
                )
            )

        other_category = Category.objects.create(name="Other Combined Category")
        Transaction.objects.create(
            date="2026-03-04",
            signed_amount_cents=50,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Combined Match Other Category",
            category=other_category,
            account=self.from_account,
        )
        self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-04",
                "amount_cents": 25,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
                "note": "Combined Match Transfer",
            },
            format="json",
        )

        response = self.client.get(
            reverse("ledger-event-list"),
            {
                "category": self.category.id,
                "page": 2,
                "search": "combined match",
                "sort": "lowest",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 21)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["event_type"], "transaction")
        self.assertEqual(
            response.data["results"][0]["id"],
            matching_transactions[-1].id,
        )

    def test_list_ledger_events_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("ledger-event-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class TransactionApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="transaction-tests@example.com",
            password="strong-password-123",
        )
        self.client.force_authenticate(user=self.user)
        self.account = Account.objects.create(
            name="Primary Checking",
            account_type=Account.AccountType.CHECKING,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        self.secondary_account = Account.objects.create(
            name="Primary Savings",
            account_type=Account.AccountType.SAVINGS,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        self.category = Category.objects.create(name="General")
        self.transfer = Transfer.objects.create(
            date="2026-03-05",
            amount_cents=1000,
            from_account=self.account,
            to_account=self.secondary_account,
        )

    def create_transfer_posting(self):
        return Transaction.objects.create(
            date=self.transfer.date,
            signed_amount_cents=-self.transfer.amount_cents,
            transaction_type=Transaction.TransactionType.TRANSFER,
            category=None,
            account=self.account,
            transfer=self.transfer,
        )

    def test_transfer_posting_serializes_null_category(self):
        transaction = self.create_transfer_posting()

        response = self.client.get(
            reverse("transaction-detail", args=[transaction.id])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["category"])
        self.assertIsNone(response.data["category_name"])

    def test_transfer_posting_rejects_category_at_database_boundary(self):
        with self.assertRaises(IntegrityError):
            with db_transaction.atomic():
                Transaction.objects.create(
                    date=self.transfer.date,
                    signed_amount_cents=-self.transfer.amount_cents,
                    transaction_type=Transaction.TransactionType.TRANSFER,
                    category=self.category,
                    account=self.account,
                    transfer=self.transfer,
                )

    def test_non_transfer_postings_require_category_at_database_boundary(self):
        for transaction_type in (
            Transaction.TransactionType.NORMAL,
            Transaction.TransactionType.ADJUSTMENT,
        ):
            with self.subTest(transaction_type=transaction_type):
                with self.assertRaises(IntegrityError):
                    with db_transaction.atomic():
                        Transaction.objects.create(
                            date="2026-03-05",
                            signed_amount_cents=1000,
                            transaction_type=transaction_type,
                            category=None,
                            account=self.account,
                        )

    def test_create_transaction(self):
        payload = {
            "date": "2026-03-05",
            "signed_amount_cents": -2599,
            "transaction_type": "normal",
            "merchant": "Trader Joe's",
            "note": "Weekly groceries",
            "category": self.category.id,
            "account": self.account.id,
            "transfer": None,
        }

        response = self.client.post(reverse("transaction-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["signed_amount_cents"], payload["signed_amount_cents"])
        self.assertEqual(response.data["transaction_type"], payload["transaction_type"])

    def test_update_normal_transaction(self):
        updated_category = Category.objects.create(name="Groceries")
        transaction = Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-2599,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Trader Joe's",
            note="Weekly groceries",
            category=self.category,
            account=self.account,
        )
        payload = {
            "date": "2026-03-06",
            "signed_amount_cents": -3199,
            "merchant": "Whole Foods",
            "note": "Updated grocery trip",
            "category": updated_category.id,
            "account": self.secondary_account.id,
        }

        response = self.client.patch(
            reverse("transaction-detail", args=[transaction.id]),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transaction.refresh_from_db()
        self.assertEqual(str(transaction.date), payload["date"])
        self.assertEqual(transaction.signed_amount_cents, payload["signed_amount_cents"])
        self.assertEqual(transaction.merchant, payload["merchant"])
        self.assertEqual(transaction.note, payload["note"])
        self.assertEqual(transaction.category, updated_category)
        self.assertEqual(transaction.account, self.secondary_account)
        self.assertEqual(transaction.transaction_type, Transaction.TransactionType.NORMAL)
        self.assertEqual(response.data["category_name"], updated_category.name)
        self.assertEqual(response.data["account_name"], self.secondary_account.name)

    def test_create_transaction_rejects_archived_category(self):
        archived_category = Category.objects.create(
            name="Archived",
            is_archived=True,
        )

        response = self.client.post(
            reverse("transaction-list"),
            {
                "date": "2026-03-05",
                "signed_amount_cents": -1000,
                "transaction_type": "normal",
                "category": archived_category.id,
                "account": self.account.id,
                "transfer": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["category"][0],
            "Archived categories cannot be assigned to transactions.",
        )

    def test_update_transaction_rejects_different_archived_category(self):
        archived_category = Category.objects.create(
            name="Archived",
            is_archived=True,
        )
        transaction = Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-1000,
            transaction_type=Transaction.TransactionType.NORMAL,
            category=self.category,
            account=self.account,
        )

        response = self.client.patch(
            reverse("transaction-detail", args=[transaction.id]),
            {"category": archived_category.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["category"][0],
            "Archived categories cannot be assigned to transactions.",
        )

    def test_update_transaction_preserves_existing_archived_category(self):
        archived_category = Category.objects.create(
            name="Archived",
            is_archived=True,
        )
        transaction = Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-1000,
            transaction_type=Transaction.TransactionType.NORMAL,
            category=archived_category,
            account=self.account,
        )

        response = self.client.patch(
            reverse("transaction-detail", args=[transaction.id]),
            {"note": "Updated historical transaction"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transaction.refresh_from_db()
        self.assertEqual(transaction.category, archived_category)
        self.assertEqual(transaction.note, "Updated historical transaction")

    def test_transaction_amount_must_not_be_zero(self):
        payload = {
            "date": "2026-03-05",
            "signed_amount_cents": 0,
            "transaction_type": "normal",
            "category": self.category.id,
            "account": self.account.id,
            "transfer": None,
        }

        response = self.client.post(reverse("transaction-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["signed_amount_cents"][0],
            "signed_amount_cents must not be zero.",
        )

    def test_list_transactions(self):
        self.client.post(
            reverse("transaction-list"),
            {
                "date": "2026-03-05",
                "signed_amount_cents": -1000,
                "transaction_type": "normal",
                "category": self.category.id,
                "account": self.account.id,
                "transfer": None,
            },
            format="json",
        )

        response = self.client.get(reverse("transaction-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["signed_amount_cents"], -1000)
        self.assertEqual(response.data[0]["category_name"], self.category.name)
        self.assertEqual(response.data[0]["account_name"], self.account.name)

    def test_list_transactions_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("transaction-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_direct_transfer_transaction_creation_is_rejected(self):
        payload = {
            "date": "2026-03-05",
            "signed_amount_cents": -1000,
            "transaction_type": "transfer",
            "category": None,
            "account": self.account.id,
            "transfer": self.transfer.id,
        }

        response = self.client.post(reverse("transaction-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["transaction_type"][0],
            "Transfer postings are managed through the transfer endpoint.",
        )
        self.assertEqual(Transaction.objects.count(), 0)

    def test_create_normal_transaction_requires_category(self):
        payload = {
            "date": "2026-03-05",
            "signed_amount_cents": -1000,
            "transaction_type": "normal",
            "category": None,
            "account": self.account.id,
            "transfer": None,
        }

        response = self.client.post(
            reverse("transaction-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["category"][0],
            "category is required for non-transfer transactions.",
        )
        self.assertFalse(Transaction.objects.exists())

    def test_normal_transaction_cannot_be_converted_to_transfer_posting(self):
        transaction = Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-1000,
            transaction_type=Transaction.TransactionType.NORMAL,
            category=self.category,
            account=self.account,
        )

        response = self.client.patch(
            reverse("transaction-detail", args=[transaction.id]),
            {
                "transaction_type": Transaction.TransactionType.TRANSFER,
                "transfer": self.transfer.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        transaction.refresh_from_db()
        self.assertEqual(transaction.transaction_type, Transaction.TransactionType.NORMAL)
        self.assertIsNone(transaction.transfer)

    def test_direct_transfer_posting_update_is_rejected(self):
        transaction = self.create_transfer_posting()

        response = self.client.patch(
            reverse("transaction-detail", args=[transaction.id]),
            {"signed_amount_cents": -2000},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"][0],
            "Transfer postings are managed through the transfer endpoint.",
        )
        transaction.refresh_from_db()
        self.assertEqual(transaction.signed_amount_cents, -1000)

    def test_direct_transfer_posting_deletion_is_rejected(self):
        transaction = self.create_transfer_posting()

        response = self.client.delete(
            reverse("transaction-detail", args=[transaction.id])
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Transfer postings are managed through the transfer endpoint.",
        )
        self.assertTrue(Transaction.objects.filter(id=transaction.id).exists())

    def test_non_transfer_type_requires_null_transfer(self):
        payload = {
            "date": "2026-03-05",
            "signed_amount_cents": -1000,
            "transaction_type": "normal",
            "category": self.category.id,
            "account": self.account.id,
            "transfer": self.transfer.id,
        }

        response = self.client.post(reverse("transaction-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("transfer", response.data)
        self.assertEqual(
            response.data["transfer"][0],
            "transfer must be null unless transaction_type is 'transfer'.",
        )
