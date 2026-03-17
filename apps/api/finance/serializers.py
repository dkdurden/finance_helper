from django.contrib.auth import get_user_model, password_validation
from rest_framework import serializers

from .models import Account, Category, Product, Receipt, ReceiptItem, Transaction, Transfer

User = get_user_model()


class SignUpSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, trim_whitespace=True)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"}, trim_whitespace=False)

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("name is required.")
        return name

    def validate_email(self, value):
        email = value.strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return email

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data["email"],
            first_name=validated_data["name"],
            password=validated_data["password"],
        )


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


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "default_unit",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = [
            "id",
            "date",
            "occurred_at",
            "store",
            "tax_cents",
            "fees_cents",
            "total_cents",
            "transaction",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ReceiptItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReceiptItem
        fields = [
            "id",
            "receipt",
            "product",
            "name_snapshot",
            "qty",
            "unit",
            "unit_price_cents",
            "line_total_cents",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        line_total_cents = attrs.get("line_total_cents", getattr(self.instance, "line_total_cents", None))
        qty = attrs.get("qty", getattr(self.instance, "qty", None))
        unit_price_cents = attrs.get("unit_price_cents", getattr(self.instance, "unit_price_cents", None))

        if line_total_cents is not None and line_total_cents < 0:
            raise serializers.ValidationError(
                {"line_total_cents": "line_total_cents must be greater than or equal to zero."}
            )

        if qty is not None and qty <= 0:
            raise serializers.ValidationError(
                {"qty": "qty must be greater than zero when provided."}
            )

        if unit_price_cents is not None and unit_price_cents < 0:
            raise serializers.ValidationError(
                {"unit_price_cents": "unit_price_cents must be greater than or equal to zero when provided."}
            )

        return attrs


class TransferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transfer
        fields = [
            "id",
            "date",
            "occurred_at",
            "amount_cents",
            "from_account",
            "to_account",
            "note",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        from_account = attrs.get("from_account", getattr(self.instance, "from_account", None))
        to_account = attrs.get("to_account", getattr(self.instance, "to_account", None))
        amount_cents = attrs.get("amount_cents", getattr(self.instance, "amount_cents", None))

        if (
            from_account is not None
            and to_account is not None
            and from_account.id == to_account.id
        ):
            raise serializers.ValidationError(
                {"to_account": "to_account must be different from from_account."}
            )

        if amount_cents is not None and amount_cents <= 0:
            raise serializers.ValidationError(
                {"amount_cents": "amount_cents must be greater than zero."}
            )

        return attrs


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