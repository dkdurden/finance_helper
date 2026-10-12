from django.db import transaction as db_transaction

from .models import Transaction, Transfer


def _source_signed_amount(amount_cents, account):
    return amount_cents if account.is_liability else -amount_cents


def _destination_signed_amount(amount_cents, account):
    return -amount_cents if account.is_liability else amount_cents


@db_transaction.atomic
def create_transfer(**validated_data):
    transfer = Transfer.objects.create(**validated_data)

    posting_fields = {
        "date": transfer.date,
        "occurred_at": transfer.occurred_at,
        "transaction_type": Transaction.TransactionType.TRANSFER,
        "category": None,
        "transfer": transfer,
    }
    Transaction.objects.create(
        **posting_fields,
        account=transfer.from_account,
        signed_amount_cents=_source_signed_amount(
            transfer.amount_cents,
            transfer.from_account,
        ),
    )
    Transaction.objects.create(
        **posting_fields,
        account=transfer.to_account,
        signed_amount_cents=_destination_signed_amount(
            transfer.amount_cents,
            transfer.to_account,
        ),
    )

    return transfer
