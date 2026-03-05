from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


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
