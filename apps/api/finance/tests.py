from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Account, Category, Product, Receipt, ReceiptItem, Transaction, Transfer
from .serializers import TransferSerializer

User = get_user_model()


class HealthEndpointTests(APITestCase):
    def test_health_returns_ok(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"status": "ok"})


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


class ReceiptApiTests(APITestCase):
    def setUp(self):
        self.account = Account.objects.create(
            name="Receipt Checking",
            account_type=Account.AccountType.CHECKING,
            is_liability=False,
            opening_balance_cents=0,
            opening_balance_date="2026-01-01T00:00:00Z",
        )
        self.category = Category.objects.create(name="Receipt Category")
        self.transaction = Transaction.objects.create(
            date="2026-03-05",
            signed_amount_cents=-2500,
            transaction_type=Transaction.TransactionType.NORMAL,
            merchant="Target",
            category=self.category,
            account=self.account,
            transfer=None,
        )

    def test_create_receipt(self):
        payload = {
            "date": "2026-03-05",
            "store": "Target",
            "tax_cents": 200,
            "fees_cents": 0,
            "total_cents": 2500,
            "transaction": self.transaction.id,
        }

        response = self.client.post(reverse("receipt-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["store"], payload["store"])
        self.assertEqual(response.data["total_cents"], payload["total_cents"])

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


class ReceiptItemApiTests(APITestCase):
    def setUp(self):
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

    def test_create_receipt_item(self):
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

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name_snapshot"], payload["name_snapshot"])
        self.assertEqual(response.data["line_total_cents"], payload["line_total_cents"])

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

    def test_receipt_item_rejects_negative_line_total(self):
        payload = {
            "receipt": self.receipt.id,
            "product": self.product.id,
            "name_snapshot": "Bad Line",
            "line_total_cents": -1,
        }

        response = self.client.post(reverse("receipt-item-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_receipt_item_rejects_non_positive_qty(self):
        payload = {
            "receipt": self.receipt.id,
            "product": self.product.id,
            "name_snapshot": "Bad Qty",
            "qty": "0.000",
            "line_total_cents": 100,
        }

        response = self.client.post(reverse("receipt-item-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


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

    def test_create_transfer_is_not_available(self):
        payload = {
            "date": "2026-03-05",
            "amount_cents": 10000,
            "from_account": self.from_account.id,
            "to_account": self.to_account.id,
            "note": "Move cash",
        }

        response = self.client.post(reverse("transfer-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertFalse(Transfer.objects.exists())

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

    def test_update_transfer_is_not_available(self):
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

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        transfer.refresh_from_db()
        self.assertEqual(transfer.amount_cents, 5000)

    def test_delete_transfer_is_not_available(self):
        transfer = Transfer.objects.create(
            date="2026-03-05",
            amount_cents=5000,
            from_account=self.from_account,
            to_account=self.to_account,
        )

        response = self.client.delete(
            reverse("transfer-detail", args=[transfer.id])
        )

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertTrue(Transfer.objects.filter(id=transfer.id).exists())

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
            category=self.category,
            account=self.account,
            transfer=self.transfer,
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
            "category": self.category.id,
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
