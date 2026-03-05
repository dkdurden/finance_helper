from rest_framework import serializers

from .models import Account, Category, Transaction


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "account_type",
            "is_liability",
            "opening_balance_cents",
            "opening_balance_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            "id",
            "date",
            "occurred_at",
            "signed_amount_cents",
            "transaction_type",
            "merchant",
            "note",
            "category",
            "account",
            "transfer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        transaction_type = attrs.get("transaction_type", getattr(self.instance, "transaction_type", None))
        transfer = attrs.get("transfer", getattr(self.instance, "transfer", None))

        if transaction_type == Transaction.TransactionType.TRANSFER and transfer is None:
            raise serializers.ValidationError(
                {"transfer": "transfer is required when transaction_type is 'transfer'."}
            )

        if transaction_type != Transaction.TransactionType.TRANSFER and transfer is not None:
            raise serializers.ValidationError(
                {"transfer": "transfer must be null unless transaction_type is 'transfer'."}
            )

        return attrs
