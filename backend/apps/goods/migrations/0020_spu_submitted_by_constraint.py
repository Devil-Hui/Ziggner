from django.contrib.auth import get_user_model
from django.db import migrations, models as dm


def backfill_submitted_by(apps, schema_editor):
    """D1：回填历史上绕过 submit_for_review 直写 SUBMITTED 导致 submitted_by 为空的 SPU。"""
    SPU = apps.get_model('goods', 'SPU')
    User = get_user_model()
    superuser = User.objects.filter(is_superuser=True).order_by('id').first()
    qs = SPU.objects.filter(status='submitted', submitted_by__isnull=True)
    for spu in qs:
        # 优先用审批人，否则兜底首个超管（历史测试数据无真实提交人记录）
        spu.submitted_by = spu.reviewed_by or superuser
        spu.save(update_fields=['submitted_by'])


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [('goods', '0019_create_default_pending_group')]

    operations = [
        migrations.RunPython(backfill_submitted_by, reverse_backfill),
        migrations.AddConstraint(
            model_name='spu',
            constraint=dm.CheckConstraint(
                condition=(
                    dm.Q(status='submitted', submitted_by__isnull=False)
                    | ~dm.Q(status='submitted')
                ),
                name='spu_submitted_by_required_when_submitted',
            ),
        ),
    ]
