from django.db import migrations, models


def normalize_statuses(apps, schema_editor):
    UserCoupon = apps.get_model("promotion", "UserCoupon")
    UserCoupon.objects.filter(status="unused").update(status="available")


class Migration(migrations.Migration):
    dependencies = [("promotion", "0005_coupon_name_coupon_per_user_limit")]
    operations = [
        migrations.AlterUniqueTogether(name="usercoupon", unique_together=set()),
        migrations.AddField(
            model_name="usercoupon",
            name="locked_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="锁定时间"),
        ),
        migrations.AddField(
            model_name="usercoupon",
            name="lock_expires_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="锁定过期时间"),
        ),
        migrations.AlterField(
            model_name="usercoupon",
            name="status",
            field=models.CharField(
                choices=[("available", "Available"), ("locked", "Locked"), ("used", "Used"), ("expired", "Expired"), ("returned", "Returned")],
                default="available",
                max_length=20,
                verbose_name="状态",
            ),
        ),
        migrations.RunPython(normalize_statuses, migrations.RunPython.noop),
    ]
