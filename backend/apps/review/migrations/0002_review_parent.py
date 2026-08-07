from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('review', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.CASCADE, related_name='replies', to='review.review', verbose_name='父评价（回复）'),
        ),
    ]
