from django.db import transaction as db_transaction
from django.utils import timezone

from .models import Transaction, Transfer


class TransferIntegrityError(Exception):
    pass


def _source_signed_amount(amount_cents, account):
    return amount_cents if account.is_liability else -amount_cents


def _destination_signed_amount(amount_cents, account):
    return -amount_cents if account.is_liability else amount_cents


def _validate_transfer_postings(transfer, postings):
    expected_amounts = {
        transfer.from_account_id: _source_signed_amount(
            transfer.amount_cents,
            transfer.from_account,
        ),
        transfer.to_account_id: _destination_signed_amount(
            transfer.amount_cents,
            transfer.to_account,
        ),
    }

    if len(postings) != 2 or {posting.account_id for posting in postings} != set(
        expected_amounts
    ):
        raise TransferIntegrityError(
            "Transfer postings are malformed and cannot be modified."
        )

    for posting in postings:
        if (
            posting.signed_amount_cents != expected_amounts[posting.account_id]
            or posting.date != transfer.date
            or posting.occurred_at != transfer.occurred_at
            or posting.transaction_type != Transaction.TransactionType.TRANSFER
            or posting.category_id is not None
            or posting.merchant is not None
            or posting.note is not None
        ):
            raise TransferIntegrityError(
                "Transfer postings are malformed and cannot be modified."
            )


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


@db_transaction.atomic
def update_transfer(transfer_id, **validated_data):
    transfer = (
        Transfer.objects.select_for_update()
        .select_related("from_account", "to_account")
        .get(pk=transfer_id)
    )
    postings = list(
        Transaction.objects.select_for_update()
        .filter(transfer=transfer)
        .order_by("id")
    )
    _validate_transfer_postings(transfer, postings)

    postings_by_account = {posting.account_id: posting for posting in postings}
    previous_source_posting = postings_by_account[transfer.from_account_id]
    previous_destination_posting = postings_by_account[transfer.to_account_id]

    for field, value in validated_data.items():
        setattr(transfer, field, value)
    transfer.save()

    source_posting = postings_by_account.get(transfer.from_account_id)
    destination_posting = postings_by_account.get(transfer.to_account_id)
    if source_posting is None and destination_posting is None:
        source_posting = previous_source_posting
        destination_posting = previous_destination_posting
    elif source_posting is None:
        source_posting = next(
            posting for posting in postings if posting.pk != destination_posting.pk
        )
    elif destination_posting is None:
        destination_posting = next(
            posting for posting in postings if posting.pk != source_posting.pk
        )

    updated_at = timezone.now()
    source_posting.account = transfer.from_account
    source_posting.date = transfer.date
    source_posting.occurred_at = transfer.occurred_at
    source_posting.signed_amount_cents = _source_signed_amount(
        transfer.amount_cents,
        transfer.from_account,
    )
    source_posting.updated_at = updated_at

    destination_posting.account = transfer.to_account
    destination_posting.date = transfer.date
    destination_posting.occurred_at = transfer.occurred_at
    destination_posting.signed_amount_cents = _destination_signed_amount(
        transfer.amount_cents,
        transfer.to_account,
    )
    destination_posting.updated_at = updated_at

    Transaction.objects.bulk_update(
        [source_posting, destination_posting],
        ["account", "date", "occurred_at", "signed_amount_cents", "updated_at"],
    )

    return transfer


@db_transaction.atomic
def delete_transfer(transfer_id):
    transfer = (
        Transfer.objects.select_for_update()
        .select_related("from_account", "to_account")
        .get(pk=transfer_id)
    )
    postings = list(
        Transaction.objects.select_for_update()
        .filter(transfer=transfer)
        .order_by("id")
    )
    _validate_transfer_postings(transfer, postings)

    Transaction.objects.filter(pk__in=[posting.pk for posting in postings]).delete()
    transfer.delete()
