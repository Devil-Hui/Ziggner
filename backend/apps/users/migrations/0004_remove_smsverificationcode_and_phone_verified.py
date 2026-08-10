from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_emailtemplate'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userprofile',
            name='phone_verified',
        ),
        migrations.DeleteModel(
            name='SMSVerificationCode',
        ),
    ]
