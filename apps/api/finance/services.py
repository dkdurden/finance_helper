from django.db import transaction as db_transaction
from django.utils import timezone

from .models import Receipt, ReceiptItem, Transaction, Transfer


class TransferIntegrityError(Exception):
    pass


class ReceiptIntegrityError(Exception):
    pass


@db_transaction.atomic
def create_receipt(
    *,
    account,
    category,
    date,
    items,
    fees_cents=0,
    note=None,
    occurred_at=None,
    store=None,
    tax_cents=0,
):
    total_cents = (
        sum(item["line_total_cents"] for item in items)
        + tax_cents
        + fees_cents
    )
    transaction = Transaction.objects.create(
        account=account,
        category=category,
        date=date,
        merchant=store,
        note=note,
        occurred_at=occurred_at,
        signed_amount_cents=(
            total_cents if account.is_liability else -total_cents
        ),
        transaction_type=Transaction.TransactionType.NORMAL,
    )
    receipt = Receipt.objects.create(
        date=date,
        fees_cents=fees_cents,
        occurred_at=occurred_at,
        store=store,
        tax_cents=tax_cents,
        total_cents=total_cents,
        transaction=transaction,
    )
    ReceiptItem.objects.bulk_create(
        [ReceiptItem(receipt=receipt, **item) for item in items]
    )

    return receipt


@db_transaction.atomic
def update_receipt(
    receipt_id,
    *,
    account,
    category,
    date,
    items,
    fees_cents=0,
    note=None,
    occurred_at=None,
    store=None,
    tax_cents=0,
):
    receipt = (
        Receipt.objects.select_for_update()
        .select_related("transaction")
        .get(pk=receipt_id)
    )
    transaction = Transaction.objects.select_for_update().get(
        pk=receipt.transaction_id
    )
    existing_items = {
        item.id: item
        for item in ReceiptItem.objects.select_for_update().filter(receipt=receipt)
    }

    if (
        transaction.transaction_type != Transaction.TransactionType.NORMAL
        or transaction.transfer_id is not None
    ):
        raise ReceiptIntegrityError(
            "Receipt transaction is malformed and cannot be modified."
        )

    submitted_item_ids = [
        item["id"] for item in items if item.get("id") is not None
    ]
    if (
        len(submitted_item_ids) != len(set(submitted_item_ids))
        or any(item_id not in existing_items for item_id in submitted_item_ids)
    ):
        raise ReceiptIntegrityError(
            "Receipt items are malformed and cannot be modified."
        )

    total_cents = (
        sum(item["line_total_cents"] for item in items)
        + tax_cents
        + fees_cents
    )
    transaction.account = account
    transaction.category = category
    transaction.date = date
    transaction.merchant = store
    transaction.note = note
    transaction.occurred_at = occurred_at
    transaction.signed_amount_cents = (
        total_cents if account.is_liability else -total_cents
    )
    transaction.save()

    receipt.date = date
    receipt.fees_cents = fees_cents
    receipt.occurred_at = occurred_at
    receipt.store = store
    receipt.tax_cents = tax_cents
    receipt.total_cents = total_cents
    receipt.save()

    updated_at = timezone.now()
    items_to_update = []
    items_to_create = []
    for item_data in items:
        item_values = {
            key: value for key, value in item_data.items() if key != "id"
        }
        item_id = item_data.get("id")

        if item_id is None:
            items_to_create.append(ReceiptItem(receipt=receipt, **item_values))
            continue

        receipt_item = existing_items[item_id]
        for field, value in item_values.items():
            setattr(receipt_item, field, value)
        receipt_item.updated_at = updated_at
        items_to_update.append(receipt_item)

    retained_item_ids = set(submitted_item_ids)
    ReceiptItem.objects.filter(receipt=receipt).exclude(
        id__in=retained_item_ids
    ).delete()
    if items_to_update:
        ReceiptItem.objects.bulk_update(
            items_to_update,
            [
                "product",
                "name_snapshot",
                "qty",
                "unit",
                "unit_price_cents",
                "line_total_cents",
                "updated_at",
            ],
        )
    if items_to_create:
        ReceiptItem.objects.bulk_create(items_to_create)

    return receipt


@db_transaction.atomic
def delete_receipt(receipt_id):
    receipt = (
        Receipt.objects.select_for_update()
        .select_related("transaction")
        .get(pk=receipt_id)
    )
    transaction = Transaction.objects.select_for_update().get(
        pk=receipt.transaction_id
    )

    if (
        transaction.transaction_type != Transaction.TransactionType.NORMAL
        or transaction.transfer_id is not None
    ):
        raise ReceiptIntegrityError(
            "Receipt transaction is malformed and cannot be deleted."
        )

    receipt.delete()
    transaction.delete()


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
