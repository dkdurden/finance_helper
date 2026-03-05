from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Account, Category, Transfer


class HealthEndpointTests(APITestCase):
    def test_health_returns_ok(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"status": "ok"})


class AccountApiTests(APITestCase):
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

    def test_list_accounts(self):
        self.client.post(
            reverse("account-list"),
            {
                "name": "Savings",
                "account_type": "savings",
                "is_liability": False,
                "opening_balance_cents": 0,
                "opening_balance_date": "2026-01-01T00:00:00Z",
            },
            format="json",
        )

        response = self.client.get(reverse("account-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Savings")


class CategoryApiTests(APITestCase):
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


class TransferApiTests(APITestCase):
    def setUp(self):
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

    def test_create_transfer(self):
        payload = {
            "date": "2026-03-05",
            "amount_cents": 10000,
            "from_account": self.from_account.id,
            "to_account": self.to_account.id,
            "note": "Move cash",
        }

        response = self.client.post(reverse("transfer-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["amount_cents"], payload["amount_cents"])

    def test_list_transfers(self):
        self.client.post(
            reverse("transfer-list"),
            {
                "date": "2026-03-05",
                "amount_cents": 5000,
                "from_account": self.from_account.id,
                "to_account": self.to_account.id,
            },
            format="json",
        )

        response = self.client.get(reverse("transfer-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["amount_cents"], 5000)

    def test_transfer_amount_must_be_positive(self):
        payload = {
            "date": "2026-03-05",
            "amount_cents": 0,
            "from_account": self.from_account.id,
            "to_account": self.to_account.id,
        }

        response = self.client.post(reverse("transfer-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["amount_cents"][0],
            "amount_cents must be greater than zero.",
        )

    def test_transfer_accounts_must_differ(self):
        payload = {
            "date": "2026-03-05",
            "amount_cents": 1000,
            "from_account": self.from_account.id,
            "to_account": self.from_account.id,
        }

        response = self.client.post(reverse("transfer-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["to_account"][0],
            "to_account must be different from from_account.",
        )


class TransactionApiTests(APITestCase):
    def setUp(self):
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

    def test_transfer_type_requires_transfer_id(self):
        payload = {
            "date": "2026-03-05",
            "signed_amount_cents": -1000,
            "transaction_type": "transfer",
            "category": self.category.id,
            "account": self.account.id,
            "transfer": None,
        }

        response = self.client.post(reverse("transaction-list"), payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("transfer", response.data)

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
