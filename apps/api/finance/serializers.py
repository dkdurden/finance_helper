from django.contrib.auth import authenticate, get_user_model, password_validation
from django.db.models import Sum
from rest_framework import serializers

from .models import Account, Category, Product, Receipt, ReceiptItem, Transaction, Transfer
from .services import create_receipt, create_transfer, update_receipt, update_transfer

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


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"}, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]
        request = self.context.get("request")
        user = authenticate(request=request, username=email, password=password)

        if user is None:
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        attrs["user"] = user
        return attrs


class AccountSerializer(serializers.ModelSerializer):
    balance_cents = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "account_type",
            "is_liability",
            "opening_balance_cents",
            "balance_cents",
            "opening_balance_date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_balance_cents(self, obj):
        if hasattr(obj, "balance_cents"):
            return obj.balance_cents

        transaction_total = obj.transactions.aggregate(
            total=Sum("signed_amount_cents")
        )["total"]
        return obj.opening_balance_cents + (transaction_total or 0)

    def validate(self, attrs):
        if (
            self.instance is not None
            and "is_liability" in attrs
            and attrs["is_liability"] != self.instance.is_liability
            and (
                self.instance.transactions.exists()
                or self.instance.outgoing_transfers.exists()
                or self.instance.incoming_transfers.exists()
            )
        ):
            raise serializers.ValidationError(
                {
                    "is_liability": (
                        "is_liability cannot be changed after the account has "
                        "ledger activity."
                    )
                }
            )

        return attrs


class BalanceAdjustmentSerializer(serializers.Serializer):
    target_balance_cents = serializers.IntegerField()
    date = serializers.DateField()


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


class ReceiptCreateItemSerializer(serializers.Serializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_archived=False)
    )
    qty = serializers.DecimalField(
        max_digits=10,
        decimal_places=3,
        allow_null=True,
        required=False,
    )
    unit = serializers.CharField(
        max_length=50,
        allow_blank=True,
        allow_null=True,
        required=False,
    )
    unit_price_cents = serializers.IntegerField(
        allow_null=True,
        min_value=0,
        required=False,
    )
    line_total_cents = serializers.IntegerField(min_value=0)

    def validate_qty(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError(
                "qty must be greater than zero when provided."
            )

        return value


class ReceiptCreateSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        write_only=True,
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.filter(is_archived=False),
        write_only=True,
    )
    items = ReceiptCreateItemSerializer(many=True, allow_empty=False, write_only=True)
    note = serializers.CharField(
        allow_blank=True,
        allow_null=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Receipt
        fields = [
            "id",
            "account",
            "category",
            "date",
            "occurred_at",
            "store",
            "note",
            "tax_cents",
            "fees_cents",
            "items",
            "total_cents",
            "transaction",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_cents",
            "transaction",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "fees_cents": {"min_value": 0},
            "tax_cents": {"min_value": 0},
        }

    def validate(self, attrs):
        total_cents = (
            sum(item["line_total_cents"] for item in attrs["items"])
            + attrs.get("tax_cents", 0)
            + attrs.get("fees_cents", 0)
        )

        if total_cents <= 0:
            raise serializers.ValidationError(
                {"items": "Receipt total must be greater than zero."}
            )

        return attrs

    def create(self, validated_data):
        items = validated_data.pop("items")
        receipt_items = [
            {
                **item,
                "name_snapshot": item["product"].name,
            }
            for item in items
        ]
        return create_receipt(items=receipt_items, **validated_data)


class ReceiptUpdateItemSerializer(ReceiptCreateItemSerializer):
    id = serializers.IntegerField(min_value=1, required=False)
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all())


class ReceiptUpdateSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(
        queryset=Account.objects.all(),
        write_only=True,
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        write_only=True,
    )
    items = ReceiptUpdateItemSerializer(many=True, allow_empty=False, write_only=True)
    note = serializers.CharField(
        allow_blank=True,
        allow_null=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = Receipt
        fields = [
            "id",
            "account",
            "category",
            "date",
            "occurred_at",
            "store",
            "note",
            "tax_cents",
            "fees_cents",
            "items",
            "total_cents",
            "transaction",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "total_cents",
            "transaction",
            "created_at",
            "updated_at",
        ]
        extra_kwargs = {
            "fees_cents": {"min_value": 0},
            "tax_cents": {"min_value": 0},
        }

    def validate(self, attrs):
        required_fields = {"account", "category", "date", "items"}
        missing_fields = required_fields.difference(self.initial_data)
        if missing_fields:
            raise serializers.ValidationError(
                {
                    field: "This field is required."
                    for field in sorted(missing_fields)
                }
            )

        category = attrs["category"]
        if (
            category.is_archived
            and category.id != self.instance.transaction.category_id
        ):
            raise serializers.ValidationError(
                {"category": "Archived categories cannot be assigned."}
            )

        existing_products = {
            item.id: item.product_id for item in self.instance.items.all()
        }
        item_errors = []
        has_item_errors = False
        for item in attrs["items"]:
            product = item["product"]
            item_id = item.get("id")
            if product.is_archived and existing_products.get(item_id) != product.id:
                item_errors.append(
                    {"product": ["Archived products cannot be assigned."]}
                )
                has_item_errors = True
            else:
                item_errors.append({})

        if has_item_errors:
            raise serializers.ValidationError({"items": item_errors})

        total_cents = (
            sum(item["line_total_cents"] for item in attrs["items"])
            + attrs.get("tax_cents", 0)
            + attrs.get("fees_cents", 0)
        )
        if total_cents <= 0:
            raise serializers.ValidationError(
                {"items": "Receipt total must be greater than zero."}
            )

        return attrs

    def update(self, instance, validated_data):
        items = validated_data.pop("items")
        receipt_items = [
            {
                **item,
                "name_snapshot": item["product"].name,
            }
            for item in items
        ]
        return update_receipt(
            instance.id,
            items=receipt_items,
            **validated_data,
        )


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

    def create(self, validated_data):
        return create_transfer(**validated_data)

    def update(self, instance, validated_data):
        return update_transfer(instance.pk, **validated_data)


class LedgerEventSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(choices=["transaction", "transfer"])
    id = serializers.IntegerField(source="event_id")
    date = serializers.DateField(source="event_date")
    occurred_at = serializers.DateTimeField(
        source="event_occurred_at",
        allow_null=True,
    )
    amount_cents = serializers.IntegerField(source="event_amount_cents")
    transaction_type = serializers.ChoiceField(
        source="event_transaction_type",
        choices=Transaction.TransactionType.choices,
    )
    merchant = serializers.CharField(source="event_merchant", allow_null=True)
    note = serializers.CharField(source="event_note", allow_null=True)
    category_id = serializers.IntegerField(
        source="event_category_id",
        allow_null=True,
    )
    category_name = serializers.CharField(
        source="event_category_name",
        allow_null=True,
    )
    account_id = serializers.IntegerField(
        source="event_account_id",
        allow_null=True,
    )
    account_name = serializers.CharField(
        source="event_account_name",
        allow_null=True,
    )
    receipt_id = serializers.IntegerField(
        source="event_receipt_id",
        allow_null=True,
    )
    from_account_id = serializers.IntegerField(
        source="event_from_account_id",
        allow_null=True,
    )
    from_account_name = serializers.CharField(
        source="event_from_account_name",
        allow_null=True,
    )
    to_account_id = serializers.IntegerField(
        source="event_to_account_id",
        allow_null=True,
    )
    to_account_name = serializers.CharField(
        source="event_to_account_name",
        allow_null=True,
    )


TRANSFER_POSTING_MUTATION_ERROR = (
    "Transfer postings are managed through the transfer endpoint."
)


class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
        allow_null=True,
    )
    account_name = serializers.CharField(source="account.name", read_only=True)

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
            "category_name",
            "account",
            "account_name",
            "transfer",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_signed_amount_cents(self, value):
        if value == 0:
            raise serializers.ValidationError(
                "signed_amount_cents must not be zero."
            )
        return value

    def validate(self, attrs):
        if (
            self.instance is not None
            and self.instance.transaction_type == Transaction.TransactionType.TRANSFER
        ):
            raise serializers.ValidationError(
                {"detail": TRANSFER_POSTING_MUTATION_ERROR}
            )

        transaction_type = attrs.get("transaction_type", getattr(self.instance, "transaction_type", None))
        transfer = attrs.get("transfer", getattr(self.instance, "transfer", None))
        category = attrs.get("category", getattr(self.instance, "category", None))

        if transaction_type == Transaction.TransactionType.TRANSFER:
            raise serializers.ValidationError(
                {"transaction_type": TRANSFER_POSTING_MUTATION_ERROR}
            )

        if transaction_type != Transaction.TransactionType.TRANSFER and transfer is not None:
            raise serializers.ValidationError(
                {"transfer": "transfer must be null unless transaction_type is 'transfer'."}
            )

        if transaction_type != Transaction.TransactionType.TRANSFER and category is None:
            raise serializers.ValidationError(
                {"category": "category is required for non-transfer transactions."}
            )

        if (
            category is not None
            and category.is_archived
            and (
                self.instance is None
                or self.instance.category_id != category.id
            )
        ):
            raise serializers.ValidationError(
                {"category": "Archived categories cannot be assigned to transactions."}
            )

        return attrs
