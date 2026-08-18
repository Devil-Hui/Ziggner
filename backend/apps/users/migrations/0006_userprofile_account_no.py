from django.db import migrations, models
from django.contrib.auth import get_user_model

import apps.users.models as user_models


def _generate_unique_account_no():
    """生成且与已有值去重的账户号。"""
    val = user_models.generate_account_no()
    while (
        user_models.UserProfile.objects.filter(account_no=val).exists()
        or val == ''
    ):
        val = user_models.generate_account_no()
    return val


def backfill_account_no(apps, schema_editor):
    """为存量用户补建 profile（若缺失）并分配 account_no。

    注意：本步骤在「唯一约束生效前」执行，避免存量多行 account_no 为空字符串
    触发 UNIQUE 索引创建失败。
    """
    User = get_user_model()
    UserProfile = apps.get_model('users', 'UserProfile')

    # 1) 为尚未拥有 profile 的用户补建（避免 OneToOne 缺失导致解析失败）
    existing_user_ids = list(UserProfile.objects.values_list('user_id', flat=True))
    missing = User.objects.exclude(id__in=existing_user_ids)
    for user in missing.iterator():
        UserProfile.objects.create(user=user, account_no=_generate_unique_account_no())

    # 2) 为所有 account_no 为空的 profile 补填
    empty = UserProfile.objects.filter(account_no='')
    for profile in empty.iterator():
        profile.account_no = _generate_unique_account_no()
        profile.save(update_fields=['account_no'])


def reverse_backfill(apps, schema_editor):
    # 回滚：仅撤销唯一约束与列（数据无需恢复）
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_userprofile_security_stamp'),
    ]

    operations = [
        # 先以非唯一方式加列，规避存量空值导致的唯一索引冲突
        migrations.AddField(
            model_name='userprofile',
            name='account_no',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                editable=False,
                max_length=24,
                help_text='对外账户号（ZG- + Base32），替代暴露内部自增 id',
            ),
        ),
        # 存量数据补填（此时尚无唯一约束）
        migrations.RunPython(backfill_account_no, reverse_backfill),
        # 数据已唯一且非空后，再追加唯一约束
        migrations.AlterField(
            model_name='userprofile',
            name='account_no',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                editable=False,
                max_length=24,
                unique=True,
                help_text='对外账户号（ZG- + Base32），替代暴露内部自增 id',
            ),
        ),
    ]
