# Generated manually — add product (SPU) link to customer service conversation
# so users can raise inquiries about a specific product and merchants can
# filter conversations by product (JD/PDD-style merchant CS).

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("customer_service", "0005_rename_cs_conv_user_status_idx_customer_se_user_id_e30ad1_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="spu",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="cs_conversations",
                to="goods.spu",
                verbose_name="关联商品",
            ),
        ),
        migrations.AddIndex(
            model_name="conversation",
            index=models.Index(fields=["spu", "status"], name="customer_se_spu_st_8e2c1a_idx"),
        ),
    ]
