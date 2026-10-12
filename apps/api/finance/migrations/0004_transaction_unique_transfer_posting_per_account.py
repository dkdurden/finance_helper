from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0003_alter_transaction_category_and_more"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="transaction",
            constraint=models.UniqueConstraint(
                condition=models.Q(transfer__isnull=False),
                fields=("transfer", "account"),
                name="unique_transfer_posting_per_account",
            ),
        ),
    ]
