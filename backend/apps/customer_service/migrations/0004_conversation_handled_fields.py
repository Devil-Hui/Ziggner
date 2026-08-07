from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('customer_service', '0003_add_group_fk_to_conversation'),
    ]

    operations = [
        migrations.AddField(
            model_name='conversation',
            name='handled_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='handled_conversations',
                to=settings.AUTH_USER_MODEL,
                verbose_name='处理人',
            ),
        ),
        migrations.AddField(
            model_name='conversation',
            name='handled_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='接听时间'),
        ),
    ]
